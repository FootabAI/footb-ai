import React, { createContext, useContext, useState } from 'react';

// Types
export type TeamAttributes = {
  passing: number;
  shooting: number;
  pace: number;
  dribbling: number;
  defending: number;
  physicality: number;
};

export type LogoOptions = {
  initials: string;
  backgroundColor: string;
  type: 'manual' | 'ai';
  theme?: string;
};

export type TeamTactic = 'Balanced' | 'Offensive' | 'Defensive' | 'Counter-Attacking' | 'Aggressive' | 'Possession-Based';

export type Team = {
  id: string;
  name: string;
  logo: LogoOptions;
  attributes: TeamAttributes;
  tactic: TeamTactic;
  points: number;
  isBot?: boolean;
};

export type Player = {
  id: string;
  name: string;
  position: string;
  rating: number;
  teamId: string;
};

export type MatchEvent = {
  id: string;
  type: 'goal' | 'card' | 'injury' | 'substitution' | 'own-goal';
  minute: number;
  teamId: string;
  description: string;
};

export type MatchStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
};

export type Match = {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeStats: MatchStats;
  awayStats: MatchStats;
  isCompleted: boolean;
  winner?: string;
};

type GameContextType = {
  userTeam: Team | null;
  currentMatch: Match | null;
  botTeam: Team | null;
  players: Player[];
  createTeam: (team: Omit<Team, 'id' | 'points'>) => void;
  updateTeam: (team: Partial<Team>) => void;
  setupMatch: (opponent: Team) => void;
  simulateMatch: () => void;
  updateMatchStats: (homeStats: Partial<MatchStats>, awayStats: Partial<MatchStats>) => void;
  addMatchEvent: (event: Omit<MatchEvent, 'id'>) => void;
  completeMatch: (winnerId: string) => void;
  resetMatch: () => void;
  calculateTeamStrength: (team: Team) => number;
};

const defaultBotTeam: Team = {
  id: 'bot-1',
  name: 'AI United',
  logo: {
    initials: 'AI',
    backgroundColor: '#ff4d4d',
    type: 'manual'
  },
  attributes: {
    passing: 70,
    shooting: 65,
    pace: 75,
    dribbling: 68,
    defending: 72,
    physicality: 80
  },
  tactic: 'Balanced',
  points: 0,
  isBot: true
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [botTeam] = useState<Team>(defaultBotTeam);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const generateRandomPlayers = (teamId: string, teamName: string): Player[] => {
    const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT'];
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Avery', 'Cameron', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson'];
    
    return positions.map((pos, i) => ({
      id: `player-${teamId}-${i}`,
      name: `${firstNames[i]} ${lastNames[i]}`,
      position: pos,
      rating: Math.floor(Math.random() * 30) + 60, // Random rating between 60-90
      teamId
    }));
  };

  const createTeam = (team: Omit<Team, 'id' | 'points'>) => {
    const newTeam: Team = {
      ...team,
      id: 'user-team',
      points: 100 // Starting points
    };
    setUserTeam(newTeam);
    
    // Generate players for the team
    const newPlayers = generateRandomPlayers(newTeam.id, newTeam.name);
    setPlayers(newPlayers);
  };

  const updateTeam = (team: Partial<Team>) => {
    if (userTeam) {
      setUserTeam({ ...userTeam, ...team });
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
      redCards: 0
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
      isCompleted: false
    };

    setCurrentMatch(newMatch);
  };

  const updateMatchStats = (homeStats: Partial<MatchStats>, awayStats: Partial<MatchStats>) => {
    if (!currentMatch) return;
    
    setCurrentMatch({
      ...currentMatch,
      homeStats: { ...currentMatch.homeStats, ...homeStats },
      awayStats: { ...currentMatch.awayStats, ...awayStats },
    });
  };

  const addMatchEvent = (event: Omit<MatchEvent, 'id'>) => {
    if (!currentMatch) return;
    
    const newEvent: MatchEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    let homeScore = currentMatch.homeScore;
    let awayScore = currentMatch.awayScore;
    
    if (event.type === 'goal' && event.teamId !== 'system') {
      if (event.teamId === currentMatch.homeTeam.id) {
        homeScore++;
      } else if (event.teamId === currentMatch.awayTeam.id) {
        awayScore++;
      }
    }
    
    if (event.type === 'own-goal') {
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
      awayScore
    });
  };

  const completeMatch = (winnerId: string) => {
    if (!currentMatch || !userTeam) return;
    
    const isUserWinner = winnerId === userTeam.id;
    const pointsEarned = isUserWinner ? 50 : 10;
    
    setCurrentMatch({
      ...currentMatch,
      isCompleted: true,
      winner: winnerId
    });
    
    setUserTeam({
      ...userTeam,
      points: userTeam.points + pointsEarned
    });
  };

  const resetMatch = () => {
    setCurrentMatch(null);
  };

  const simulateMatch = () => {
    if (!currentMatch) return;
    console.log('Match simulation started');
  };

  const calculateTeamStrength = (team: Team) => {
    const { passing, shooting, pace, dribbling, defending, physicality } = team.attributes;
    return Math.round((passing + shooting + pace + dribbling + defending + physicality) / 6);
  };

  return (
    <GameContext.Provider
      value={{
        userTeam,
        currentMatch,
        botTeam,
        players,
        createTeam,
        updateTeam,
        setupMatch,
        simulateMatch,
        updateMatchStats,
        addMatchEvent,
        completeMatch,
        resetMatch,
        calculateTeamStrength
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};