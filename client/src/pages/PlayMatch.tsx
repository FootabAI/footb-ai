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
import { useBotTeamStore } from "@/stores/useBotTeamStore";

const PlayMatch = () => {
  const navigate = useNavigate();
  const { team } = useTeamStore();
  const calculateTeamStrength = useCalculateTeamStrength(team?.attributes);
  const { setupMatch } = useGameStore();
  const { botTeams, isLoading: isLoadingBotTeams } = useBotTeamStore();

  if (!team || isLoadingBotTeams) return null;

  const handlePlayMatch = (opponent: typeof botTeams[0]) => {
    console.log("Starting match against:", opponent.name);
    setupMatch(opponent);
    console.log("Navigating to simulation");
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
        <Card className="lg:col-span-3 bg-footbai-container border-footbai-header">
          <CardHeader className="bg-footbai-header">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamLogo logo={team.logo} size="md" />
                <div>
                  <h2 className="text-lg font-semibold">{team.name}</h2>
                  <p className="text-sm text-gray-400">{team.tactic} Tactic</p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-sm text-gray-400">Team Rating</div>
                <div className="text-3xl font-bold text-footbai-accent">
                  {calculateTeamStrength}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <h3 className="text-white font-medium mb-4">Team Attributes</h3>
            <AttributesDisplay
              layout="grid"
              attributes={team.attributes}
              teamColor={team.logo.data.mainColor}
            />
          </CardContent>
        </Card>

        {/* Opponents section */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Available Opponents</h2>

          {/* Bot teams grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {botTeams.map((botTeam) => (
              <Card
                key={botTeam.id}
                className="bg-footbai-container border-footbai-header"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <TeamLogo logo={botTeam.logo} size="md" />
                        <div>
                          <h3 className="font-semibold text-lg">
                            {botTeam.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {botTeam.tactic} Tactic
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-sm text-gray-400">Team Rating</div>
                        <div className="text-3xl font-bold">
                          {calculateTeamStrength}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="bg-footbai-accent hover:bg-footbai-accent/80 text-black w-full"
                      onClick={() => handlePlayMatch(botTeam)}
                    >
                      <Play size={16} className="mr-2" />
                      Play {botTeam.name}
                    </Button>
                  </div>
                </CardContent>
                <Separator className="bg-footbai-header" />
                <CardContent className="p-5">
                  <h4 className="text-sm font-medium text-white mb-3">
                    Opponent Attributes
                  </h4>
                  <AttributesDisplay
                    layout="grid"
                    attributes={botTeam.attributes}
                    teamColor={botTeam.logo.data.mainColor}
                  />
                </CardContent>
                <CardFooter className="bg-footbai-header px-5 py-3">
                  <div className="flex items-center text-xs text-gray-400">
                    <Info size={14} className="mr-2" />
                    Matches against bot opponents are always available
                  </div>
                </CardFooter>
              </Card>
            ))}

            {/* Coming soon card */}
            <Card className="bg-footbai-container/50 border-dotted border-2 border-gray-700">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">?</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-400">
                        Coming Soon
                      </h3>
                      <p className="text-sm text-gray-500">Online Opponents</p>
                    </div>
                  </div>
                  <Button
                    className="bg-gray-700 hover:bg-gray-600 text-gray-400 w-full cursor-not-allowed"
                    disabled
                  >
                    <Play size={16} className="mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
              <Separator className="bg-footbai-header" />
              <CardContent className="p-5">
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  Future Features
                </h4>
                <div className="text-sm text-gray-500">
                  <p>• Online multiplayer matches</p>
                  <p>• More opponent types</p>
                  <p>• Custom tournaments</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayMatch;
