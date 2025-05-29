import { Shield, Sword, ShieldHalf, ArrowRight, Flame, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamAttributesForm from '@/components/TeamAttributesForm';
import { TeamAttributes, TeamTactic } from '@/types';
import { useTeamStore } from '@/stores/useTeamStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { TacticSelect } from "@/components/TacticSelect";

interface AttributesStepProps {
  attributes: TeamAttributes;
  onAttributeChange: (attr: keyof TeamAttributes, newValue: number) => void;
  tactic: TeamTactic;
  onTacticChange: (tactic: TeamTactic) => void;
  totalPoints: number;
  pointsLeft: number;
}

const tacticIcons = {
  'Balanced': <ShieldHalf className="h-4 w-4" />,
  'Offensive': <Sword className="h-4 w-4" />,
  'Defensive': <Shield className="h-4 w-4" />,
  'Counter-Attacking': <ArrowRight className="h-4 w-4" />,
  'Aggressive': <Flame className="h-4 w-4" />,
  'Possession-Based': <Target className="h-4 w-4" />,
};

export const AttributesStep = ({
  attributes,
  onAttributeChange,
  tactic,
  onTacticChange,
  totalPoints,
  pointsLeft,
}: AttributesStepProps) => {
  const { mainColor } = useOnboardingStore();
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold">Team Attributes</h2>
      
      <TeamAttributesForm
        mainColor={mainColor}
        attributes={attributes}
        onChange={onAttributeChange}
        totalPoints={totalPoints}
        pointsLeft={pointsLeft}
      />
      
      <div className="space-y-2 mt-8">
        <Label htmlFor="tactic">Team Tactic</Label>
        <TacticSelect
          value={tactic}
          onValueChange={onTacticChange}
          className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
        />
      </div>
    </div>
  );
}; 