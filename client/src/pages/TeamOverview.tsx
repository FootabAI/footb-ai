import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { TeamTactic } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamLogo from '@/components/TeamLogo';
import StatBar from '@/components/StatBar';
import { Check, Edit, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamUpgradeSection } from '@/components/TeamUpgradeSection';

const TeamOverview = () => {
  const { userTeam, updateTeam, players, calculateTeamStrength } = useGame();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [tactic, setTactic] = useState<TeamTactic>(userTeam?.tactic || 'Balanced');
  const [attributes, setAttributes] = useState(userTeam?.attributes || {
    passing: 40, shooting: 40, pace: 40, dribbling: 40, defending: 40, physicality: 40
  });
  const [pointsLeft, setPointsLeft] = useState(userTeam?.points || 0);

  if (!userTeam) return null;

  const handleAttributeChange = (attr: string, value: number) => {
    const oldValue = attributes[attr as keyof typeof attributes];
    const pointDiff = value - oldValue;
    
    if (pointsLeft - pointDiff < 0) return;
    
    const newAttributes = { ...attributes, [attr]: value };
    setAttributes(newAttributes);
    setPointsLeft(prev => prev - pointDiff);
  };

  const handleSaveAttributes = () => {
    updateTeam({ 
      attributes, 
      points: pointsLeft 
    });
    
    toast({
      title: "Attributes Updated",
      description: "Your team attributes have been updated successfully.",
    });
    
    setEditMode(false);
  };

  const handleSaveTactic = () => {
    updateTeam({
      ...userTeam,
      tactic
    });
    setEditMode(false);
    
    toast({
      title: 'Tactic Updated',
      description: `Your team now uses the ${tactic} tactic.`,
    });
  };

  const TeamAttributesForm = ({ attributes, onChange, totalPoints, pointsLeft, canUpgrade }) => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Passing</div>
          <input
            type="number"
            value={attributes.passing}
            onChange={(e) => onChange('passing', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Shooting</div>
          <input
            type="number"
            value={attributes.shooting}
            onChange={(e) => onChange('shooting', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Pace</div>
          <input
            type="number"
            value={attributes.pace}
            onChange={(e) => onChange('pace', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Dribbling</div>
          <input
            type="number"
            value={attributes.dribbling}
            onChange={(e) => onChange('dribbling', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Defending</div>
          <input
            type="number"
            value={attributes.defending}
            onChange={(e) => onChange('defending', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Physicality</div>
          <input
            type="number"
            value={attributes.physicality}
            onChange={(e) => onChange('physicality', parseInt(e.target.value))}
            min={0}
            max={totalPoints}
            className="w-20 text-center border border-gray-300 rounded p-1"
          />
        </div>
      </div>
    );
  };

  // Group players by position for display
  const playersByPosition = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    ATT: players.filter(p => p.position === 'ATT'),
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Team Overview</h1>
        <p className="text-gray-400">Manage your squad and team tactics</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Team Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team card */}
          <Card className="bg-footbai-container border-footbai-header">
            <CardHeader className="bg-footbai-header pb-6">
              <CardTitle className="flex items-center gap-3">
                <TeamLogo logo={userTeam.logo} size="md" />
                <div>
                  <h2 className="text-lg font-semibold">{userTeam.name}</h2>
                  <p className="text-sm text-gray-400">{userTeam.tactic} Tactic</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-400">Team Rating</div>
                  <div className="text-3xl font-bold text-footbai-accent">
                    {calculateTeamStrength(userTeam)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Available Points</div>
                  <div className="text-xl font-semibold">{userTeam.points} PTS</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tactic:</span>
                  {editMode ? (
                    <div className="flex items-center">
                      <Select value={tactic} onValueChange={(value) => setTactic(value as TeamTactic)}>
                        <SelectTrigger className="w-[180px] bg-footbai-header border-footbai-hover">
                          <SelectValue placeholder="Select tactic" />
                        </SelectTrigger>
                        <SelectContent className="bg-footbai-container border-footbai-hover">
                          <SelectItem value="Balanced" >Balanced</SelectItem>
                          <SelectItem value="Offensive">Offensive</SelectItem>
                          <SelectItem value="Defensive">Defensive</SelectItem>
                          <SelectItem value="Counter-Attacking">Counter-Attacking</SelectItem>
                          <SelectItem value="Aggressive">Aggressive</SelectItem>
                          <SelectItem value="Possession-Based">Possession-Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={handleSaveTactic} className="ml-2">
                        <Check size={18} className="text-footbai-accent" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="font-medium">{userTeam.tactic}</span>
                      <Button size="icon" variant="ghost" onClick={() => setEditMode(true)}>
                        <Edit size={16} className="text-gray-400" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team upgrades */}
          <Card className="bg-footbai-container border-footbai-header">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Team Upgrades</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamUpgradeSection />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Squad */}
        <div className="lg:col-span-1">
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
                    <TabsTrigger value="all" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="gk" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                      Goalkeepers
                    </TabsTrigger>
                    <TabsTrigger value="def" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                      Defenders
                    </TabsTrigger>
                    <TabsTrigger value="mid" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                      Midfielders
                    </TabsTrigger>
                    <TabsTrigger value="att" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                      Attackers
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="p-4">
                  <div className="space-y-4">
                    {Object.entries(playersByPosition).map(([position, positionPlayers]) => (
                      <div key={position}>
                        <h3 className="font-medium mb-2 text-footbai-accent">
                          {position === 'GK' ? 'Goalkeepers' : 
                           position === 'DEF' ? 'Defenders' : 
                           position === 'MID' ? 'Midfielders' : 'Attackers'}
                        </h3>
                        <div className="space-y-2">
                          {positionPlayers.map((player) => (
                            <div key={player.id} className="bg-footbai-header p-3 rounded-lg flex justify-between items-center">
                              <div>
                                <div className="font-medium">{player.name}</div>
                                <div className="text-xs text-gray-400">{player.position}</div>
                              </div>
                              <div className="flex items-center">
                                <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                                  {player.rating}
                                </div>
                                <div className="w-20">
                                  <StatBar value={player.rating} maxValue={99} color={userTeam.logo.backgroundColor} showValue={false} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="gk" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.GK.map((player) => (
                      <div key={player.id} className="bg-footbai-header p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">{player.position}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar value={player.rating} maxValue={99} color={userTeam.logo.backgroundColor} showValue={false} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="def" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.DEF.map((player) => (
                      <div key={player.id} className="bg-footbai-header p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">{player.position}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar value={player.rating} maxValue={99} color={userTeam.logo.backgroundColor} showValue={false} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="mid" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.MID.map((player) => (
                      <div key={player.id} className="bg-footbai-header p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">{player.position}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar value={player.rating} maxValue={99} color={userTeam.logo.backgroundColor} showValue={false} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="att" className="p-4">
                  <div className="space-y-2">
                    {playersByPosition.ATT.map((player) => (
                      <div key={player.id} className="bg-footbai-header p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-gray-400">{player.position}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-3 w-8 h-8 rounded-full bg-footbai-accent/20 flex items-center justify-center text-footbai-accent">
                            {player.rating}
                          </div>
                          <div className="w-20">
                            <StatBar value={player.rating} maxValue={99} color={userTeam.logo.backgroundColor} showValue={false} />
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