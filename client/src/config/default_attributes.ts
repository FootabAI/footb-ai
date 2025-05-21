import { TeamAttributes, TeamStats } from "@/types";

export const DEFAULT_ATTRIBUTES: TeamAttributes = {
  passing: 40,
  shooting: 40,
  pace: 40,
  dribbling: 40,
  defending: 40,
  physicality: 40,
};

export const TOTAL_POINTS = 60;

export const DEFAULT_TEAM_STATS: TeamStats = {
  totalMatches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsScored: 0,
  goalsConceded: 0,
  cleanSheets: 0,
};