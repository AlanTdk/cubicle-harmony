import { useState } from 'react';
import { motion } from 'framer-motion';
import { CubicleCard } from '@/components/CubicleCard';
import { BookingModal } from '@/components/BookingModal';
import { ImportStudents } from '@/components/ImportStudents';
import { Reports } from '@/components/Reports';
import { useCubicles } from '@/context/CubiclesContext';
import { Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { cubicles, loading } = useCubicles();
  const [selectedCubicle, setSelectedCubicle] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                  Gestión de Cubículos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Sistema de reservas de espacios de estudio
                </p>
              </div>
            </div>
            <ImportStudents />
          </div>
        </motion.div>

        <Tabs defaultValue="cubicles" className="w-full">
          <TabsList className="grid w-full sm:w-auto sm:inline-flex mb-6">
            <TabsTrigger value="cubicles" className="gap-2">
              <Building2 className="w-4 h-4" />
              Cubículos
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cubicles" className="mt-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              {cubicles.map((cubicle, index) => (
                <motion.div
                  key={cubicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <CubicleCard
                    cubicle={cubicle}
                    onClick={() => setSelectedCubicle(cubicle.id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-6 bg-card rounded-xl border border-border"
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Información
              </h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Duración máxima: 6 horas por reserva</li>
                <li>• Los cubículos disponibles se pueden rentar inmediatamente</li>
                <li>• Importa tu base de datos de estudiantes en formato CSV o JSON</li>
              </ul>
            </motion.div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <Reports />
          </TabsContent>
        </Tabs>
      </div>

      <BookingModal
        isOpen={selectedCubicle !== null}
        onClose={() => setSelectedCubicle(null)}
        cubicleId={selectedCubicle || 0}
      />
    </div>
  );
};

export default Index;
