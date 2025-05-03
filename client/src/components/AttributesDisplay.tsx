import { TeamAttributes } from "@/types";
import StatBar from "./StatBar";

type AttributesDisplayProps = {
  attributes: TeamAttributes;
  teamColor?: string;
  layout?: "single" | "grid";
};

const AttributesDisplay = ({
  attributes,
  teamColor = "#62df6e",
  layout = "single",
}: AttributesDisplayProps) => {
  const statBars = [
    { label: "Passing", value: attributes.passing },
    { label: "Shooting", value: attributes.shooting },
    { label: "Pace", value: attributes.pace },
    { label: "Dribbling", value: attributes.dribbling },
    { label: "Defending", value: attributes.defending },
    { label: "Physicality", value: attributes.physicality },
  ];

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          {statBars.slice(0, 3).map((stat) => (
            <StatBar
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={teamColor}
            />
          ))}
        </div>
        <div className="space-y-3">
          {statBars.slice(3).map((stat) => (
            <StatBar
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={teamColor}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {statBars.map((stat) => (
        <StatBar
          key={stat.label}
          label={stat.label}
          value={stat.value}
          color={teamColor}
        />
      ))}
    </div>
  );
};

export default AttributesDisplay;
