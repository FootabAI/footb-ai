import { useState, useEffect, useCallback } from "react";
import { Player } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

interface PlayersStepProps {
  onNext: () => void;
  onPlayersChange: (players: Player[]) => void;
}

// Create initial placeholder players
const createPlaceholderPlayers = (teamId: string): Player[] => {
  const positions = [
    "Goalkeeper",
    "Right-Back",
    "Centre-Back",
    "Centre-Back",
    "Left-Back",
    "Central Midfielder",
    "Central Midfielder",
    "Attacking Midfielder",
    "Right Winger",
    "Left Winger",
    "Striker"
  ];

  return positions.map((position, index) => ({
    id: `player-${teamId}-${index}`,
    name: "Loading...",
    position,
    rating: 0, // Set to 0 for placeholder
    teamId,
    image_base64: null,
    imageUrl: null,
    createdAt: new Date().toISOString(),
  }));
};

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
    isLoading,
    isGeneratingImages,
    imageGenerationProgress
  } = useOnboardingStore();

  const handleGeneratePlayers = useCallback(async () => {
    if (isLoading || isGeneratingImages) return;
    
    try {
      if (nationality === "") {
        toast.error("Please select a nationality");
        return;
      }

      // Generate a new teamId if one doesn't exist
      const newTeamId = teamId || `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!teamId) {
        setTeamId(newTeamId);
      }

      // Create placeholder players immediately
      const placeholderPlayers = createPlaceholderPlayers(newTeamId);
      setPlayers(placeholderPlayers);
      onPlayersChange(placeholderPlayers);

      // Generate players with images
      const result = await generatePlayers(nationality, true);
      
      if (!result.success) {
        throw new Error("Failed to generate players");
      }

      // Create/update team document in Firestore
      const teamRef = doc(db, "teams", newTeamId);
      const teamData = {
        id: newTeamId,
        name: teamName || 'Unnamed Team',
        players: result.players,
        attributes: attributes || {
          attack: 50,
          defense: 50,
          midfield: 50,
          overall: 50
        },
        tactic: tactic || 'balanced',
        formation: formation || '4-4-2',
        teamStats: teamStats || {
          goals: 0,
          conceded: 0,
          wins: 0,
          draws: 0,
          losses: 0
        },
        createdAt: new Date().toISOString(),
        mainColor: mainColor || '#000000',
        nationality: nationality || 'English'
      };

      await setDoc(teamRef, teamData, { merge: true });
      setPlayers(result.players);
      onPlayersChange(result.players);
      
      toast.success("Squad generated successfully!");

    } catch (error) {
      console.error("Error generating players:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate players. Please try again.");
    }
  }, [
    isLoading,
    isGeneratingImages,
    nationality,
    teamId,
    teamName,
    attributes,
    tactic,
    formation,
    teamStats,
    mainColor,
    setTeamId,
    setPlayers,
    onPlayersChange,
    generatePlayers
  ]);

  const getPlayerImageSrc = (player: Player) => {
    if (player.imageUrl) {
      return player.imageUrl;
    }
    if (player.image_base64) {
      return `data:image/png;base64,${player.image_base64}`;
    }
    return null;
  };

  const formatPlayerName = (fullName: string) => {
    if (fullName === "Generating...") return "Generating...";
    const names = fullName.split(' ');
    if (names.length === 1) return fullName;
    return `${names[0][0]}. ${names[names.length - 1]}`;
  };

  const getInitials = (name: string) => {
    if (name === "Generating...") return "?";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRating = (rating: number) => {
    return rating === 0 ? "--" : rating.toString();
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
            disabled={isLoading || isGeneratingImages}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
            {(isLoading || isGeneratingImages) && <Loader2 className="h-4 w-4 animate-spin" />}
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
              disabled={isLoading || isGeneratingImages}
              className="gap-2"
            >
              {isLoading || isGeneratingImages ? (
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
              const isNameLoading = player.name === "Generating...";
              
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
                            {isGeneratingImages ? (
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="text-lg font-semibold text-muted-foreground">
                                {getInitials(player.name)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-muted-foreground">
                          {formatPlayerName(player.name)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {player.position}
                        </p>
                      </div>
                      <div
                        className="text-xl font-bold"
                        style={{ color: isNameLoading ? 'var(--muted-foreground)' : mainColor }}
                      >
                        {formatRating(player.rating)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {isGeneratingImages && (
            <div className="text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating player images... {Math.round(imageGenerationProgress)}% complete</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ 
                    width: `${imageGenerationProgress}%`,
                    backgroundColor: mainColor 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
