import { motion } from 'framer-motion';
import { Cubicle } from '@/types/student';
import { Clock, User } from 'lucide-react';

interface CubicleCardProps {
  cubicle: Cubicle;
  onClick: () => void;
}

export const CubicleCard = ({ cubicle, onClick }: CubicleCardProps) => {
  return (
    <motion.div
      whileHover={!cubicle.isOccupied ? { scale: 1.05 } : {}}
      whileTap={!cubicle.isOccupied ? { scale: 0.98 } : {}}
      className={`
        relative overflow-hidden rounded-xl border-2 p-6 cursor-pointer
        transition-all duration-300
        ${
          cubicle.isOccupied
            ? 'bg-card border-occupied/20'
            : 'bg-card border-primary/20 hover:border-primary hover:shadow-lg'
        }
      `}
      onClick={!cubicle.isOccupied ? onClick : undefined}
      layout
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">
              Cubículo {cubicle.id}
            </h3>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                px-3 py-1 rounded-full text-xs font-semibold
                ${
                  cubicle.isOccupied
                    ? 'bg-occupied text-occupied-foreground'
                    : 'bg-available text-available-foreground'
                }
              `}
            >
              {cubicle.isOccupied ? 'Ocupado' : 'Disponible'}
            </motion.div>
          </div>

          {cubicle.isOccupied && cubicle.student && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 text-sm"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="font-medium text-foreground">
                  {cubicle.student.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{cubicle.hours} {cubicle.hours === 1 ? 'hora' : 'horas'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {cubicle.student.controlNumber}
              </p>
            </motion.div>
          )}
        </div>

        {!cubicle.isOccupied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-primary font-medium"
          >
            Click para rentar →
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
