import { Button } from '@/components/ui/button';
import TeamLogo from '@/components/TeamLogo';
import AttributesDisplay from '@/components/AttributesDisplay';

interface SummaryStepProps {
  onBack: () => void;
  onCreateTeam: () => void;
  teamName: string;
  initials: string;
  backgroundColor: string;
  attributes: {
    passing: number;
    shooting: number;
    pace: number;
    dribbling: number;
    defending: number;
    physicality: number;
  };
  tactic: string;
  logoType: 'manual' | 'ai';
  generatedLogo?: string;
}

export const SummaryStep = ({
  onBack,
  onCreateTeam,
  teamName,
  initials,
  backgroundColor,
  attributes,
  tactic,
  logoType,
  generatedLogo,
}: SummaryStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold">Team Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-footbai-header p-4 rounded-lg">
            <h3 className="text-footbai-accent font-medium mb-2">Team Info</h3>
            <div className="flex items-center space-x-4">
              {logoType === 'manual' ? (
                <TeamLogo 
                  logo={{ 
                    initials, 
                    backgroundColor, 
                  }} 
                  size="lg" 
                />
              ) : (
                <img 
                  src={generatedLogo} 
                  alt="Generated Logo" 
                  className="w-16 h-16 object-contain rounded-full bg-transparent"
                />
              )}
              <div>
                <p className="font-bold text-lg">{teamName}</p>
                <p className="text-sm text-gray-400">{tactic} Tactic</p>
              </div>
            </div>
          </div>
          
          <div className="bg-footbai-header p-4 rounded-lg">
            <h3 className="text-footbai-accent font-medium mb-3">Team Attributes</h3>
            <AttributesDisplay 
              attributes={attributes} 
              teamColor={backgroundColor} 
            />
          </div>
        </div>
        
        <div className="bg-footbai-header p-4 rounded-lg">
          <h3 className="text-footbai-accent font-medium mb-3">Starting Benefits</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
              Initial team with 11 players
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
              100 points to use for upgrades
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
              Access to 1 opponent for matches
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
              Full match simulation experience
            </li>
          </ul>
          
          <div className="mt-8 p-3 bg-black/30 rounded border border-footbai-accent/30">
            <p className="text-sm text-footbai-accent">
              Ready to start your journey? Create your team and begin playing matches!
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline" className="border-footbai-header hover:bg-footbai-hover">
          Back
        </Button>
        <Button 
          onClick={onCreateTeam}
          className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium"
        >
          Create Team
        </Button>
      </div>
    </div>
  );
}; 