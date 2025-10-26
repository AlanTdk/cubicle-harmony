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
    const { data: cubiclesData, error: cubiclesError } = await supabase
      .from('cubicles')
      .select('*')
      .order('id');

    if (cubiclesError) {
      console.error('Error fetching cubicles:', cubiclesError);
      toast({
        title: "Error",
        description: "No se pudieron cargar los cubículos",
        variant: "destructive"
      });
      return;
    }

    // Get active rentals for each cubicle
    const { data: rentalsData, error: rentalsError } = await supabase
      .from('rentals')
      .select('*, students(*)')
      .eq('is_active', true);

    if (rentalsError) {
      console.error('Error fetching rentals:', rentalsError);
    }

    const cubiclesWithRentals = cubiclesData.map(cubicle => {
      const activeRental = rentalsData?.find(r => r.cubicle_id === cubicle.id);
      return {
        id: cubicle.id,
        isOccupied: cubicle.is_occupied,
        student: activeRental?.students ? {
          id: activeRental.students.id,
          controlNumber: activeRental.students.control_number,
          name: activeRental.students.name,
          career: activeRental.students.career
        } : undefined,
        hours: activeRental?.hours,
        startTime: activeRental?.start_time ? new Date(activeRental.start_time) : undefined
      };
    });

    setCubicles(cubiclesWithRentals);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los estudiantes",
        variant: "destructive"
      });
      return;
    }

    const formattedStudents = data.map(s => ({
      id: s.id,
      controlNumber: s.control_number,
      name: s.name,
      career: s.career
    }));

    setStudents(formattedStudents);
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

    if (error) {
      console.error('Error renting cubicle:', error);
      toast({
        title: "Error",
        description: "No se pudo rentar el cubículo",
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "¡Éxito!",
      description: `Cubículo ${cubicleId} rentado por ${hours} horas`
    });

    await fetchCubicles();
  };

  const releaseCubicle = async (cubicleId: number) => {
    // Find active rental for this cubicle
    const { data: activeRental, error: fetchError } = await supabase
      .from('rentals')
      .select('id')
      .eq('cubicle_id', cubicleId)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      console.error('Error finding active rental:', fetchError);
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

    if (error) {
      console.error('Error releasing cubicle:', error);
      toast({
        title: "Error",
        description: "No se pudo liberar el cubículo",
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "¡Liberado!",
      description: `Cubículo ${cubicleId} ahora está disponible`
    });

    await fetchCubicles();
  };

  const addStudent = async (student: Student): Promise<Student | null> => {
    const { data, error } = await supabase
      .from('students')
      .insert({
        control_number: student.controlNumber,
        name: student.name,
        career: student.career
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "Este número de control ya existe" 
          : "No se pudo agregar el estudiante",
        variant: "destructive"
      });
      return null;
    }

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
  };

  const importStudents = async (newStudents: Student[]) => {
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

    if (error) {
      console.error('Error importing students:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar todos los estudiantes",
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "¡Importación exitosa!",
      description: `${newStudents.length} estudiantes importados`
    });

    await fetchStudents();
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
