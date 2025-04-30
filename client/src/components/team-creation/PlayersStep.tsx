import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Player } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FormationSelector } from './FormationSelector';
import { Formation } from '@/contexts/GameContext';

interface PlayersStepProps {
  onNext: () => void;
  onFormationChange: (formation: Formation) => void;
  onPlayersChange: (players: Player[]) => void;
}

export const PlayersStep = ({ onNext, onFormationChange, onPlayersChange }: PlayersStepProps) => {
  const { generateRandomPlayers } = useGame();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation>('4-3-3');

  const handleGeneratePlayers = () => {
    setIsLoading(true);
    // Simulate loading time of 2 seconds
    setTimeout(() => {
      try {
        const generatedPlayers = generateRandomPlayers('temp-team-id', 'Your Team');
        setPlayers(generatedPlayers);
        onPlayersChange(generatedPlayers);
      } catch (error) {
        console.error('Error generating players:', error);
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleFormationChange = (formation: Formation) => {
    setSelectedFormation(formation);
    onFormationChange(formation);
  };

  const handleNext = () => {
    if (players.length > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>{players.length > 0 ? 'Your squad' : 'Generate Your Team'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[300px] flex flex-col justify-center items-center">
          {!players.length && !isLoading && (
            <Button
              onClick={handleGeneratePlayers}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Players...
                </>
              ) : (
                'Generate Players'
              )}
            </Button>
          )}

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-footbai-accent" />
                <p className="text-sm text-muted-foreground">Creating your dream team...</p>
              </div>
            </div>
          )}

          {players.length > 0 && !isLoading && (
            <div className="w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => (
                  <Card key={player.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{player.name}</h4>
                          <p className="text-sm text-gray-500">{player.position}</p>
                        </div>
                        <div className="text-lg font-bold">{player.rating}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                onClick={handleNext}
                className="w-full mt-4"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formation Selection Section - Only visible after team generation */}
      {players.length > 0 && !isLoading && (
        <FormationSelector onFormationChange={handleFormationChange} />
      )}
    </div>
  );
};