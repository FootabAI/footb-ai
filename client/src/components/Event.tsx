import { MatchEvent } from "@/types";
import { Goal, AlertCircle, ArrowUpRight, Clock } from "lucide-react";

interface EventProps {
  event: MatchEvent;
  formatMatchTime: (minutes: number) => string;
  userTeamId: string;
}

const Event = ({ event, formatMatchTime, userTeamId }: EventProps) => {
  const isUserTeam = event.teamId === userTeamId;

  const getEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case "goal":
        return <Goal className={`w-5 h-5 ${isUserTeam ? "text-green-500" : "text-red-500"}`} />;
      case "yellow_card":
        return <div className="w-4 h-5 bg-yellow-500 rounded-sm" />;
      case "red_card":
        return <div className="w-4 h-5 bg-red-500 rounded-sm" />;
      case "injury":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "substitution":
        return <ArrowUpRight className="w-5 h-5 text-blue-500" />;
      case "own-goal":
        return <Goal className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventBorderColor = (event: MatchEvent) => {
    if (event.teamId === "system") {
      return "border-gray-700";
    }

    switch (event.type) {
      case "goal":
        return isUserTeam ? "border-green-500" : "border-red-500";
      case "yellow_card":
        return "border-yellow-500";
      case "red_card":
        return "border-red-500";
      case "injury":
        return "border-red-500";
      case "substitution":
        return "border-blue-500";
      case "own-goal":
        return "border-purple-500";
      default:
        return "border-gray-700";
    }
  };

  const getEventBgColor = (event: MatchEvent) => {
    if (event.teamId === "system") {
      return "bg-footbai-header";
    }

    switch (event.type) {
      case "goal":
        return isUserTeam ? "bg-green-700/10" : "bg-red-700/10";
      case "yellow_card":
        return "bg-yellow-700/10";
      case "red_card":
        return "bg-red-700/10";
      case "injury":
        return "bg-red-700/10";
      case "substitution":
        return "bg-blue-700/10";
      case "own-goal":
        return "bg-purple-700/10";
      default:
        return "bg-footbai-header";
    }
  };

  const getEventTextColor = (event: MatchEvent) => {
    if (event.teamId === "system") {
      return "text-gray-300";
    }
    switch (event.type) {
      case "goal":
        return isUserTeam ? "text-green-400" : "text-red-400";
      case "yellow_card":
        return "text-yellow-400";
      case "red_card":
        return "text-red-400";
      case "injury":
        return "text-red-400";
      case "substitution":
        return "text-blue-400";
      case "own-goal":
        return "text-purple-400";
      default:
        return "text-white";
    }
  };

  return (
    <div
      className={`p-3 rounded-lg ${getEventBgColor(
        event
      )} border-l-4 ${getEventBorderColor(event)} animate-fade-in`}
    >
      <div className="flex items-start">
        <div className="bg-footbai-container px-2 py-1 rounded mr-3 text-xs font-medium">
          {formatMatchTime(event.minute)}
        </div>
        <div className="flex-1 flex items-start">
          <span className="mt-0.5 mr-2">{getEventIcon(event)}</span>
          <p className={getEventTextColor(event)}>{event.description}</p>
        </div>
      </div>
    </div>
  );
};

export default Event; 