/**
 * Match simulation related type definitions
 */

import { MatchEvent, MatchStats } from './match';
import { MatchEventType } from './match';

/**
 * Represents an event received from the server during match simulation
 */
export interface ServerEvent {
  type: "event";
  minute: number;
  event: {
    type: MatchEventType;
    team: string;
    event_description: string;
    audio_url?: string;
  };
  score: {
    home: number;
    away: number;
  };
}

/**
 * Represents a minute update during match simulation
 */
export interface MinuteUpdate {
  type: "minute_update";
  minute: number;
  score: {
    home: number;
    away: number;
  };
}

/**
 * Represents a match event update during simulation
 */
export interface MatchEventUpdate {
  type: "event" | "minute_update";  // Allow both types
  minute: number;
  event: ServerEvent;
  score: {
    home: number;
    away: number;
  };
  stats?: {
    home: MatchStats;
    away: MatchStats;
  };
}

/**
 * Union type for all possible match updates
 */
export type MatchUpdate = ServerEvent | MinuteUpdate;

/**
 * Response type for match simulation API
 */
export interface MatchSimulationResponse {
  matchId: string;
  events: AsyncIterableIterator<MatchUpdate>;
} 