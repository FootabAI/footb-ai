import { Shield, Sword, ShieldHalf, ArrowRight, Flame, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamAttributesForm from '@/components/TeamAttributesForm';
import { TeamAttributes, TeamTactic } from '@/types';

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
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold">Team Attributes</h2>
      
      <TeamAttributesForm
        attributes={attributes}
        onChange={onAttributeChange}
        totalPoints={totalPoints}
        pointsLeft={pointsLeft}
      />
      
      <div className="space-y-2 mt-8">
        <Label htmlFor="tactic">Team Tactic</Label>
        <Select value={tactic} onValueChange={onTacticChange}>
          <SelectTrigger id="tactic" className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent">
            <div className="flex items-center gap-2">
              {tactic && tacticIcons[tactic as keyof typeof tacticIcons]}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-footbai-container border-footbai-hover">
            {Object.keys(tacticIcons).map((tacticName) => (
              <SelectItem key={tacticName} value={tacticName} className="flex items-center gap-2">
                <span>{tacticName}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}; 