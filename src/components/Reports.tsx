import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Calendar, Download, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type TimeRange = 'day' | 'week' | 'month';

interface ReportData {
  totalRentals: number;
  totalHours: number;
  cubicleUsage: { [key: number]: number };
  topStudents: { name: string; rentals: number }[];
}

export const Reports = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('day');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    totalRentals: 0,
    totalHours: 0,
    cubicleUsage: {},
    topStudents: []
  });
  const { toast } = useToast();

  const getRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'day': return 'Hoy';
      case 'week': return 'Última Semana';
      case 'month': return 'Último Mes';
    }
  };

  const getRangeIcon = (range: TimeRange) => {
    switch (range) {
      case 'day': return <Clock className="w-5 h-5" />;
      case 'week': return <Calendar className="w-5 h-5" />;
      case 'month': return <FileText className="w-5 h-5" />;
    }
  };

  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = subWeeks(startOfDay(now), 1);
        break;
      case 'month':
        startDate = subMonths(startOfDay(now), 1);
        break;
    }
    
    return { startDate, endDate: endOfDay(now) };
  };

  const fetchReportData = async (range: TimeRange) => {
    const { startDate, endDate } = getDateRange(range);
    
    try {
      const { data: rentalsData, error } = await supabase
        .from('rentals')
        .select('cubicle_id, hours, students!inner(name)')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;

      if (!rentalsData || rentalsData.length === 0) {
        setReportData({
          totalRentals: 0,
          totalHours: 0,
          cubicleUsage: {},
          topStudents: []
        });
        return;
      }

      const cubicleUsage: { [key: number]: number } = {};
      const studentRentals: { [key: string]: number } = {};
      let totalHours = 0;

      rentalsData.forEach(rental => {
        totalHours += rental.hours;
        cubicleUsage[rental.cubicle_id] = (cubicleUsage[rental.cubicle_id] || 0) + 1;
        
        const studentName = rental.students?.name || 'Desconocido';
        studentRentals[studentName] = (studentRentals[studentName] || 0) + 1;
      });

      const topStudents = Object.entries(studentRentals)
        .map(([name, rentals]) => ({ name, rentals }))
        .sort((a, b) => b.rentals - a.rentals)
        .slice(0, 5);

      setReportData({
        totalRentals: rentalsData.length,
        totalHours,
        cubicleUsage,
        topStudents
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del reporte",
        variant: "destructive"
      });
      setReportData({
        totalRentals: 0,
        totalHours: 0,
        cubicleUsage: {},
        topStudents: []
      });
    }
  };

  useEffect(() => {
    fetchReportData(selectedRange);
  }, [selectedRange]);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const { startDate, endDate } = getDateRange(selectedRange);
      
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // blue-600
      doc.text('Reporte de Gestión de Cubículos', 14, 22);
      
      // Período
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Período: ${format(startDate, 'dd/MM/yyyy', { locale: es })} - ${format(endDate, 'dd/MM/yyyy', { locale: es })}`, 14, 30);
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, 14, 36);
      
      // Línea divisoria
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, 40, 196, 40);
      
      // Resumen General
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('Resumen General', 14, 50);
      
      const summaryData = [
        ['Total de Rentas', reportData.totalRentals.toString()],
        ['Total de Horas', reportData.totalHours.toString()],
        ['Promedio Horas/Renta', reportData.totalRentals > 0 ? (reportData.totalHours / reportData.totalRentals).toFixed(1) : '0'],
      ];
      
      autoTable(doc, {
        startY: 55,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });
      
      // Uso por Cubículo
      const lastY = (doc as any).lastAutoTable.finalY || 55;
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Uso por Cubículo', 14, lastY + 15);
      
      const cubicleData = Object.entries(reportData.cubicleUsage).map(([id, count]) => [
        `Cubículo ${id}`,
        count.toString(),
        `${((count / reportData.totalRentals) * 100).toFixed(1)}%`
      ]);
      
      if (cubicleData.length === 0) {
        cubicleData.push(['Sin datos', '0', '0%']);
      }
      
      autoTable(doc, {
        startY: lastY + 20,
        head: [['Cubículo', 'Rentas', 'Porcentaje']],
        body: cubicleData,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Guardar PDF
      const fileName = `reporte_cubiculos_${selectedRange}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(fileName);
      
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Reportes
            </h2>
            <p className="text-muted-foreground mt-1">
              Genera reportes detallados del uso de cubículos
            </p>
          </div>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Selecciona el Período
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
              <motion.button
                key={range}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRange(range)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedRange === range
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    selectedRange === range ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {getRangeIcon(range)}
                  </div>
                  <span className="font-semibold text-foreground">
                    {getRangeLabel(range)}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Vista Previa del Reporte
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total de Rentas</p>
              <p className="text-3xl font-bold text-primary">{reportData.totalRentals}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total de Horas</p>
              <p className="text-3xl font-bold text-primary">{reportData.totalHours}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Promedio Horas/Renta</p>
              <p className="text-3xl font-bold text-primary">
                {reportData.totalRentals > 0 ? (reportData.totalHours / reportData.totalRentals).toFixed(1) : '0'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-md font-semibold text-foreground mb-3">Uso por Cubículo</h4>
            <div className="space-y-2">
              {Object.entries(reportData.cubicleUsage).length > 0 ? (
                Object.entries(reportData.cubicleUsage).map(([id, count]) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-24">Cubículo {id}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / reportData.totalRentals) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {count} ({((count / reportData.totalRentals) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay datos para el período seleccionado</p>
              )}
            </div>
          </div>

          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Download className="w-5 h-5 mr-2" />
            {isGenerating ? 'Generando PDF...' : 'Descargar Reporte PDF'}
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
