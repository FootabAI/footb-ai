import { Formation, Match, Team, TeamTactic, MatchStats} from "./types";
import { MatchEventUpdate, MatchSimulationResponse, MatchUpdate } from './types/match-simulation';

export const API_URL = "http://127.0.0.1:8000";

// Helper function to ensure audio URLs are absolute
const ensureAbsoluteUrl = (url: string | undefined | null) => {
  if (url === null || url === undefined) return null;
  if (url.startsWith('http')) return url;
  // Handle both /audio/ and audio/ paths
  if (url.startsWith('/audio/')) {
    return `${API_URL}${url}`;
  }
  return `${API_URL}/audio/${url}`;
};

// Types
type PlayerGenerationResponse = {
  player: {
    name: string;
    position?: string;
  };
  success: boolean;
};

type PlayerImageResponse = {
  player: {
    name: string;
    position: string;
    image_base64: string;
    attributes?: {
      ethnicity: string;
      hair_color: string;
      hair_style: string;
      age: string;
    };
    error?: string;
  };
  success: boolean;
};

type PlayerNameStream = AsyncIterableIterator<PlayerGenerationResponse>;
type PlayerImageStream = AsyncIterableIterator<PlayerImageResponse>;

// Helper function to create a streaming iterator
const createStreamIterator = <T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  parseData: (line: string) => T | null
): AsyncIterableIterator<T> => {
  let buffer = '';
  
  return {
    async next() {
      const { done, value } = await reader.read();
      if (done) {
        return { done: true, value: undefined };
      }

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = parseData(line);
            if (data) {
              return { done: false, value: data };
            }
          } catch (e) {
            console.error('Error parsing data:', e);
            continue;
          }
        }
      }
      return { done: false, value: null };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
};

// Club Logo Generation
export const create_club_logo = async (themes: string[], colors: string[]) => {
  const response = await fetch(`${API_URL}/create_club_logo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      themes,
      colors,
    }),
  });
  console.log(response);
  return response.json();
};

// Player Name Generation
export const streamPlayerNames = async (nationality: string, withPositions: boolean): Promise<PlayerNameStream> => {
  const response = await fetch(`${API_URL}/api/generate_player_names`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nationality,
      withPositions,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start player name generation');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  return createStreamIterator<PlayerGenerationResponse>(
    reader,
    (line) => JSON.parse(line) as PlayerGenerationResponse
  );
};

// Player Image Generation
export const streamPlayerImage = async (player: { name: string; position: string }): Promise<PlayerImageStream> => {
  const response = await fetch(`${API_URL}/api/generate_player_image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ player }),
  });

  if (!response.ok) {
    throw new Error('Failed to start player image generation');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  return createStreamIterator<PlayerImageResponse>(
    reader,
    (line) => JSON.parse(line) as PlayerImageResponse
  );
};

interface MatchEventIterator extends AsyncIterableIterator<MatchUpdate> {
  remainingEvents: MatchUpdate[];
}

// Match Simulation
export const startMatchSimulationNew = async (
  matchId: string,
  userTeam: Team,
  opponentTeam: Team
): Promise<MatchSimulationResponse> => {
  const response = await fetch(`${API_URL}/api/simulate-match-new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      user_team: {
        name: userTeam.name,
        attributes: userTeam.attributes,
        tactic: userTeam.tactic.toLowerCase(),
        formation: userTeam.formation,
        teamStats: userTeam.teamStats
      },
      opponent_team: {
        name: opponentTeam.name,
        attributes: opponentTeam.attributes,
        tactic: opponentTeam.tactic.toLowerCase(),
        formation: opponentTeam.formation,
        teamStats: opponentTeam.teamStats
      }
    }),
  });
  console.log(response);
  if (!response.ok) {
    throw new Error('Failed to start match');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const iterator: MatchEventIterator = {
    remainingEvents: [],
    async next(): Promise<IteratorResult<MatchUpdate>> {
      // If we have remaining events, return the next one
      if (this.remainingEvents.length > 0) {
        const event = this.remainingEvents.shift()!;
        return { done: false, value: event };
      }

      const { done, value } = await reader.read();
      if (done) {
        return { done: true, value: undefined };
      }

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n').filter(Boolean);
      
      if (lines.length === 0) {
        return { done: false, value: null };
      }

      try {
        // Parse the batch of events
        const batch = JSON.parse(lines[0]).batch;
        if (Array.isArray(batch) && batch.length > 0) {
          // Return the first event from the batch
          const event = batch[0];
          // Store remaining events for next iteration
          this.remainingEvents = batch.slice(1);
          return { done: false, value: event };
        }
        return { done: false, value: null };
      } catch (e) {
        console.error('Error parsing event:', e);
        return { done: false, value: null };
      }
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };

  return {
    matchId: matchId,
    events: iterator
  };
};

export const continueMatch = async (
  matchId: string,
  userTeam: Team,
  opponentTeam: Team,
  tactic?: TeamTactic,
  formation?: Formation,
  currentScore?: { home: number; away: number },
  currentStats?: { home: MatchStats; away: MatchStats }
): Promise<MatchSimulationResponse> => {
  const response = await fetch(`${API_URL}/api/continue-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      home_team_name: userTeam.name,
      away_team_name: opponentTeam.name,
      home_attrs: userTeam.attributes,
      away_attrs: opponentTeam.attributes,
      home_tactic: (tactic || userTeam.tactic).toLowerCase(),
      away_tactic: opponentTeam.tactic.toLowerCase(),
      formation: formation || userTeam.formation,
      current_score: currentScore,
      current_stats: currentStats
    }),
  });
  console.log(response);
  if (!response.ok) {
    throw new Error('Failed to continue match');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const iterator: MatchEventIterator = {
    remainingEvents: [],
    async next(): Promise<IteratorResult<MatchUpdate>> {
      // If we have remaining events, return the next one
      if (this.remainingEvents.length > 0) {
        const event = this.remainingEvents.shift()!;
        return { done: false, value: event };
      }

      const { done, value } = await reader.read();
      if (done) {
        return { done: true, value: undefined };
      }

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n').filter(Boolean);
      
      if (lines.length === 0) {
        return { done: false, value: null };
      }

      try {
        // Parse the batch of events
        const batch = JSON.parse(lines[0]).batch;
        if (Array.isArray(batch) && batch.length > 0) {
          // Return the first event from the batch
          const event = batch[0];
          // Store remaining events for next iteration
          this.remainingEvents = batch.slice(1);
          return { done: false, value: event };
        }
        return { done: false, value: null };
      } catch (e) {
        console.error('Error parsing event:', e);
        return { done: false, value: null };
      }
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };

  return {
    matchId: matchId,
    events: iterator
  };
};
