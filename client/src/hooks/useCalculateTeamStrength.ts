import { Team } from "@/types";

export const useCalculateTeamStrength = (team: Team) => {
  const {
    passing,
    shooting,
    pace,
    dribbling,
    defending,
      physicality,
    } = team.attributes;
    return Math.round(
      (passing + shooting + pace + dribbling + defending + physicality) / 6
    );
  };