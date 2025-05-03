import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Formation } from '@/types';
import { formations } from '@/config/formations';
import { useTeamStore } from '@/stores/useTeamStore';
import { motion, AnimatePresence } from 'framer-motion';

interface FormationDisplayProps {
  formation: Formation;
  size?: 'small' | 'large';
}

export const FormationDisplay = ({ formation, size = 'large' }: FormationDisplayProps) => {
  const positions = formation.split('-').map(Number);
  const totalPlayers = positions.reduce((a, b) => a + b, 0) + 1; // +1 for goalkeeper

  const sizeClasses = {
    small: {
      container: 'h-[200px]',
      player: 'w-6 h-6 text-xs',
      spacing: {
        gk: 'bottom-2',
        def: 'bottom-14',
        mid: 'bottom-28',
        fwd: 'bottom-42'
      }
    },
    large: {
      container: 'h-[300px]',
      player: 'w-8 h-8 text-sm',
      spacing: {
        gk: 'bottom-4',
        def: 'bottom-20',
        mid: 'bottom-40',
        fwd: 'bottom-60'
      }
    }
  };

  const currentSize = sizeClasses[size];

  const playerVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  return (
    <div className={`relative w-full border-2 border-footbai-hover rounded-lg p-4 bg-footbai-header ${currentSize.container}`}>
      {/* Goalkeeper */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`gk-${formation}`}
          className={`absolute ${currentSize.spacing.gk} left-1/2 transform -translate-x-1/2 ${currentSize.player} bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold`}
          variants={playerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          GK
        </motion.div>
      </AnimatePresence>
      
      {/* Defenders */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`def-${formation}`}
          className={`absolute ${currentSize.spacing.def} left-0 right-0 flex justify-around`}
          variants={playerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {Array.from({ length: positions[0] }).map((_, i) => (
            <motion.div
              key={`def-${i}-${formation}`}
              className={`${currentSize.player} bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold`}
              variants={playerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              D{i + 1}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Midfielders */}
      {positions.length > 1 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`mid-${formation}`}
            className={`absolute ${currentSize.spacing.mid} left-0 right-0 flex justify-around`}
            variants={playerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {Array.from({ length: positions[1] }).map((_, i) => (
              <motion.div
                key={`mid-${i}-${formation}`}
                className={`${currentSize.player} bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold`}
                variants={playerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                M{i + 1}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Forwards */}
      {positions.length > 2 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`fwd-${formation}`}
            className={`absolute ${currentSize.spacing.fwd} left-0 right-0 flex justify-around`}
            variants={playerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {Array.from({ length: positions[2] }).map((_, i) => (
              <motion.div
                key={`fwd-${i}-${formation}`}
                className={`${currentSize.player} bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold`}
                variants={playerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                F{i + 1}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

interface FormationSelectorProps {
  showHeader?: boolean;
  size?: 'small' | 'large';
}

export const FormationSelector = ({ 
  showHeader = true,
  size = 'large'
}: FormationSelectorProps) => {
  const { selectedFormation, updateTeamFormation } = useTeamStore();

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle>Select Formation</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        <Tabs 
          defaultValue={selectedFormation} 
          onValueChange={(value) => updateTeamFormation(value as Formation)}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-5">
            {formations.map((formation) => (
              <TabsTrigger key={formation} value={formation}>
                {formation}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedFormation}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FormationDisplay formation={selectedFormation} size={size} />
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}; 