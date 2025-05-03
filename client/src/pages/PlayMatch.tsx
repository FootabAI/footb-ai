import { useNavigate } from "react-router-dom";
import { useTeamStore } from "@/stores/useTeamStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TeamLogo from "@/components/TeamLogo";
import AttributesDisplay from "@/components/AttributesDisplay";
import { Play, Info } from "lucide-react";
import { useCalculateTeamStrength } from "@/hooks/useCalculateTeamStrength";
import { useGameStore } from "@/stores/useGameStore";
const PlayMatch = () => {
  const navigate = useNavigate();
  const { team } = useTeamStore();
  const calculateTeamStrength = useCalculateTeamStrength(team);
  const { botTeam, setupMatch } = useGameStore();
  if (!team) return null;

  const handlePlayMatch = (opponent: typeof botTeam) => {
    console.log('Starting match against:', opponent.name);
    setupMatch(opponent);
    console.log('Navigating to simulation');
    navigate("/simulation");
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Play Match</h1>
        <p className="text-gray-400">Select an opponent and simulate a match</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* My Team Card */}
        <Card className="lg:col-span-1 bg-footbai-container border-footbai-header">
          <CardHeader className="bg-footbai-header">
            <CardTitle className="flex items-center gap-3">
              <TeamLogo logo={team.logo} size="md" />
              <div>
                <h2 className="text-lg font-semibold">{team.name}</h2>
                <p className="text-sm text-gray-400">
                  {team.tactic} Tactic
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-gray-400">Team Rating</div>
                <div className="text-3xl font-bold text-footbai-accent">
                  {calculateTeamStrength}
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-footbai-header" />

            <h3 className="text-footbai-accent font-medium mb-4">
              Team Attributes
            </h3>
            <AttributesDisplay
              attributes={team.attributes}
              teamColor={team.logo.backgroundColor}
            />
          </CardContent>
        </Card>

        {/* Opponents section */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Available Opponents</h2>

          {/* Bot team */}
          <Card className="mb-4 bg-footbai-container border-footbai-header">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <TeamLogo logo={botTeam.logo} size="md" />
                  <div>
                    <h3 className="font-semibold text-lg">{botTeam.name}</h3>
                    <p className="text-sm text-gray-400">
                      {botTeam.tactic} Tactic
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-footbai-header px-2 py-0.5 rounded text-xs">
                        Rating: {calculateTeamStrength}
                      </span>
                      <span className="bg-footbai-header px-2 py-0.5 rounded text-xs">
                        Bot Opponent
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                  onClick={() => handlePlayMatch(botTeam)}
                >
                  <Play size={16} className="mr-2" />
                  Play Match
                </Button>
              </div>
            </CardContent>
            <Separator className="bg-footbai-header" />
            <CardContent className="p-5">
              <h4 className="text-sm font-medium text-footbai-accent mb-3">
                Opponent Attributes
              </h4>
              <AttributesDisplay
                attributes={botTeam.attributes}
                teamColor={botTeam.logo.backgroundColor}
              />
            </CardContent>
            <CardFooter className="bg-footbai-header px-5 py-3">
              <div className="flex items-center text-xs text-gray-400">
                <Info size={14} className="mr-2" />
                Matches against bot opponents are always available
              </div>
            </CardFooter>
          </Card>

          {/* Coming soon card */}
          <Card className="bg-footbai-container/50 border-dotted border-2 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">
                  Online Opponents Coming Soon
                </div>
                <p className="text-xs text-gray-600">
                  Future updates will include more opponents with different
                  tactics and strengths
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlayMatch;
