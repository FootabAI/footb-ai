import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Formation } from '@/contexts/GameContext';

interface FormationSelectorProps {
  onFormationChange: (formation: Formation) => void;
}

export const FormationSelector = ({ onFormationChange }: FormationSelectorProps) => {
  const [selectedFormation, setSelectedFormation] = useState<Formation>('4-3-3');

  const formations: Formation[] = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '5-3-2'];

  const handleFormationSelect = (formation: Formation) => {
    setSelectedFormation(formation);
    onFormationChange(formation);
  };

  const renderFormation = (formation: Formation) => {
    const positions = formation.split('-').map(Number);
    const totalPlayers = positions.reduce((a, b) => a + b, 0) + 1; // +1 for goalkeeper

    return (
      <div className="relative w-full h-[300px] border-2 border-footbai-hover rounded-lg p-4 bg-footbai-header">

        {/* Goalkeeper */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold">
          GK
        </div>
        
        {/* Defenders */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-around">
          {Array.from({ length: positions[0] }).map((_, i) => (
            <div key={`def-${i}`} className="w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold">
              D{i + 1}
            </div>
          ))}
        </div>

        {/* Midfielders */}
        {positions.length > 1 && (
          <div className="absolute bottom-40 left-0 right-0 flex justify-around">
            {Array.from({ length: positions[1] }).map((_, i) => (
              <div key={`mid-${i}`} className="w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold">
                M{i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Forwards */}
        {positions.length > 2 && (
          <div className="absolute bottom-60 left-0 right-0 flex justify-around">
            {Array.from({ length: positions[2] }).map((_, i) => (
              <div key={`fwd-${i}`} className="w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center text-white font-bold">
                F{i + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Formation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue={selectedFormation} onValueChange={(value) => handleFormationSelect(value as Formation)}>
          <TabsList className="grid w-full grid-cols-5">
            {formations.map((formation) => (
              <TabsTrigger key={formation} value={formation}>
                {formation}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="mt-6">
          {renderFormation(selectedFormation)}
        </div>
      </CardContent>
    </Card>
  );
}; 