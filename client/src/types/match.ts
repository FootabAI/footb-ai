/**
 * Match-related type definitions
 */

import { Team } from './team';

/**
 * Types of events that can occur during a match
 */
export type MatchEventType = 
  | 'goal' 
  | 'yellow_card' 
  | 'red_card' 
  | 'injury' 
  | 'substitution' 
  | 'own_goal' 
  | 'half_time' 
  | 'full_time'
  | 'half-time'  // For backward compatibility
  | 'full-time'  // For backward compatibility
  | 'own-goal';  // For backward compatibility

/**
 * Represents an event that occurs during a match
 */
export interface MatchEvent {
  id: string;
  type: MatchEventType;
  team: string;
  description: string;
  minute: number;
  commentary: string;
  audio_url?: string;  // Optional audio URL for TTS commentary
}

/**
 * Represents the statistics for a team during a match
 */
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

/**
 * Represents a complete match between two teams
 */
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