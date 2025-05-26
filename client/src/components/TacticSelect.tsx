import { TeamTactic } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TacticSelectProps {
  value: TeamTactic;
  onValueChange: (value: TeamTactic) => void;
  className?: string;
}

export const TacticSelect = ({ value, onValueChange, className }: TacticSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className || "w-[180px] bg-footbai-container border-footbai-hover"}>
        <SelectValue placeholder="Select tactic" />
      </SelectTrigger>
      <SelectContent className="bg-footbai-container border-footbai-hover">
        <SelectItem value="Tiki-Taka">Tiki-Taka</SelectItem>
        <SelectItem value="Park-The-Bus">Park The Bus</SelectItem>
        <SelectItem value="Direct-Play">Direct Play</SelectItem>
        <SelectItem value="Total-Football">Total Football</SelectItem>
        <SelectItem value="Catenaccio">Catenaccio</SelectItem>
        <SelectItem value="Gegenpressing">Gegenpressing</SelectItem>
      </SelectContent>
    </Select>
  );
}; 