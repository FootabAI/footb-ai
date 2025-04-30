import React, { createContext, useContext, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import { Team, Player, TeamCreationContextType, TeamAttributes, TeamTactic, Formation } from "@/types";
import { useGame } from "./GameContext";

const DEFAULT_ATTRIBUTES: TeamAttributes = {
  passing: 40,
  shooting: 40,
  pace: 40,
  dribbling: 40,
  defending: 40,
  physicality: 40,
};

const TOTAL_POINTS = 60;

const TeamCreationContext = createContext<TeamCreationContextType | undefined>(
  undefined
);

export const TeamCreationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { updateTeam, selectedFormation } = useGame();

  // Team creation state
  const [teamName, setTeamName] = useState("");
  const [logoType, setLogoType] = useState<"manual" | "ai">("manual");
  const [initials, setInitials] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#62df6e");
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [customizedName, setCustomizedName] = useState("");
  const [themeTags, setThemeTags] = useState<string[]>([]);
  const [colorTags, setColorTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<TeamAttributes>(DEFAULT_ATTRIBUTES);
  const [tactic, setTactic] = useState<TeamTactic>("Balanced");
  const [pointsLeft, setPointsLeft] = useState(TOTAL_POINTS);

  const generateRandomPlayers = (
    teamId: string,
    teamName: string
  ): Player[] => {
    const positions = [
      "GK",
      "DEF",
      "DEF",
      "DEF",
      "DEF",
      "MID",
      "MID",
      "MID",
      "ATT",
      "ATT",
      "ATT",
    ];
    const firstNames = [
      "Alex",
      "Sam",
      "Jordan",
      "Taylor",
      "Casey",
      "Morgan",
      "Riley",
      "Jamie",
      "Avery",
      "Cameron",
      "Quinn",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Wilson",
    ];

    return positions.map((pos, i) => ({
      id: `player-${teamId}-${i}`,
      name: `${firstNames[i]} ${lastNames[i]}`,
      position: pos,
      rating: Math.floor(Math.random() * 30) + 60, // Random rating between 60-90
      teamId,
    }));
  };

  const handleAttributeChange = (attr: keyof TeamAttributes, newValue: number) => {
    const oldValue = attributes[attr];
    const pointDiff = newValue - oldValue;

    if (pointsLeft - pointDiff < 0) return;

    setAttributes({ ...attributes, [attr]: newValue });
    setPointsLeft((prev) => prev - pointDiff);
  };

  const createTeam = async (logoData: { image?: string; initials?: string; backgroundColor: string; theme?: string }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const teamId = crypto.randomUUID();
      const finalName = logoType === "manual" ? teamName : customizedName;

      const newTeam: Team & { userId: string } = {
        id: teamId,
        name: finalName,
        logo: logoType === "manual" 
          ? { initials: logoData.initials!, backgroundColor: logoData.backgroundColor }
          : { image: logoData.image!, theme: logoData.theme!, backgroundColor: logoData.backgroundColor },
        attributes,
        tactic,
        formation: selectedFormation,
        points: pointsLeft,
        players: [],
        userId: user.uid,
        isBot: false,
      };

      const newPlayers = generateRandomPlayers(teamId, finalName);
      newTeam.players = newPlayers;

      // Store team in Firestore
      const teamsCollection = collection(db, "teams");
      await addDoc(teamsCollection, newTeam);

      // Update local state
      setUserTeam(newTeam);
      setPlayers(newPlayers);
      setSuccess("Team created successfully!");
      
      // Update GameContext
      updateTeam(newTeam);
    } catch (err) {
      console.error("Error creating team:", err);
      setError("Failed to create team. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetTeamCreation = () => {
    setTeamName("");
    setLogoType("manual");
    setInitials("");
    setBackgroundColor("#62df6e");
    setFormation("4-3-3");
    setCustomizedName("");
    setThemeTags([]);
    setColorTags([]);
    setAttributes(DEFAULT_ATTRIBUTES);
    setTactic("Balanced");
    setPointsLeft(TOTAL_POINTS);
  };

  return (
    <TeamCreationContext.Provider
      value={{
        userTeam,
        players,
        isLoading,
        error,
        success,
        // Team creation state
        teamName,
        setTeamName,
        logoType,
        setLogoType,
        initials,
        setInitials,
        backgroundColor,
        setBackgroundColor,
        formation,
        setFormation,
        customizedName,
        setCustomizedName,
        themeTags,
        setThemeTags,
        colorTags,
        setColorTags,
        attributes,
        tactic,
        setTactic,
        pointsLeft,
        // Functions
        createTeam,
        handleAttributeChange,
        resetTeamCreation,
        generateRandomPlayers,
      }}
    >
      {children}
    </TeamCreationContext.Provider>
  );
};

export const useTeamCreation = (): TeamCreationContextType => {
  const context = useContext(TeamCreationContext);
  if (context === undefined) {
    throw new Error(
      "useTeamCreation must be used within a TeamCreationProvider"
    );
  }
  return context;
};
