import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "@/firebaseConfig";
import { addDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Team,
  Match,
  Player,
  MatchStats,
  GameContextType,
  MatchEvent,
} from "@/types";

const defaultBotTeam: Team = {
  id: "bot-1",
  name: "AI United",
  logo: {
    initials: "AI",
    backgroundColor: "#ff4d4d",
  },
  attributes: {
    passing: 70,
    shooting: 65,
    pace: 75,
    dribbling: 68,
    defending: 72,
    physicality: 80,
  },
  tactic: "Balanced",
  points: 0,
  isBot: true,
  players: [],
  userId: "",
  formation: "4-3-3",
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [botTeam] = useState<Team>(defaultBotTeam);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeam = async (userId: string) => {
    try {
      setIsLoading(true);
      // Query teams collection for user's team
      const teamsCollection = collection(db, "teams");
      const q = query(teamsCollection, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const teamDoc = querySnapshot.docs[0];
        const teamData = teamDoc.data() as Team;
        setUserTeam(teamData);
        setPlayers(teamData.players || []);
      } else {
        setUserTeam(null);
        setPlayers([]);
      }
    } catch (err) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load user's team when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadTeam(user.uid);
      } else {
        setUserTeam(null);
        setPlayers([]);
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const updateTeam = async (team: Team) => {
    try {
      if (!team.id) {
        throw new Error("Team ID is required for updates");
      }

      // Update local state
      setUserTeam(team);
      setPlayers(team.players || []);

      // Update Firebase
      const teamsRef = collection(db, "teams");
      const teamQuery = query(teamsRef, where("id", "==", team.id));
      const querySnapshot = await getDocs(teamQuery);

      if (querySnapshot.empty) {
        throw new Error("Team not found in database");
      }

      const teamDoc = querySnapshot.docs[0];
      await updateDoc(teamDoc.ref, {
        ...team,
        updatedAt: new Date().toISOString()
      });

      setSuccess("Team updated successfully");
    } catch (error) {
      console.error("Error updating team:", error);
      setError(error instanceof Error ? error.message : "Failed to update team");
    }
  };

  const setupMatch = (opponent: Team) => {
    if (!userTeam) return;

    const initialStats: MatchStats = {
      possession: 50,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      passAccuracy: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
    };

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      homeTeam: userTeam,
      awayTeam: opponent,
      homeScore: 0,
      awayScore: 0,
      events: [],
      homeStats: { ...initialStats },
      awayStats: { ...initialStats },
      isCompleted: false,
    };

    setCurrentMatch(newMatch);
  };

  const updateMatchStats = (
    homeStats: Partial<MatchStats>,
    awayStats: Partial<MatchStats>
  ) => {
    if (!currentMatch) return;

    setCurrentMatch({
      ...currentMatch,
      homeStats: { ...currentMatch.homeStats, ...homeStats },
      awayStats: { ...currentMatch.awayStats, ...awayStats },
    });
  };

  const addMatchEvent = (event: Omit<MatchEvent, "id">) => {
    if (!currentMatch) return;

    const newEvent: MatchEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    let homeScore = currentMatch.homeScore;
    let awayScore = currentMatch.awayScore;

    if (event.type === "goal" && event.teamId !== "system") {
      if (event.teamId === currentMatch.homeTeam.id) {
        homeScore++;
      } else if (event.teamId === currentMatch.awayTeam.id) {
        awayScore++;
      }
    }

    if (event.type === "own-goal") {
      if (event.teamId === currentMatch.homeTeam.id) {
        awayScore++;
      } else {
        homeScore++;
      }
    }

    const updatedEvents = [...currentMatch.events, newEvent];

    setCurrentMatch({
      ...currentMatch,
      events: updatedEvents,
      homeScore,
      awayScore,
    });
  };

  const completeMatch = (winnerId: string) => {
    if (!currentMatch || !userTeam) return;

    const isUserWinner = winnerId === userTeam.id;
    const pointsEarned = isUserWinner ? 50 : 10;

    setCurrentMatch({
      ...currentMatch,
      isCompleted: true,
      winner: winnerId,
    });

    setUserTeam({
      ...userTeam,
      points: userTeam.points + pointsEarned,
    });
  };

  const resetMatch = () => {
    setCurrentMatch(null);
  };

  const simulateMatch = () => {
    if (!currentMatch) return;
    console.log("Match simulation started");
  };

  const calculateTeamStrength = (team: Team) => {
    const {
      passing,
      shooting,
      pace,
      dribbling,
      defending,
      physicality,
    } = team.attributes;
    return Math.round(
      (passing + shooting + pace + dribbling + defending + physicality) / 6
    );
  };

  return (
    <GameContext.Provider
      value={{
        userTeam,
        currentMatch,
        botTeam,
        players,
        isLoading,
        error,
        success,
        updateTeam,
        setupMatch,
        simulateMatch,
        updateMatchStats,
        addMatchEvent,
        completeMatch,
        resetMatch,
        calculateTeamStrength,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
