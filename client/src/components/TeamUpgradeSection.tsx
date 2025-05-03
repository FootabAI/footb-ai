import { useState } from "react";
import { useTeamStore } from "@/stores/useTeamStore";
import {
  Zap,
  Target,
  Shield,
  ArrowBigRightDash,
  AlertCircle,
  Plus,
  Minus,
  Move,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const TeamUpgradeSection = () => {
  const { team, updateTeam } = useTeamStore();
  const { toast } = useToast();
  const { updateTeamAttributes } = useTeamStore();
  const [upgradeAmount, setUpgradeAmount] = useState<number>(1);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Team Available</h3>
        <p className="text-gray-400">
          You need to create a team first before you can upgrade attributes.
        </p>
      </div>
    );
  }

  const attributes = [
    {
      key: "passing",
      label: "Passing",
      icon: (
        <Target
          className="h-5 w-5"
          style={{ color: team.logo.data.mainColor }}
        />
      ),
      description: "Determines how accurately your team passes the ball",
    },
    {
      key: "shooting",
      label: "Shooting",
      icon: (
        <Zap className="h-5 w-5" style={{ color: team.logo.data.mainColor }} />
      ),
      description: "Affects the likelihood of shots being on target",
    },
    {
      key: "pace",
      label: "Pace",
      icon: (
        <ArrowBigRightDash
          className="h-5 w-5"
          style={{ color: team.logo.data.mainColor }}
        />
      ),
      description: "Influences how quickly your team moves on the field",
    },
    {
      key: "dribbling",
      label: "Dribbling",
      icon: (
        <Move className="h-5 w-5" style={{ color: team.logo.data.mainColor }} />
      ),
      description: "Controls ball control and dribbling ability",
    },
    {
      key: "defending",
      label: "Defending",
      icon: (
        <Shield
          className="h-5 w-5"
          style={{ color: team.logo.data.mainColor }}
        />
      ),
      description: "Impacts your team's ability to block shots and tackles",
    },
    {
      key: "physicality",
      label: "Physicality",
      icon: (
        <Dumbbell
          className="h-5 w-5"
          style={{ color: team.logo.data.mainColor }}
        />
      ),
      description: "Determines strength and stamina in physical battles",
    },
  ];

  const handleUpgrade = (attributeKey: string) => {
    if (team.points < upgradeAmount) {
      toast({
        title: "Not enough points",
        description: "You don't have enough points for this upgrade.",
        variant: "destructive",
      });
      return;
    }

    const newAttributes = {
      ...team.attributes,
      [attributeKey]: Math.min(
        99,
        team.attributes[attributeKey as keyof typeof team.attributes] +
          upgradeAmount
      ),
    };

    updateTeamAttributes(newAttributes, team.points - upgradeAmount);

    toast({
      title: "Attribute Upgraded",
      description: `Successfully upgraded ${attributeKey} by ${upgradeAmount} points.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-sm font-medium">Points per upgrade:</span>
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-footbai-header bg-footbai-container hover:bg-footbai-hover"
            onClick={() => setUpgradeAmount((prev) => Math.max(1, prev - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="mx-2 font-mono font-bold">{upgradeAmount}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-footbai-header bg-footbai-container hover:bg-footbai-hover"
            onClick={() => setUpgradeAmount((prev) => Math.min(10, prev + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {attributes.map((attribute) => (
          <Card
            key={attribute.key}
            className="p-4 bg-footbai-container border-footbai-header"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {attribute.icon}
                <span className="ml-2 font-semibold">{attribute.label}</span>
              </div>
              <span className="font-mono bg-footbai-header px-2 py-0.5 rounded text-sm">
                {team.attributes[attribute.key as keyof typeof team.attributes]}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              {attribute.description}
            </p>

            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="gap-1 bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                onClick={() => handleUpgrade(attribute.key)}
                disabled={team.points < upgradeAmount}
              >
                <Plus className="h-4 w-4" />
                <span>Upgrade (+{upgradeAmount})</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
