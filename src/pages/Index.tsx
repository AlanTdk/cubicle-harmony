import { useState } from 'react';
import { motion } from 'framer-motion';
import { CubicleCard } from '@/components/CubicleCard';
import { BookingModal } from '@/components/BookingModal';
import { ImportStudents } from '@/components/ImportStudents';
import { useCubicles } from '@/context/CubiclesContext';
import { Building2 } from 'lucide-react';

const Index = () => {
  const { cubicles } = useCubicles();
  const [selectedCubicle, setSelectedCubicle] = useState<number | null>(null);

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
