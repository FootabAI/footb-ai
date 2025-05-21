export type MatchEventType = "goal" | "yellow_card" | "red_card" | "injury" | "substitution" | "own-goal" | "half-time" | "full-time";

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  teamId: string;
  description: string;
}

export type TeamTactic = "Balanced" | "Offensive" | "Defensive" | "Counter-Attacking" | "Aggressive" | "Possession-Based";

export interface Team {
  id: string;
  name: string;
  logo: string;
  tactic: TeamTactic;
}

export interface Match {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeStats: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passAccuracy: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
  awayStats: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
    passes: number;
    passAccuracy: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
}
