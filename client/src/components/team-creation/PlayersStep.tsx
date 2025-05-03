import { useState } from 'react';
import { Player } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { FormationSelector } from './FormationSelector';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

interface PlayersStepProps {
  onNext: () => void;
  onPlayersChange: (players: Player[]) => void;
}

export const PlayersStep = ({ onNext, onPlayersChange }: PlayersStepProps) => {
  const { generateRandomPlayers, teamId, teamName, mainColor } = useOnboardingStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGeneratePlayers = () => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        const generatedPlayers = generateRandomPlayers(teamId, teamName);
        setPlayers(generatedPlayers);
        onPlayersChange(generatedPlayers);
      } catch (error) {
        console.error('Error generating players:', error);
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleNext = () => {
    if (players.length > 0) {
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Your Squad</h2>
          <p className="text-muted-foreground">Generate your starting lineup</p>
        </div>
        {players.length > 0 && (
          <Button
            variant="outline"
            onClick={handleGeneratePlayers}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>

      {players.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-muted-foreground mb-6">
              Click the button below to generate your starting squad
            </p>
            <Button
              onClick={handleGeneratePlayers}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Squad'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <Card key={player.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{player.name}</h4>
                      <p className="text-sm text-muted-foreground">{player.position}</p>
                    </div>
                    <div 
                      className="text-xl font-bold"
                      style={{ color: mainColor }}
                    >
                      {player.rating}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {players.length > 0 && !isLoading && (
        <FormationSelector isOnboarding={true} />
      )}
    </div>
  );
};