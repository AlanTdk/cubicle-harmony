import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Hash, GraduationCap } from 'lucide-react';
import { useCubicles } from '@/context/CubiclesContext';
import { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cubicleId: number;
}

type Step = 'search' | 'register' | 'details' | 'confirm';

const careers = [
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería Industrial',
  'Ingeniería Electrónica',
  'Ingeniería Civil',
  'Arquitectura',
  'Ingeniería Mecánica',
  'Ingeniería Química',
];

export const BookingModal = ({ isOpen, onClose, cubicleId }: BookingModalProps) => {
  const { students, addStudent, rentCubicle } = useCubicles();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [hours, setHours] = useState(1);
  const [newStudent, setNewStudent] = useState({
    name: '',
    controlNumber: '',
    career: '',
  });

  const filteredStudents = students.filter(
    student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.controlNumber.includes(searchQuery)
  );

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStep('details');
  };

  const handleRegisterNewStudent = () => {
    if (!newStudent.name || !newStudent.controlNumber || !newStudent.career) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const student: Student = {
      id: Date.now().toString(),
      ...newStudent,
    };

    addStudent(student);
    setSelectedStudent(student);
    setStep('details');
    toast.success('Alumno registrado exitosamente');
  };

  const handleConfirmBooking = () => {
    if (selectedStudent) {
      rentCubicle(cubicleId, selectedStudent, hours);
      toast.success(`Cubículo ${cubicleId} rentado exitosamente`);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep('search');
    setSearchQuery('');
    setSelectedStudent(null);
    setHours(1);
    setNewStudent({ name: '', controlNumber: '', career: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={resetAndClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-foreground">
                  Rentar Cubículo {cubicleId}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetAndClose}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {step === 'search' && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="search">Buscar Alumno</Label>
                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="search"
                            placeholder="Número de control o nombre..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {searchQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2 max-h-64 overflow-y-auto"
                        >
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map(student => (
                              <motion.div
                                key={student.id}
                                whileHover={{ scale: 1.02 }}
                                className="p-4 border border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                                onClick={() => handleSelectStudent(student)}
                              >
                                <p className="font-medium text-foreground">{student.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {student.controlNumber}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {student.career}
                                </p>
                              </motion.div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No se encontraron resultados
                            </p>
                          )}
                        </motion.div>
                      )}

                      <Button
                        onClick={() => setStep('register')}
                        className="w-full"
                        variant="outline"
                      >
                        Registrar Nuevo Alumno
                      </Button>
                    </motion.div>
                  )}

                  {step === 'register' && (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="name">
                          <User className="w-4 h-4 inline mr-2" />
                          Nombre Completo
                        </Label>
                        <Input
                          id="name"
                          value={newStudent.name}
                          onChange={e =>
                            setNewStudent(prev => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Juan Pérez García"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="control">
                          <Hash className="w-4 h-4 inline mr-2" />
                          Número de Control
                        </Label>
                        <Input
                          id="control"
                          value={newStudent.controlNumber}
                          onChange={e =>
                            setNewStudent(prev => ({
                              ...prev,
                              controlNumber: e.target.value,
                            }))
                          }
                          placeholder="20210001"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="career">
                          <GraduationCap className="w-4 h-4 inline mr-2" />
                          Carrera
                        </Label>
                        <select
                          id="career"
                          value={newStudent.career}
                          onChange={e =>
                            setNewStudent(prev => ({ ...prev, career: e.target.value }))
                          }
                          className="w-full mt-2 px-3 py-2 bg-background border border-input rounded-md"
                        >
                          <option value="">Seleccionar carrera</option>
                          {careers.map(career => (
                            <option key={career} value={career}>
                              {career}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setStep('search')}
                          variant="outline"
                          className="flex-1"
                        >
                          Atrás
                        </Button>
                        <Button onClick={handleRegisterNewStudent} className="flex-1">
                          Guardar y Seleccionar
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 'details' && selectedStudent && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <h3 className="font-semibold text-foreground mb-2">
                          Alumno Seleccionado
                        </h3>
                        <p className="text-sm text-foreground">{selectedStudent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedStudent.controlNumber}
                        </p>
                      </div>

                      <div>
                        <Label>Seleccionar Horas (1-6)</Label>
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          {[1, 2, 3, 4, 5, 6].map(h => (
                            <Button
                              key={h}
                              onClick={() => setHours(h)}
                              variant={hours === h ? 'default' : 'outline'}
                              className="aspect-square"
                            >
                              {h}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button onClick={handleConfirmBooking} className="w-full" size="lg">
                        Confirmar Renta
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
