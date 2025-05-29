import { TeamAttributes, TeamTactic, Formation, Player , TeamStats} from "@/types";
import {  } from "./team";

type PlayerGenerationResponse = {
  squad: Array<{
    name: string;
    position: string;
  }>;
  names: string[];
  success: boolean;
};

export type OnboardingState = {
  // Team creation state
  teamName: string;
  logoType: 'manual' | 'ai';
  initials: string;
  backgroundColor: string;
  formation: Formation;
  customizedName: string;
  themeTags: string[];
  colorTags: string[];
  attributes: TeamAttributes;
  tactic: TeamTactic;
  pointsLeft: number;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  teamId: string;
  mainColor: string;
  teamStats: TeamStats | null;
  nationality: string;

  // Actions
  setTeamName: (name: string) => void;
  setLogoType: (type: 'manual' | 'ai') => void;
  setInitials: (initials: string) => void;
  setBackgroundColor: (color: string) => void;
  setFormation: (formation: Formation) => void;
  setCustomizedName: (name: string) => void;
  setTeamId: (id: string) => void;
  setThemeTags: (tags: string[]) => void;
  setColorTags: (tags: string[]) => void;
  setTactic: (tactic: TeamTactic) => void;
  setMainColor: (color: string) => void;
  setNationality: (nationality: string) => void;
  handleAttributeChange: (attr: keyof TeamAttributes, newValue: number) => void;
  createTeam: (logoData: { image?: string; initials?: string; backgroundColor: string; theme?: string }, teamStats: TeamStats, attributes: TeamAttributes, tactic: TeamTactic, formation: Formation) => Promise<void>;
  resetTeamCreation: () => void;
  generateRandomPlayers: (teamId: string, teamName: string) => Player[];
  generatePlayers: (nationality: string, withPositions: boolean) => Promise<PlayerGenerationResponse>;
};