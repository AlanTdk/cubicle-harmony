import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cubicle, Student } from '@/types/student';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CubiclesContextType {
  cubicles: Cubicle[];
  students: Student[];
  rentCubicle: (cubicleId: number, student: Student, hours: number) => Promise<void>;
  releaseCubicle: (cubicleId: number) => Promise<void>;
  addStudent: (student: Student) => Promise<Student | null>;
  importStudents: (newStudents: Student[]) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const CubiclesContext = createContext<CubiclesContextType | undefined>(undefined);

export const CubiclesProvider = ({ children }: { children: ReactNode }) => {
  const [cubicles, setCubicles] = useState<Cubicle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCubicles = async () => {
    try {
      const { data: cubiclesData, error: cubiclesError } = await supabase
        .from('cubicles')
        .select('id, is_occupied')
        .order('id');

      if (cubiclesError) throw cubiclesError;

      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('cubicle_id, hours, start_time, students!inner(id, control_number, name, career)')
        .eq('is_active', true);

      if (rentalsError) throw rentalsError;

      const rentalMap = new Map(
        rentalsData?.map(r => [r.cubicle_id, r]) || []
      );

      const cubiclesWithRentals: Cubicle[] = cubiclesData.map(cubicle => {
        const rental = rentalMap.get(cubicle.id);
        return {
          id: cubicle.id,
          isOccupied: cubicle.is_occupied,
          student: rental?.students ? {
            id: rental.students.id,
            controlNumber: rental.students.control_number,
            name: rental.students.name,
            career: rental.students.career
          } : undefined,
          hours: rental?.hours,
          startTime: rental?.start_time ? new Date(rental.start_time) : undefined
        };
      });

      setCubicles(cubiclesWithRentals);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los cubículos",
        variant: "destructive"
      });
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, control_number, name, career')
        .order('name');

      if (error) throw error;

      const formattedStudents: Student[] = data.map(s => ({
        id: s.id,
        controlNumber: s.control_number,
        name: s.name,
        career: s.career
      }));

      setStudents(formattedStudents);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los estudiantes",
        variant: "destructive"
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchCubicles(), fetchStudents()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();

    // Subscribe to real-time changes
    const cubiclesChannel = supabase
      .channel('cubicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cubicles' }, () => {
        fetchCubicles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, () => {
        fetchCubicles();
      })
      .subscribe();

    const studentsChannel = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(cubiclesChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const rentCubicle = async (cubicleId: number, student: Student, hours: number) => {
    try {
      const startTime = new Date();
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + hours);

      const { error } = await supabase
        .from('rentals')
        .insert({
          cubicle_id: cubicleId,
          student_id: student.id!,
          hours,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: `Cubículo ${cubicleId} rentado por ${hours} ${hours === 1 ? 'hora' : 'horas'}`
      });

      await fetchCubicles();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo rentar el cubículo",
        variant: "destructive"
      });
      throw error;
    }
  };

  const releaseCubicle = async (cubicleId: number) => {
    try {
      const { data: activeRental, error: fetchError } = await supabase
        .from('rentals')
        .select('id')
        .eq('cubicle_id', cubicleId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!activeRental) {
        toast({
          title: "Error",
          description: "No se encontró una renta activa",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('rentals')
        .update({ is_active: false })
        .eq('id', activeRental.id);

      if (error) throw error;

      toast({
        title: "¡Liberado!",
        description: `Cubículo ${cubicleId} ahora está disponible`
      });

      await fetchCubicles();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo liberar el cubículo",
        variant: "destructive"
      });
    }
  };

  const addStudent = async (student: Student): Promise<Student | null> => {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          control_number: student.controlNumber,
          name: student.name,
          career: student.career
        })
        .select('id, control_number, name, career')
        .single();

      if (error) throw error;

      toast({
        title: "¡Registrado!",
        description: `Estudiante ${student.name} agregado exitosamente`
      });

      await fetchStudents();
      
      return {
        id: data.id,
        controlNumber: data.control_number,
        name: data.name,
        career: data.career
      };
    } catch (error: any) {
      const message = error.message?.includes('duplicate') 
        ? "Este número de control ya existe" 
        : "No se pudo agregar el estudiante";
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      return null;
    }
  };

  const importStudents = async (newStudents: Student[]) => {
    try {
      const studentsToInsert = newStudents.map(s => ({
        control_number: s.controlNumber,
        name: s.name,
        career: s.career
      }));

      const { error } = await supabase
        .from('students')
        .upsert(studentsToInsert, { 
          onConflict: 'control_number',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "¡Importación exitosa!",
        description: `${newStudents.length} ${newStudents.length === 1 ? 'estudiante importado' : 'estudiantes importados'}`
      });

      await fetchStudents();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron importar todos los estudiantes",
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <CubiclesContext.Provider
      value={{
        cubicles,
        students,
        rentCubicle,
        releaseCubicle,
        addStudent,
        importStudents,
        loading,
        refreshData
      }}
    >
      {children}
    </CubiclesContext.Provider>
  );
};

export const useCubicles = () => {
  const context = useContext(CubiclesContext);
  if (!context) {
    throw new Error('useCubicles must be used within a CubiclesProvider');
  }
  return context;
};
