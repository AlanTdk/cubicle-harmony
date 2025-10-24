import { useRef } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCubicles } from '@/context/CubiclesContext';
import { Student } from '@/types/student';
import { toast } from 'sonner';

export const ImportStudents = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importStudents } = useCubicles();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            const students: Student[] = results.data
              .filter((row: any) => row.name && row.controlNumber && row.career)
              .map((row: any, index: number) => ({
                id: `imported-${Date.now()}-${index}`,
                name: row.name,
                controlNumber: row.controlNumber,
                career: row.career,
              }));

            if (students.length > 0) {
              importStudents(students);
              toast.success(`${students.length} estudiantes importados exitosamente`);
            } else {
              toast.error('No se encontraron datos válidos en el archivo');
            }
          } catch (error) {
            toast.error('Error al procesar el archivo');
          }
        },
        error: () => {
          toast.error('Error al leer el archivo CSV');
        },
      });
    } else if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const students: Student[] = Array.isArray(data) ? data : [];
          
          if (students.length > 0) {
            importStudents(students);
            toast.success(`${students.length} estudiantes importados exitosamente`);
          } else {
            toast.error('No se encontraron datos válidos en el archivo');
          }
        } catch (error) {
          toast.error('Error al procesar el archivo JSON');
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Formato no soportado. Usa CSV o JSON');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Importar Base de Datos
      </Button>
    </>
  );
};
