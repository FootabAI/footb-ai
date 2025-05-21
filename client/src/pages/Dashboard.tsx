import { useNavigate } from "react-router-dom";
import { useTeamStore } from "@/stores/useTeamStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamLogo from "@/components/TeamLogo";
import AttributesDisplay from "@/components/AttributesDisplay";
import { Play, Users, Trophy, BarChart2 } from "lucide-react";
import { useCalculateTeamStrength } from "@/hooks/useCalculateTeamStrength";
import StatBar from "@/components/StatBar";

const Dashboard = () => {
  const navigate = useNavigate();
  const { team } = useTeamStore();
  const calculateTeamStrength = useCalculateTeamStrength(team.attributes);
  if (!team) return null;

  // Hardcoded stats for demonstration
  const clubStats = team.teamStats;

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Manage your club and access key features
        </p>
      </header>

      {/* Team overview card */}
      <Card className="mb-6 border-footbai-header bg-footbai-container overflow-hidden">
        <CardHeader className="bg-footbai-header pb-6">
          <CardTitle className="flex items-center gap-3">
            <TeamLogo logo={team.logo} size="md" />
            <div>
              <h2 className="text-lg font-semibold">{team.name}</h2>
              <p className="text-sm text-gray-400">{team.tactic} Tactic</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-gray-300 font-medium mb-4">
                Team Attributes
              </h3>
              <AttributesDisplay
                attributes={team.attributes}
                teamColor={team.logo.data.mainColor}
                layout="grid"
              />
            </div>
            <div className="flex flex-col items-center justify-center bg-footbai-header rounded-lg p-4">
              <div className="text-6xl font-bold text-footbai-accent mb-2">
                {calculateTeamStrength}
              </div>
              <div className="text-sm text-gray-300 font-medium">
                TEAM RATING
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Button
          variant="outline"
          size="lg"
          className="h-auto py-6 flex items-center justify-center gap-3 bg-footbai-container hover:text-footbai-accent hover:bg-footbai-hover border-footbai-header"
          onClick={() => navigate("/play")}
        >
          <Play size={20} className="text-footbai-accent" />
          <div className="text-left">
            <div className="font-semibold">Play Match</div>
            <div className="text-xs text-gray-400">
              Simulate a football match
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-auto py-6 flex items-center justify-center gap-3 bg-footbai-container hover:text-footbai-accent hover:bg-footbai-hover border-footbai-header"
          onClick={() => navigate("/team")}
        >
          <Users size={20} className="text-footbai-accent" />
          <div className="text-left">
            <div className="font-semibold">Team Management</div>
            <div className="text-xs text-gray-400">
              View and manage your squad
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-auto py-6 flex items-center justify-center gap-3 bg-footbai-container hover:bg-footbai-hover border-footbai-header"
          disabled
        >
          <Trophy size={20} className="text-gray-500" />
          <div className="text-left">
            <div className="font-semibold">Competitions</div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>
        </Button>
      </div>

      {/* Club Stats */}
      <h2 className="text-lg font-semibold mb-4">Club Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-footbai-container border-footbai-header">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-footbai-accent/80 mb-1">
                {clubStats.totalMatches}
              </span>
              <span className="text-sm text-gray-400">Matches Played</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-footbai-container border-footbai-header">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-footbai-accent/80 mb-1">
                {clubStats.wins !== 0
                  ? ((clubStats.wins / clubStats.totalMatches) * 100).toFixed(1)
                  : 0}
                %
              </span>
              <span className="text-sm text-gray-400">Win Rate</span>
              <span className="text-xs text-gray-500 mt-1">
                {clubStats.wins} Wins
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-footbai-container border-footbai-header">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-red-400/80 mb-1">
                {clubStats.losses !== 0
                  ? ((clubStats.losses / clubStats.totalMatches) * 100).toFixed(
                      1
                    )
                  : 0}
                %
              </span>
              <span className="text-sm text-gray-400">Loss Rate</span>
              <span className="text-xs text-gray-500 mt-1">
                {clubStats.losses} Losses
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-footbai-container border-footbai-header">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-yellow-400/80 mb-1">
                {clubStats.draws !== 0
                  ? ((clubStats.draws / clubStats.totalMatches) * 100).toFixed(
                      1
                    )
                  : 0}
                %
              </span>
              <span className="text-sm text-gray-400">Draw Rate</span>
              <span className="text-xs text-gray-500 mt-1">
                {clubStats.draws} Draws
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="bg-footbai-container border-footbai-header">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="text-footbai-accent" />
            Detailed Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-4">Attack</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Goals Scored</span>
                    <span className="text-white">{clubStats.goalsScored}</span>
                  </div>
                  <div className="h-2 bg-footbai-header rounded-full overflow-hidden">
                    <StatBar
                      value={
                        clubStats.goalsScored !== 0
                          ? (clubStats.goalsScored / 100) * 100
                          : 0
                      }
                      color={team.logo.data.mainColor}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Goals per Match</span>
                    <span className="text-white">
                      {clubStats.goalsScored !== 0
                        ? (
                            clubStats.goalsScored / clubStats.totalMatches
                          ).toFixed(2)
                        : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-footbai-header rounded-full overflow-hidden">
                    <StatBar
                      value={
                        clubStats.goalsScored !== 0
                          ? (clubStats.goalsScored /
                              clubStats.totalMatches /
                              5) *
                            100
                          : 0
                      }
                      color={team.logo.data.mainColor}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                Defense
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Clean Sheets</span>
                    <span className="text-white">{clubStats.cleanSheets}</span>
                  </div>
                  <div className="h-2 bg-footbai-header rounded-full overflow-hidden">
                    <StatBar
                      value={
                        clubStats.cleanSheets !== 0
                          ? (clubStats.cleanSheets / clubStats.totalMatches) *
                            100
                          : 0
                      }
                      color={team.logo.data.mainColor}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Goals Conceded per Match</span>
                    <span className="text-white">
                      {clubStats.goalsConceded !== 0
                        ? (
                            clubStats.goalsConceded / clubStats.totalMatches
                          ).toFixed(2)
                        : 0}
                    </span>
                  </div>
                  <div className="h-2 bg-footbai-header rounded-full overflow-hidden">
                    <StatBar
                      value={
                        clubStats.goalsConceded !== 0
                          ? (clubStats.goalsConceded /
                              clubStats.totalMatches /
                              5) *
                            100
                          : 0
                      }
                      color={team.logo.data.mainColor}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
