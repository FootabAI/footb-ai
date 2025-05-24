/**
 * Team-related type definitions
 */

/**
 * Represents the core attributes of a team that affect gameplay
 */
export type TeamAttributes = {
  passing: number;
  shooting: number;
  pace: number;
  dribbling: number;
  defending: number;
  physicality: number;
};

/**
 * Available team formations in the game
 */
export type Formation = '4-3-3' | '4-2-3-1' | '3-5-2' | '4-4-2' | '5-3-2';

/**
 * Available team tactics in the game
 */
export type TeamTactic = 'Tiki-Taka' | 'Park-The-Bus' | 'Direct-Play' | 'Total-Football' | 'Catenaccio' | 'Gegenpressing';

/**
 * Represents a team's logo configuration
 */
export type TeamLogo = {
  type: 'manual' | 'ai';
  data: {
    initials?: string;
    backgroundColor?: string;
    image?: string;
    mainColor?: string;
  };
};

/**
 * Represents a player in the game
 */
export type Player = {
  id: string;
  name: string;
  position: string;
  rating: number;
  teamId: string;
};

/**
 * Represents a complete team in the game
 */
export type Team = {
  id: string;
  name: string;
  logo: TeamLogo;
  attributes: TeamAttributes;
  tactic: TeamTactic;
  formation: Formation;
  points: number;
  players: Player[];
  userId: string;
  isBot: boolean;
  teamStats: TeamStats;
};

/**
 * Represents a team's statistics
 */
export type TeamStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  form: ('W' | 'L' | 'D')[];
};
