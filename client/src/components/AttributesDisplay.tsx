import { TeamAttributes } from '@/contexts/GameContext';
import StatBar from './StatBar';

type AttributesDisplayProps = {
  attributes: TeamAttributes;
  teamColor?: string;
};

const AttributesDisplay = ({
  attributes,
  teamColor = "#62df6e"
}: AttributesDisplayProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-3">
        <StatBar
          label="Passing"
          value={attributes.passing}
          color={teamColor}
        />
        <StatBar
          label="Shooting"
          value={attributes.shooting}
          color={teamColor}
        />
        <StatBar
          label="Pace"
          value={attributes.pace}
          color={teamColor}
        />
      </div>
      <div className="space-y-3">
        <StatBar
          label="Dribbling"
          value={attributes.dribbling}
          color={teamColor}
        />
        <StatBar
          label="Defending"
          value={attributes.defending}
          color={teamColor}
        />
        <StatBar
          label="Physicality"
          value={attributes.physicality}
          color={teamColor}
        />
      </div>
    </div>
  );
};

export default AttributesDisplay;