import { Formation, TeamTactic } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TeamLogo from "@/components/TeamLogo";
import StatBar from "@/components/StatBar";
import { ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamUpgradeSection } from "@/components/TeamUpgradeSection";
import { FormationDisplay } from "@/components/team-creation/FormationSelector";
import { formations } from "@/config/formations";
import { useTeamStore } from "@/stores/useTeamStore";
import { useCalculateTeamStrength } from "@/hooks/useCalculateTeamStrength";

const TeamOverview = () => {
  const { team, updateTeamTactic, updateTeamFormation } = useTeamStore();
  const calculateTeamStrength = useCalculateTeamStrength(team);
  const { toast } = useToast();

  if (!team) return null;

  const handleSaveTactic = (tactic: TeamTactic) => {
    updateTeamTactic(tactic);
    toast({
      title: "Tactic Updated",
      description: `Your team now uses the ${tactic} tactic.`,
    });
  };

  const handleFormationChange = (formation: string) => {
    updateTeamFormation(formation as Formation);
    toast({
      title: "Formation Updated",
      description: `Your team now uses the ${formation} formation.`,
    });
  };

  const playersByPosition = {
    GK: team.players.filter((p) => p.position === "GK"),
    DEF: team.players.filter((p) => p.position === "DEF"),
    MID: team.players.filter((p) => p.position === "MID"),
    ATT: team.players.filter((p) => p.position === "ATT"),
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Team Overview</h1>
        <p className="text-gray-400">Manage your squad and team tactics</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column - Team Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team card */}

          <Card className="flex-1 bg-footbai-container border-footbai-header">
            <CardHeader className="bg-footbai-header p-3">
              <CardTitle className="text-lg">My Squad</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {/* Team Identity Section */}
              <div className="flex items-center gap-3 mb-8">
                <TeamLogo logo={team.logo} size="md" />
                <div>
                  <h2 className="text-lg font-semibold">{team.name}</h2>
                  <p className="text-sm text-gray-400">{team.tactic} Tactic</p>
                </div>
              </div>

              {/* Team Stats Section */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-footbai-header/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Team Rating</div>
                  <div className="text-3xl font-bold text-footbai-accent">
                    {calculateTeamStrength}
                  </div>
                </div>
                <div className="bg-footbai-header/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">
                    Available Points
                  </div>
                  <div className="text-3xl font-bold">{team.points} PTS</div>
                </div>
              </div>

              {/* Team Settings Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-footbai-header/50 p-4 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Team Tactic</div>
                    <div className="text-sm text-gray-400">
                      Choose your team's playing style
                    </div>
                  </div>
                  <Select
                    value={team.tactic}
                    onValueChange={(value) =>
                      handleSaveTactic(value as TeamTactic)
                    }
                  >
                    <SelectTrigger className="w-[180px] bg-footbai-container border-footbai-hover">
                      <SelectValue placeholder="Select tactic" />
                    </SelectTrigger>
                    <SelectContent className="bg-footbai-container border-footbai-hover">
                      <SelectItem value="Balanced">Balanced</SelectItem>
                      <SelectItem value="Offensive">Offensive</SelectItem>
                      <SelectItem value="Defensive">Defensive</SelectItem>
                      <SelectItem value="Counter-Attacking">
                        Counter-Attacking
                      </SelectItem>
                      <SelectItem value="Aggressive">Aggressive</SelectItem>
                      <SelectItem value="Possession-Based">
                        Possession-Based
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className=" bg-footbai-container border-footbai-header">
            <CardHeader className="bg-footbai-header p-3">
              <CardTitle className="text-lg">Current Formation</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs
                value={team.formation}
                onValueChange={(value) =>
                  handleFormationChange(value as Formation)
                }
                className="mb-4"
              >
                <TabsList className="grid w-full grid-cols-5">
                  {formations.map((formation) => (
                    <TabsTrigger key={formation} value={formation}>
                      {formation}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <FormationDisplay
                formation={team.formation as Formation}
                size="small"
              />
            </CardContent>
          </Card>

          {/* Team upgrades */}
          <Card className="bg-footbai-container border-footbai-header">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-lg">Team Upgrades</CardTitle>
              <div className="flex justify-between items-center">
                <div className="bg-footbai-header px-3 py-1 rounded-full text-sm text-gray-300 border border-footbai-hover">
                  Available Points:{" "}
                  <span className="font-bold text-footbai-accent">
                    {team.points}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TeamUpgradeSection />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Squad */}
        <div className="lg:col-span-2">
          <Card className="h-full bg-footbai-container border-footbai-header">
            <CardHeader className="bg-footbai-header">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Squad</CardTitle>
                <div className="flex items-center gap-1 bg-footbai-accent/20 text-footbai-accent px-3 py-1 rounded-full text-xs font-medium">
                  <ShieldCheck size={14} />
                  <span>Starting XI</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="all">
                <div className="px-4 pt-4">
                  <TabsList className="bg-footbai-header flex-wrap">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black"
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="gk"
                      className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black"
                    >
                      Goalkeepers
                    </TabsTrigger>
                    <TabsTrigger
                      value="def"
                      className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black"
                    >
                      Defenders
                    </TabsTrigger>
                    <TabsTrigger
                      value="mid"
                      className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black"
                    >
                      Midfielders
                    </TabsTrigger>
                    <TabsTrigger
                      value="att"
                      className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black"
                    >
                      Attackers
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="p-4">
                  <div className="space-y-4">
                    {Object.entries(playersByPosition).map(
                      ([position, positionPlayers]) => (
                        <div key={position}>
                          <h3 className="font-medium mb-2 text-white/50">
                            {position === "GK"
                              ? "Goalkeepers"
                              : position === "DEF"
                              ? "Defenders"
                              : position === "MID"
                              ? "Midfielders"
                              : "Attackers"}
                          </h3>
                          <div className="space-y-2">
                            {positionPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="bg-footbai-header p-3 rounded-lg flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-medium">
                                    {player.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {player.position}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                                    {player.rating}
                                  </div>
                                  <div className="w-20">
                                    <StatBar
                                      value={player.rating}
                                      maxValue={99}
                                      color={team.logo.data.mainColor}
                                      showValue={false}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="gk" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.GK.map((player) => (
                      <div
                        key={player.id}
                        className="bg-footbai-header p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">
                            {player.position}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar
                              value={player.rating}
                              maxValue={99}
                              color={team.logo.data.mainColor}
                              showValue={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="def" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.DEF.map((player) => (
                      <div
                        key={player.id}
                        className="bg-footbai-header p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">
                            {player.position}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar
                              value={player.rating}
                              maxValue={99}
                              color={team.logo.data.mainColor}
                              showValue={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="mid" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.MID.map((player) => (
                      <div
                        key={player.id}
                        className="bg-footbai-header p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">
                            {player.position}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar
                              value={player.rating}
                              maxValue={99}
                              color={team.logo.data.mainColor}
                              showValue={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="att" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.ATT.map((player) => (
                      <div
                        key={player.id}
                        className="bg-footbai-header p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">
                            {player.position}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar
                              value={player.rating}
                              maxValue={99}
                              color={team.logo.data.mainColor}
                              showValue={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
