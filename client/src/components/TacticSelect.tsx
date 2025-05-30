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
        <SelectItem value="tiki-taka">Tiki-Taka</SelectItem>
        <SelectItem value="park-the-bus">Park The Bus</SelectItem>
        <SelectItem value="direct-play">Direct Play</SelectItem>
        <SelectItem value="total-football">Total Football</SelectItem>
        <SelectItem value="catenaccio">Catenaccio</SelectItem>
        <SelectItem value="gegenpressing">Gegenpressing</SelectItem>
      </SelectContent>
    </Select>
  );
}; 