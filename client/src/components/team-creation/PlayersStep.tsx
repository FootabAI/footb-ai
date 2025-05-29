import { useState, useEffect, useCallback } from "react";
import { Player } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useBackgroundImageStore } from "@/stores/useBackgroundImageStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebaseConfig";

interface PlayersStepProps {
  onNext: () => void;
  onPlayersChange: (players: Player[]) => void;
}

export const PlayersStep = ({ onNext, onPlayersChange }: PlayersStepProps) => {
  const {
    generatePlayers,
    teamId,
    setTeamId,
    teamName,
    mainColor,
    nationality,
    setNationality,
    setPlayers,
    players,
    attributes,
    tactic,
    formation,
    teamStats,
  } = useOnboardingStore();

  const { isGenerating, progress, startGeneration, stopGeneration, playerImages } = useBackgroundImageStore();
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);

  // Set up real-time listener for player updates
  useEffect(() => {
    if (!teamId || !isGenerating) return;

    const teamRef = doc(db, "teams", teamId);
    const unsubscribe = onSnapshot(teamRef, (doc) => {
      if (doc.exists()) {
        const teamData = doc.data();
        if (teamData.players) {
          setPlayers(teamData.players);
          onPlayersChange(teamData.players);
        }
      }
    }, (error) => {
      console.error("Error listening to team updates:", error);
    });

    setRealTimeUpdates(true);

    return () => {
      unsubscribe();
      setRealTimeUpdates(false);
    };
  }, [teamId, isGenerating, setPlayers, onPlayersChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, [stopGeneration]);

  const handleGeneratePlayers = useCallback(async () => {
    if (isLoading || isGenerating) return;
    
    setIsLoading(true);

    try {
      if (nationality === "") {
        toast.error("Please select a nationality");
        return;
      }

      // Stop any existing generation
      stopGeneration();

      // Generate a new teamId if one doesn't exist
      const newTeamId = teamId || `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!teamId) {
        setTeamId(newTeamId);
      }

      // Step 1: Generate player names and basic data
      const response = await generatePlayers(nationality, true);
      const generatedPlayers = response.squad.map((player, index) => ({
        id: `player-${newTeamId}-${index}`,
        name: player.name,
        position: player.position,
        rating: Math.floor(Math.random() * 30) + 60,
        teamId: newTeamId,
        image_base64: null,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      }));

      // Set players immediately
      setPlayers(generatedPlayers);
      onPlayersChange(generatedPlayers);

      // Step 2: Create/update team document in Firestore
      const teamRef = doc(db, "teams", newTeamId);
      await setDoc(teamRef, {
        id: newTeamId,
        name: teamName,
        players: generatedPlayers,
        attributes,
        tactic,
        formation,
        teamStats,
        createdAt: new Date().toISOString(),
        mainColor,
        nationality,
        imageGenerationStatus: 'pending'
      }, { merge: true });

      // Step 3: Start background image generation
      toast.success("Squad generated! Player images are being created in the background.");
      
      // Start generation with a small delay to ensure UI updates
      setTimeout(() => {
        startGeneration(newTeamId, generatedPlayers, nationality);
      }, 100);

    } catch (error) {
      console.error("Error generating players:", error);
      toast.error("Failed to generate players. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading, 
    isGenerating, 
    nationality, 
    teamId, 
    teamName, 
    attributes, 
    tactic, 
    formation, 
    teamStats, 
    mainColor,
    generatePlayers,
    setTeamId,
    setPlayers,
    onPlayersChange,
    startGeneration,
    stopGeneration
  ]);

  const getPlayerImageSrc = (player: Player) => {
    if (player.imageUrl) {
      return player.imageUrl;
    }
    if (playerImages[player.id]) {
      return `data:image/png;base64,${playerImages[player.id]}`;
    }
    return null;
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
            {realTimeUpdates && (
              <p className="text-xs text-green-600 mt-1">
                Real-time updates active
              </p>
            )}
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
            disabled={isLoading || isGenerating}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
            {(isLoading || isGenerating) && <Loader2 className="h-4 w-4 animate-spin" />}
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
            {players.map((player) => {
              const imageSrc = getPlayerImageSrc(player);
              const hasImage = Boolean(imageSrc);
              
              return (
                <Card
                  key={player.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {hasImage ? (
                          <img
                            src={imageSrc}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Error loading image for player:', player.name, 'URL:', imageSrc);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            {isGenerating ? (
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="text-2xl font-bold text-muted-foreground">
                                {player.name.charAt(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
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
              );
            })}
          </div>
          
          {isGenerating && (
            <div className="text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating player images... {Math.round(progress)}% complete</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: mainColor 
                  }}
                />
              </div>
              <p className="text-sm">You can continue to the next step while images generate</p>
            </div>
          )}
          
          <div className="flex justify-center">
            <Button 
              onClick={onNext}
              className="gap-2"
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
