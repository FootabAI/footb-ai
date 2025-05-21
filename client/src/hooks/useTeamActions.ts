import { useTeamStore } from "@/stores/useTeamStore";
import { useToast } from "@/hooks/use-toast";
import { TeamTactic, Formation } from "@/types";

export const useTeamActions = () => {
  const { updateTeamTactic, updateTeamFormation } = useTeamStore();
  const { toast } = useToast();

  const handleSaveTactic = (tactic: TeamTactic) => {
    updateTeamTactic(tactic);
    toast({
      title: "Tactic Updated",
      description: `Your team now uses the ${tactic} tactic.`,
    });
  };

  const handleFormationChange = (formation: Formation) => {
    updateTeamFormation(formation);
    toast({
      title: "Formation Updated",
      description: `Your team now uses the ${formation} formation.`,
    });
  };

  return {
    handleSaveTactic,
    handleFormationChange,
  };
}; 