import { useState } from 'react';
import { Player } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FormationSelector } from './FormationSelector';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
interface PlayersStepProps {
  onNext: () => void;
  onPlayersChange: (players: Player[]) => void;
}

export const PlayersStep = ({ onNext, onPlayersChange }: PlayersStepProps) => {
  const { generateRandomPlayers, teamId, teamName } = useOnboardingStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGeneratePlayers = () => {
    setIsLoading(true);
    // Simulate loading time of 2 seconds
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Your Squad</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="space-y-4">
              <p className="text-gray-400">
                Click the button below to generate your starting squad. You can regenerate if you're not satisfied with the players.
              </p>
              <Button
                onClick={handleGeneratePlayers}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Squad...
                  </>
                ) : (
                  'Generate Squad'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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
        <FormationSelector />
      )}
    </div>
  );
};