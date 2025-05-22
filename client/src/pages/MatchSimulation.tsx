import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/stores/useGameStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchEvent, TeamTactic, MatchEventType, Formation } from "@/types";
import TeamLogo from "@/components/TeamLogo";
import {
  Play,
  Flag,
  AlertCircle,
  Timer,
  Target,
  Cone,
  Bell,
  CreditCard,
  Ban,
  Crosshair,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import { startMatchSimulation, continueMatch, changeTeamTactics } from "@/api";
import Event from "@/components/Event";
import { FormationDisplay } from "@/components/team-creation/FormationSelector";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { formations } from "@/config/formations";
// import { v4 as uuidv4 } from "uuid";

const MatchSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currentMatch,
    addMatchEvent,
    updateMatchStats,
    completeMatch,
  } = useGameStore();
  const { team } = useTeamStore();

  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [minute, setMinute] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [isFullTime, setIsFullTime] = useState(false);
  const [changeTactic, setChangeTactic] = useState<TeamTactic | null>(null);
  const [changeFormation, setChangeFormation] = useState<Formation | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [matchId] = useState(
    () => `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [warmingUpMessage, setWarmingUpMessage] = useState(0);

  // Refs for scrolling
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const warmingUpMessages = [
    "Players are warming up on the pitch...",
    "Referee checking the match ball...",
    "Ground staff preparing the field...",
    "Medical team setting up on the sidelines...",
    "Broadcast team testing equipment...",
    "Fans finding their seats...",
    "Captains meeting with the referee...",
    "Substitutes warming up on the sidelines...",
    "VAR system being checked...",
  ];

  useEffect(() => {
    // If there's no currentMatch or userTeam, redirect to the play page
    if (!currentMatch || !team) {
      navigate("/play");
      return;
    }
  }, [currentMatch, team, navigate]);

  useEffect(() => {
    // Start simulation after a short delay
    const timer = setTimeout(() => {
      startMatch();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to the bottom of the events container when new events are added
  useEffect(() => {
    if (!matchEvents || matchEvents.length === 0) return;

    const scrollToBottom = () => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [matchEvents]);

  useEffect(() => {
    if (!isWarmingUp) return;

    const interval = setInterval(() => {
      setWarmingUpMessage((prev) => (prev + 1) % warmingUpMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isWarmingUp]);

  const startMatch = async () => {
    try {
      console.log("\n=== Starting match simulation ===");
      const { events } = await startMatchSimulation(
        matchId,
        team,
        currentMatch.awayTeam
      );
      setIsWarmingUp(false);

      for await (const event of events) {
        if (!event) continue;

        // Handle half-time
        if (event.event.type === "half-time") {
          console.log("\n=== HALF TIME ===");

          setIsHalfTime(true);
        }

        // Handle full-time
        if (event.event.type === "full-time") {
          console.log("\n=== FULL TIME ===");
          console.log(`Final Score: ${event.score.home} - ${event.score.away}`);

          setIsFullTime(true);
          completeMatch(
            event.score.home > event.score.away
              ? team.id
              : currentMatch.awayTeam.id
          );
          // setTimeout(() => navigate("/summary"), 5000);
        }

        // Log event
        console.log(`[${event.minute}'] ${event.event.description}`);

        // Update minute
        setMinute(event.minute);

        // Add event to state
        const newEvent: MatchEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: event.event.type as MatchEventType,
          minute: event.minute,
          teamId:
            event.event.team === "home"
              ? team.id
              : event.event.team === "away"
              ? currentMatch.awayTeam.id
              : "system",
          description: event.event.description,
        };

        setMatchEvents((prev) => [...prev, newEvent]);
        addMatchEvent(newEvent);

        // Update stats if available
        if (event.stats) {
          updateMatchStats(event.stats.home, event.stats.away);
        }
      }
    } catch (error) {
      console.error("Error in match simulation:", error);
      toast({
        title: "Error",
        description: "Failed to simulate match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = async () => {
    try {
      // If tactic or formation was changed, send it to the server
      if (changeTactic || changeFormation) {
        console.log("\n=== Changing tactics ===");
        console.log(`Tactic: ${changeTactic || currentMatch.homeTeam.tactic}`);
        console.log(`Formation: ${changeFormation || currentMatch.homeTeam.formation}`);
        
        // Send the changes to the server
        await changeTeamTactics(
          matchId,
          changeTactic || currentMatch.homeTeam.tactic,
          changeFormation || currentMatch.homeTeam.formation
        );

        toast({
          title: "Tactics Changed",
          description: `Your team is now using ${
            changeFormation ? `the ${changeFormation} formation` : ""
          }${changeFormation && changeTactic ? " with " : ""}${
            changeTactic ? `the ${changeTactic} tactic` : ""
          }.`,
        });
        setChangeTactic(null);
        setChangeFormation(null);
      }

      console.log("\n=== Starting second half ===");
      // Continue the match
      const { events } = await continueMatch(matchId);
      setIsHalfTime(false);

      for await (const event of events) {
        if (!event) continue;

        // Handle full-time
        if (event.event.type === "full-time") {
          console.log("\n=== FULL TIME ===");
          console.log(`Final Score: ${event.score.home} - ${event.score.away}`);

          setIsFullTime(true);
          completeMatch(
            event.score.home > event.score.away
              ? team.id
              : currentMatch.awayTeam.id
          );
        }

        // Log event
        console.log(`[${event.minute}'] ${event.event.description}`);

        // Update minute
        setMinute(event.minute);

        // Add event to state
        const newEvent: MatchEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: event.event.type as MatchEventType,
          minute: event.minute,
          teamId:
            event.event.team === "home"
              ? team.id
              : event.event.team === "away"
              ? currentMatch.awayTeam.id
              : "system",
          description: event.event.description,
        };

        setMatchEvents((prev) => [...prev, newEvent]);
        addMatchEvent(newEvent);

        // Update stats if available
        if (event.stats) {
          updateMatchStats(event.stats.home, event.stats.away);
        }
      }
    } catch (error) {
      console.error("Error continuing match:", error);
      toast({
        title: "Error",
        description: "Failed to continue match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleForfeit = () => {
    const forfeitEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "goal" as const,
      minute: minute,
      teamId: "system",
      description: `${team.name} has forfeited the match.`,
    };

    setMatchEvents((prev) => [...prev, forfeitEvent]);
    addMatchEvent(forfeitEvent);
    completeMatch(currentMatch.awayTeam.id);
    setTimeout(() => navigate("/summary"), 2000);
  };

  const formatMatchTime = (minutes: number) => {
    if (minutes === 45) return "45' (HT)";
    if (minutes === 90) return "90' (FT)";
    if (minutes > 45 && minutes < 50) return `45+${minutes - 45}'`;
    if (minutes > 90) return `90+${minutes - 90}'`;
    return `${minutes}'`;
  };

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6 bg-footbai-container border-footbai-header">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <TeamLogo logo={currentMatch.homeTeam.logo} size="md" />
                  <div className="text-center">
                    <h3 className="text-lg font-bold">
                      {currentMatch.homeTeam.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {currentMatch.homeTeam.tactic}
                    </p>
                  </div>
                </div>

                {/* SCORE */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-2xl font-bold">
                      {currentMatch.homeScore}
                    </div>
                    <div className="text-xl font-bold">-</div>
                    <div className="text-2xl font-bold">
                      {currentMatch.awayScore}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center border-footbai-header rounded px-2 py-1">
                    {isFullTime ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div>Full Time</div>
                      </div>
                    ) : isHalfTime ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>Half Time</div>
                      </div>
                    ) : isWarmingUp ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>Players Warming Up</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>{formatMatchTime(minute)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  <div className="text-center">
                    <h3 className="text-lg font-bold">
                      {currentMatch.awayTeam.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {currentMatch.awayTeam.tactic}
                    </p>
                  </div>
                  <TeamLogo logo={currentMatch.awayTeam.logo} size="md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {isHalfTime && (
            <Card className="mb-6 bg-footbai-container border-footbai-header border-yellow-500/50 h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader className="bg-yellow-500/10 pb-3">
                <CardTitle className="text-yellow-500 flex items-center">
                  <AlertCircle size={18} className="mr-2" />
                  Half Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col">
                <p className="text-gray-300 mb-6">
                  It's half-time! You can make tactical changes before the
                  second half begins.
                </p>

                <div className="flex-1">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">
                        Change Team Tactic
                      </label>
                      <Select
                        value={changeTactic || currentMatch.homeTeam.tactic}
                        onValueChange={(value) => setChangeTactic(value as TeamTactic)}
                      >
                        <SelectTrigger className="bg-footbai-header border-footbai-hover">
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

                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">
                        Change Formation
                      </label>
                      <div>
                        <Tabs
                          value={changeFormation || currentMatch.homeTeam.formation}
                          onValueChange={(value) => {
                            console.log("Formation changed to:", value);
                            setChangeFormation(value as Formation);
                          }}
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
                          formation={changeFormation || currentMatch.homeTeam.formation}
                          size="small"
                          isOnboarding={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    className="bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                    onClick={handleForfeit}
                  >
                    <Flag size={16} className="mr-2" />
                    Forfeit Match
                  </Button>
                  <Button
                    className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                    onClick={handleContinue}
                  >
                    <Play size={16} className="mr-2" />
                    Continue Match
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isHalfTime && (
            <Card className="bg-footbai-container border-footbai-header h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader className="bg-footbai-container pb-5">
                <CardTitle>Match Events</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea
                  className="h-full"
                  ref={scrollAreaRef}
                  viewportRef={viewportRef}
                >
                  <div className="h-[calc(70vh-16rem)] p-4 flex flex-col">
                    {isWarmingUp || !matchEvents || matchEvents.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                          <div>{warmingUpMessages[warmingUpMessage]}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="space-y-2">
                          {matchEvents.map((event) => (
                            <Event
                              key={event.id}
                              event={event}
                              formatMatchTime={formatMatchTime}
                              userTeamId={team.id}
                            />
                          ))}
                        </div>
                        {isFullTime && (
                          <div className="sticky bottom-0 left-0 right-0 bg-footbai-container/30 backdrop-blur-md border-t border-footbai-header py-6">
                            <div className="text-center space-y-4">
                              <h3 className="text-xl font-semibold">
                                Match Complete
                              </h3>
                              <Button
                                className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                                onClick={() => navigate("/summary")}
                              >
                                View Match Summary
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div ref={eventsEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-footbai-container border-footbai-header sticky top-0">
            <CardHeader className="bg-footbai-header pb-5">
              <CardTitle>Match Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-between mb-4">
                <span className="font-semibold">
                  {currentMatch.homeTeam.name}
                </span>
                <span className="font-semibold">
                  {currentMatch.awayTeam.name}
                </span>
              </div>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span>{Math.round(currentMatch.homeStats.possession)}%</span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Timer size={16} />
                    Possession
                  </span>
                  <span>{Math.round(currentMatch.awayStats.possession)}%</span>
                </div>
                <div className="flex h-2 rounded overflow-hidden">
                  <div
                    style={{
                      width: `${currentMatch.homeStats.possession}%`,
                      backgroundColor:
                        currentMatch.homeTeam.logo.data.mainColor,
                    }}
                  ></div>
                  <div
                    style={{
                      width: `${currentMatch.awayStats.possession}%`,
                      backgroundColor:
                        currentMatch.awayTeam.logo.data.mainColor,
                    }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xl font-semibold">
                    {currentMatch.homeStats.shots || 0}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <Crosshair size={16} />
                    Shots
                  </div>
                  <div className="text-xl font-semibold">
                    {currentMatch.awayStats.shots || 0}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    {currentMatch.homeStats.shotsOnTarget || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Target size={16} />
                    On Target
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.shotsOnTarget || 0}
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-footbai-header" />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    {currentMatch.homeStats.fouls || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Ban size={16} />
                    Fouls
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.fouls || 0}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    {currentMatch.homeStats.yellowCards || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                    Yellow Cards
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.yellowCards || 0}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm">
                    {currentMatch.homeStats.redCards || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm" />
                    Red Cards
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.redCards || 0}
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-footbai-header" />

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xl font-semibold">
                    {currentMatch.homeStats.corners || 0}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <Flag size={16} />
                    Corners
                  </div>
                  <div className="text-xl font-semibold">
                    {currentMatch.awayStats.corners || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchSimulation;
