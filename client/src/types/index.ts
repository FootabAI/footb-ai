// Types
export type TeamAttributes = {
  passing: number;
  shooting: number;
  pace: number;
  dribbling: number;
  defending: number;
  physicality: number;
};

export type ManualLogoOptions = {
  initials: string;
  backgroundColor: string;
  
};

export type AILogoOptions = {
  image: string;
  theme: string;
  backgroundColor: string;
};

export type Formation = '4-3-3' | '4-2-3-1' | '3-5-2' | '4-4-2' | '5-3-2';
export type TeamTactic = 'Balanced' | 'Offensive' | 'Defensive' | 'Counter-Attacking' | 'Aggressive' | 'Possession-Based';

export type Team = {
  id: string;
  name: string;
  logo: {
    type: 'manual' | 'ai';
    data: {
      initials?: string;
      backgroundColor?: string;
      image?: string;
      mainColor?: string;
    };
  };
  attributes: TeamAttributes;
  tactic: TeamTactic;
  formation: Formation;
  points: number;
  players: Player[];
  userId: string;
  isBot: boolean;
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
  type: 'goal' | 'yellow_card' | 'red_card' | 'injury' | 'substitution' | 'own-goal' | 'half-time' | 'full-time';
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
  corners: number;
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

export interface GameContextType {
  userTeam: Team | null;
  currentMatch: Match | null;
  botTeam: Team;
  players: Player[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  selectedFormation: Formation;
  handleFormationSelect: (formation: Formation) => void;
  updateTeam: (team: Team) => void;
  setupMatch: (opponent: Team) => void;
  updateMatchStats: (homeStats: Partial<MatchStats>, awayStats: Partial<MatchStats>) => void;
  addMatchEvent: (event: Omit<MatchEvent, "id">) => void;
  completeMatch: (winnerId: string) => void;
  resetMatch: () => void;
  simulateMatch: () => void;
  calculateTeamStrength: (team: Team) => number;
}

export type TeamCreationContextType = {
  // Team state
  userTeam: Team | null;
  players: Player[];
  isLoading: boolean;
  error: string | null;
  success: string | null;

  // Team creation state
  teamName: string;
  setTeamName: (name: string) => void;
  logoType: "manual" | "ai";
  setLogoType: (type: "manual" | "ai") => void;
  initials: string;
  setInitials: (initials: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  formation: Formation;
  setFormation: (formation: Formation) => void;
  customizedName: string;
  setCustomizedName: (name: string) => void;
  themeTags: string[];
  setThemeTags: (tags: string[]) => void;
  colorTags: string[];
  setColorTags: (tags: string[]) => void;
  attributes: TeamAttributes;
  tactic: TeamTactic;
  setTactic: (tactic: TeamTactic) => void;
  pointsLeft: number;

  // Functions
  createTeam: (logoData: { image?: string; initials?: string; backgroundColor: string; theme?: string }) => Promise<void>;
  handleAttributeChange: (attr: keyof TeamAttributes, newValue: number) => void;
  resetTeamCreation: () => void;
  generateRandomPlayers: (teamId: string, teamName: string) => Player[];
}

export * from './game';
export * from './user';
export * from './onboarding';