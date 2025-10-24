import { createContext, useContext, useState, ReactNode } from 'react';
import { Cubicle, Student } from '@/types/student';
import studentsData from '@/data/students.json';

interface CubiclesContextType {
  cubicles: Cubicle[];
  students: Student[];
  rentCubicle: (cubicleId: number, student: Student, hours: number) => void;
  releaseCubicle: (cubicleId: number) => void;
  addStudent: (student: Student) => void;
  importStudents: (newStudents: Student[]) => void;
}

const CubiclesContext = createContext<CubiclesContextType | undefined>(undefined);

export const CubiclesProvider = ({ children }: { children: ReactNode }) => {
  const [cubicles, setCubicles] = useState<Cubicle[]>([
    { id: 1, isOccupied: false },
    { id: 2, isOccupied: false },
    { id: 3, isOccupied: false },
    { id: 4, isOccupied: false },
  ]);

  const [students, setStudents] = useState<Student[]>(studentsData as Student[]);

  const rentCubicle = (cubicleId: number, student: Student, hours: number) => {
    setCubicles(prev =>
      prev.map(cubicle =>
        cubicle.id === cubicleId
          ? {
              ...cubicle,
              isOccupied: true,
              student,
              hours,
              startTime: new Date(),
            }
          : cubicle
      )
    );
  };

  const releaseCubicle = (cubicleId: number) => {
    setCubicles(prev =>
      prev.map(cubicle =>
        cubicle.id === cubicleId
          ? {
              ...cubicle,
              isOccupied: false,
              student: undefined,
              hours: undefined,
              startTime: undefined,
            }
          : cubicle
      )
    );
  };

  const addStudent = (student: Student) => {
    setStudents(prev => [...prev, student]);
  };

  const importStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
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
