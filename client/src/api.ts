import { Formation, Match, Team, TeamTactic } from "./types";
import { MatchEventUpdate, MatchSimulationResponse } from './types/match-simulation';

export const API_URL = "http://127.0.0.1:8000";

// Helper function to ensure audio URLs are absolute
const ensureAbsoluteUrl = (url: string | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

type PlayerGenerationResponse = {
  squad: Array<{
    name: string;
    position: string;
  }>;
  names: string[];
  success: boolean;
};

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

export const generatePlayerNames = async (nationality: string, withPositions: boolean): Promise<PlayerGenerationResponse> => {
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
  return response.json();
};

export const startMatchSimulation = async (
  matchId: string,
  userTeam: Team,
  opponentTeam: Team
): Promise<MatchSimulationResponse> => {
  const response = await fetch(`${API_URL}/api/simulate-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      match_id: matchId,
      user_team: {
        name: userTeam.name,
        attributes: userTeam.attributes,
        tactic: userTeam.tactic,
        formation: userTeam.formation,
        teamStats: userTeam.teamStats
      },
      opponent_team: {
        name: opponentTeam.name,
        attributes: opponentTeam.attributes,
        tactic: opponentTeam.tactic,
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
              // Ensure audio URL is absolute
              if (event.event?.audio_url) {
                event.event.audio_url = ensureAbsoluteUrl(event.event.audio_url);
              }
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
  console.log("Changing tactics:", { matchId, tactic, formation });
  
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
  
  const data = await response.json();
  console.log("Tactics change response:", data);

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
              // Ensure audio URL is absolute
              if (event.event?.audio_url) {
                event.event.audio_url = ensureAbsoluteUrl(event.event.audio_url);
              }
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
