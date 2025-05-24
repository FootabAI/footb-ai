/**
 * Context-related type definitions
 */

import { Team, Formation, Player, TeamAttributes, TeamTactic } from './team';
import { Match, MatchStats, MatchEvent } from './match';

/**
 * Represents the game context that provides game state and operations
 */
export interface GameContextType {
  userTeam: Team | null;
  currentMatch: Match | null;
  botTeam: Team;
  players: Player[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  selectedFormation: Formation;
  
  // Game operations
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

/**
 * Represents the team creation context that provides team creation state and operations
 */
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

  // Team creation operations
  createTeam: (logoData: { 
    image?: string; 
    initials?: string; 
    backgroundColor: string; 
    theme?: string 
  }) => Promise<void>;
  handleAttributeChange: (attr: keyof TeamAttributes, newValue: number) => void;
  resetTeamCreation: () => void;
  generateRandomPlayers: (teamId: string, teamName: string) => Player[];
} 