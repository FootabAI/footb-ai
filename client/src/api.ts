import { Formation, Match, Team, TeamTactic } from "./types";

export const API_URL = "http://127.0.0.1:8000";

// Types for match simulation
export interface MatchEvent {
  minute: number;
  event: {
    type: string;
    team: string;
    description: string;
  };
  score: {
    home: number;
    away: number;
  };
  stats?: {
    home: {
      possession: number;
      shots: number;
      shotsOnTarget: number;
      passes: number;
      passAccuracy: number;
      fouls?: number;
      yellowCards?: number;
      redCards?: number;
    };
    away: {
      possession: number;
      shots: number;
      shotsOnTarget: number;
      passes: number;
      passAccuracy: number;
      fouls?: number;
      yellowCards?: number;
      redCards?: number;
    };
  };
}

export interface MatchSimulationResponse {
  match_id: string;
  events: AsyncIterable<MatchEvent>;
}

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

export const startMatchSimulation = async (
  matchId: string,
  userTeam: Team,
  opponentTeam: Team,
  debugMode: boolean = false
): Promise<MatchSimulationResponse> => {
  const response = await fetch(`${API_URL}/api/simulate-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      user_team: userTeam.name,
      opponent_team: opponentTeam.name,
      debug_mode: debugMode,
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

  return {
    match_id: matchId,
    events: {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const { done, value } = await reader.read();
            if (done) {
              return { done: true, value: undefined };
            }

            const text = new TextDecoder().decode(value);
            const events = text.split('\n').filter(Boolean);
            
            if (events.length === 0) {
              return { done: false, value: null };
            }

            try {
              const event = JSON.parse(events[0]);
              return { done: false, value: event };
            } catch (e) {
              console.error('Error parsing event:', e);
              return { done: false, value: null };
            }
          }
        };
      }
    }
  };
};

export const changeTeamTactics = async (
  matchId: string,
  tactic: TeamTactic,
  formation: Formation
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/change-team-tactic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      tactic,
      formation,
    }),
  });
  console.log(response);

  if (!response.ok) {
    throw new Error('Failed to change team tactics');
  }
};

export const continueMatch = async (
  matchId: string
): Promise<MatchSimulationResponse> => {
  const response = await fetch(`${API_URL}/api/continue-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
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

  return {
    match_id: matchId,
    events: {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const { done, value } = await reader.read();
            if (done) {
              return { done: true, value: undefined };
            }

            const text = new TextDecoder().decode(value);
            const events = text.split('\n').filter(Boolean);
            
            if (events.length === 0) {
              return { done: false, value: null };
            }

            try {
              const event = JSON.parse(events[0]);
              return { done: false, value: event };
            } catch (e) {
              console.error('Error parsing event:', e);
              return { done: false, value: null };
            }
          }
        };
      }
    }
  };
};
