/**
 * Match-related type definitions
 */

import { Team } from "./team";

/**
 * Types of events that can occur during a match
 */
export type MatchEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "injury"
  | "substitution"
  | "own_goal"
  | "half_time"
  | "full_time"
  | "half-time" // For backward compatibility
  | "full-time" // For backward compatibility
  | "own-goal"; // For backward compatibility

/**
 * Represents an event that occurs during a match
 */
export interface MatchEvent {
  type: string;
  minute: number;
  event: {
    team: string;
    type: string;
    event_description: string;  // Formal, factual description for UI display
    audio_url?: string;        // Engaging, human-like text for future TTS use
  };
  score: {
    home: number;
    away: number;
  };
  stats: {
    home: {
      shots: number;
      shotsOnTarget: number;
      yellowCards: number;
      redCards: number;
    };
    away: {
      shots: number;
      shotsOnTarget: number;
      yellowCards: number;
      redCards: number;
    };
  };
}

/**
 * Represents the statistics for a team during a match
 */
export interface MatchStats {
  goalsScored: number;
  goalsConceded: number;
  wins: number;
  losses: number;
  draws: number;
  cleanSheets: number;
  totalMatches: number;
  form: string[];
  shots?: number;
  shotsOnTarget?: number;
  yellowCards?: number;
  redCards?: number;
}

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
