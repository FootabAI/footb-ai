import { TeamAttributes } from "@/types";

export const useCalculateTeamStrength = (attributes?: TeamAttributes) => {
  if (!attributes) return 0;
  
  const {
    passing,
    shooting,
    pace,
    dribbling,
    defending,
    physicality,
  } = attributes;
  
  return Math.round(
    (passing + shooting + pace + dribbling + defending + physicality) / 6
  );
};