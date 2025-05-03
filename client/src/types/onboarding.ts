import { TeamAttributes, TeamTactic, Formation, Player } from "@/types";


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
  handleAttributeChange: (attr: keyof TeamAttributes, newValue: number) => void;
  createTeam: (logoData: { image?: string; initials?: string; backgroundColor: string; theme?: string }) => Promise<void>;
  resetTeamCreation: () => void;
  generateRandomPlayers: (teamId: string, teamName: string) => Player[];
};