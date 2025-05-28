import { useState } from "react";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";

interface PlayersStepProps {
  onNext: () => void;
  onPlayersChange: (players: Player[]) => void;
}

export const PlayersStep = ({ onNext, onPlayersChange }: PlayersStepProps) => {
  const {
    generatePlayers,
    generatePlayerImages,
    teamId,
    teamName,
    mainColor,
    nationality,
    setNationality,
  } = useOnboardingStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGeneratePlayers = async () => {
    setIsLoading(true);

    try {
      if (nationality === "") {
        toast.error("Please select a nationality");
        return;
      }
      const response = await generatePlayers(nationality, true);
      const generatedPlayers = response.squad.map((player, index) => ({
        id: `player-${teamId}-${index}`,
        name: player.name,
        position: player.position,
        rating: Math.floor(Math.random() * 30) + 60, // Random rating between 60-90
        teamId,
      }));

      const imageData = await generatePlayerImages(generatedPlayers, nationality);

      const playersWithImages = generatedPlayers.map((player, idx) => ({
        ...player,
        image_base64: imageData.players[idx]?.image_base64 || null,
        attributes: imageData.players[idx]?.attributes || {},
      }));

      setPlayers(playersWithImages);
      onPlayersChange(playersWithImages);
    } catch (error) {
      console.error("Error generating players:", error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center w-full justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Your Squad</h2>
            <p className="text-muted-foreground">
              Generate your starting lineup
            </p>
          </div>
          <div className={players.length > 0 ? "hidden" : "block"}>
            <Select
              value={nationality}
              onValueChange={(value) => setNationality(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select nationality" />
                <SelectContent>
                  <SelectItem value="England">England</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Italy">Italy</SelectItem>
                  <SelectItem value="Norway">Norway</SelectItem>
                  <SelectItem value="Sweden">Sweden</SelectItem>
                  <SelectItem value="Denmark">Denmark</SelectItem>
                  <SelectItem value="Netherlands">Netherlands</SelectItem>
                  <SelectItem value="Belgium">Belgium</SelectItem>
                  <SelectItem value="Portugal">Portugal</SelectItem>
                  <SelectItem value="Croatia">Croatia</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </Select>
          </div>
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
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
                "Generate Squad"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <Card
                key={player.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{player.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {player.position}
                      </p>
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

      {/* {players.length > 0 && !isLoading && (
        <FormationSelector isOnboarding={true} />
      )} */}
    </div>
  );
};
