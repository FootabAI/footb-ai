import { TeamTactic } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Target,
  ArrowUpDown,
  ArrowUpFromLine,
  ArrowRightLeft,
  Bus,
} from "lucide-react";

interface TacticSelectProps {
  value: TeamTactic;
  onValueChange: (value: TeamTactic) => void;
  className?: string;
}

const tacticIcons = {
  "Tiki-Taka": <ArrowRightLeft className="h-4 w-4" />,
  "Park-The-Bus": <Bus className="h-4 w-4" />,
  "Direct-Play": <ArrowUpFromLine className="h-4 w-4" />,
  "Total-Football": <ArrowUpDown className="h-4 w-4" />,
  Catenaccio: <Shield className="h-4 w-4" />,
  Gegenpressing: <Target className="h-4 w-4" />,
};

export const TacticSelect = ({
  value,
  onValueChange,
  className,
}: TacticSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={
          className || "w-[180px] bg-footbai-container border-footbai-hover"
        }
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {tacticIcons[value]}
            <span>{value}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-footbai-container border-footbai-hover">
        {Object.entries(tacticIcons).map(([tactic, icon]) => (
          <SelectItem key={tactic} value={tactic}>
            <div className="flex items-center gap-2">
              {icon}
              <span>{tactic}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
