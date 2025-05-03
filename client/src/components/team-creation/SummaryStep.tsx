import { Button } from '@/components/ui/button';
import TeamLogo from '@/components/TeamLogo';
import AttributesDisplay from '@/components/AttributesDisplay';
import { FormationDisplay } from './FormationSelector';
import { TeamAttributes, TeamTactic, Player } from '@/types';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useCalculateTeamStrength } from '@/hooks/useCalculateTeamStrength';

interface SummaryStepProps {
  teamName: string;
  initials: string;
  backgroundColor: string;
  attributes: TeamAttributes;
  players: Player[];
  tactic: TeamTactic;
  logoType: 'manual' | 'ai';
  generatedLogo: string;
}

export const SummaryStep = ({
  teamName,
  initials,
  backgroundColor,
  attributes,
  tactic,
  logoType,
  generatedLogo,
}: SummaryStepProps) => {
  const { formation } = useOnboardingStore();
  const teamScore = useCalculateTeamStrength(attributes);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Team Summary</h2>
      <div className="mt-2 flex items-center space-x-2">
        <span className="text-sm text-gray-400">Overall Rating:</span>
        <span className="text-lg font-bold" style={{ color: backgroundColor }}>
          {teamScore}
        </span>
      </div>

      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-footbai-header p-4 rounded-lg">
            <h3 className="text-white/70 font-medium mb-2">Team Info</h3>
            <div className="flex items-center space-x-4">
              <TeamLogo 
                logo={{
                  type: logoType,
                  data: logoType === 'manual' 
                    ? { initials, backgroundColor }
                    : { image: generatedLogo }
                }}
                size="lg"
              />
              <div>
                <p className="font-bold text-lg">{teamName}</p>
                <p className="text-sm text-gray-400">{tactic} Tactic</p>
                
              </div>
            </div>
          </div>
          
          <div className="bg-footbai-header p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-white/70 font-medium mb-3">Team Formation</h3>
              <p className="text-sm text-gray-400 font-bold">{formation}</p>
            </div>
            <FormationDisplay formation={formation} size="small" />
          </div>
        </div>
        
        <div className="bg-footbai-header p-4 rounded-lg">
          <h3 className="text-white/70 font-medium mb-4">Team Attributes</h3>
          <AttributesDisplay 
            layout="single"
            attributes={attributes} 
            teamColor={backgroundColor} 
          />
        </div>
      </div>
    </div>
  );
}; 