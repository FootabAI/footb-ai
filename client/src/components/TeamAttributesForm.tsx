import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Shield,
  Zap,
  ArrowRight,
  Dribbble,
  Target,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

type TeamAttributesFormProps = {
  attributes: {
    passing: number;
    shooting: number;
    pace: number;
    dribbling: number;
    defending: number;
    physicality: number;
  };
  mainColor: string;
  onChange: (attr: string, value: number) => void;
  totalPoints: number;
  pointsLeft: number;
  canUpgrade?: boolean;
};

const TeamAttributesForm = ({
  mainColor,
  attributes,
  onChange,
  totalPoints,
  pointsLeft,
  canUpgrade = false,
}: TeamAttributesFormProps) => {
  const attributeIcons = {
    passing: Shield,
    shooting: Target,
    pace: ArrowRight,
    dribbling: Dribbble,
    defending: Shield,
    physicality: Dumbbell,
  };

  return (
    <div className="space-y-6">
      <div className="bg-footbai-header p-3 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <span>Points left to allocate:</span>
          <span
            className={`font-bold ${
              pointsLeft === 0 ? "text-red-500" : "text-footbai-accent"
            }`}
          >
            {pointsLeft} points left
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Allocate points to different attributes below
        </p>
      </div>

      <div className="space-y-6">
        {(Object.keys(attributes) as Array<keyof typeof attributes>).map(
          (attr) => {
            const IconComponent = attributeIcons[attr];
            return (
              <div key={attr} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <IconComponent
                      className="h-4 w-4 text-footbai-accent"
                      style={{ color: mainColor }}
                    />
                    <Label htmlFor={attr} className="capitalize">
                      {attr}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{attributes[attr]}</span>
                    {canUpgrade && pointsLeft > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-footbai-accent"
                        onClick={() => onChange(attr, attributes[attr] + 1)}
                      >
                        <span className="sr-only">Increase {attr}</span>
                        <Zap className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Slider
                  id={attr}
                  min={1}
                  color={mainColor}
                  max={99}
                  step={1}
                  value={[attributes[attr]]}
                  onValueChange={(value) => onChange(attr, value[0])}
                  className="cursor-pointer"
                  disabled={pointsLeft === 0 && attributes[attr] === 1}
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default TeamAttributesForm;
