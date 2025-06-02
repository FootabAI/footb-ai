import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/stores/useGameStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/api";

import { MatchEvent as ClientMatchEvent, TeamTactic, Formation, MatchStats } from "@/types";
import { MatchEventType } from "@/types/match";
import { MinuteUpdate } from "@/types/match-simulation";
import TeamLogo from "@/components/TeamLogo";
import {
  Play,
  Flag,
  AlertCircle,
  Target,
  Crosshair,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import { continueMatch, startMatchSimulationNew } from "@/api";
import Event from "@/components/Event";
import { FormationDisplay } from "@/components/team-creation/FormationSelector";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { formations } from "@/config/formations";
import { TacticSelect } from "@/components/TacticSelect";

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
  const [changeFormation, setChangeFormation] = useState<Formation | null>(
    null
  );
  const [matchEvents, setMatchEvents] = useState<ClientMatchEvent[]>([]);
  const [matchId] = useState(
    () => `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [warmingUpMessage, setWarmingUpMessage] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const eventQueueRef = useRef<ClientMatchEvent[]>([]);
  const simulationPausedRef = useRef(false);
  const pendingUpdatesRef = useRef<{
    minute?: number;
    score?: { home: number; away: number };
    stats?: {
      home: { shots: number; shotsOnTarget: number; yellowCards: number; redCards: number };
      away: { shots: number; shotsOnTarget: number; yellowCards: number; redCards: number };
    };
  }>({});

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

  const playAudioAndWait = async (audioUrl: string): Promise<void> => {
    if (!audioUrl || !isAudioEnabled) {
      return;
    }

    return new Promise((resolve, reject) => {
      console.log("\n=== Playing Audio ===");
      console.log("Audio URL:", audioUrl);

      // Ensure the URL is absolute
      const absoluteUrl = audioUrl.startsWith("http")
        ? audioUrl
        : `${API_URL}${audioUrl}`;
      console.log("Absolute URL:", absoluteUrl);

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      audio.addEventListener("error", (e) => {
        console.error("\n=== Audio Error ===");
        console.error("Error event:", e);
        console.error("Audio URL:", absoluteUrl);
        console.error("Audio error code:", audio.error?.code);
        console.error("Audio error message:", audio.error?.message);
        console.error("Audio readyState:", audio.readyState);
        reject(e);
      });

      audio.addEventListener("ended", () => {
        console.log("\n=== Audio Ended ===");
        console.log("Audio finished playing successfully");
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        resolve();
      });

      audio.addEventListener("canplaythrough", () => {
        console.log("\n=== Audio Can Play Through ===");
        console.log("Audio loaded and ready to play");
        audio
          .play()
          .then(() => {
            console.log("Audio playback started successfully");
          })
          .catch((error) => {
            console.error("\n=== Audio Play Error ===");
            console.error("Error starting playback:", error);
            console.error("Audio readyState:", audio.readyState);
            reject(error);
          });
      });

      audio.src = absoluteUrl;
    });
  };

  const processNextEvent = async () => {
    if (isPlayingRef.current || eventQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const event = eventQueueRef.current[0];

    try {
      // Pause the simulation
      simulationPausedRef.current = true;

      // Apply any pending updates before showing the event
      if (pendingUpdatesRef.current.minute !== undefined) {
        setMinute(pendingUpdatesRef.current.minute);
      }
      if (pendingUpdatesRef.current.score || pendingUpdatesRef.current.stats) {
        updateMatchStats(
          {
            ...currentMatch.homeStats,
            goalsScored: pendingUpdatesRef.current.score?.home ?? currentMatch.homeStats.goalsScored,
            goalsConceded: pendingUpdatesRef.current.score?.away ?? currentMatch.homeStats.goalsConceded,
            shots: pendingUpdatesRef.current.stats?.home.shots ?? currentMatch.homeStats.shots,
            shotsOnTarget: pendingUpdatesRef.current.stats?.home.shotsOnTarget ?? currentMatch.homeStats.shotsOnTarget,
            yellowCards: pendingUpdatesRef.current.stats?.home.yellowCards ?? currentMatch.homeStats.yellowCards,
            redCards: pendingUpdatesRef.current.stats?.home.redCards ?? currentMatch.homeStats.redCards,
          },
          {
            ...currentMatch.awayStats,
            goalsScored: pendingUpdatesRef.current.score?.away ?? currentMatch.awayStats.goalsScored,
            goalsConceded: pendingUpdatesRef.current.score?.home ?? currentMatch.awayStats.goalsConceded,
            shots: pendingUpdatesRef.current.stats?.away.shots ?? currentMatch.awayStats.shots,
            shotsOnTarget: pendingUpdatesRef.current.stats?.away.shotsOnTarget ?? currentMatch.awayStats.shotsOnTarget,
            yellowCards: pendingUpdatesRef.current.stats?.away.yellowCards ?? currentMatch.awayStats.yellowCards,
            redCards: pendingUpdatesRef.current.stats?.away.redCards ?? currentMatch.awayStats.redCards,
          }
        );
        // Clear pending updates
        pendingUpdatesRef.current = {};
      }

      // Add event to state
      setMatchEvents((prev) => [...prev, event]);
      addMatchEvent(event);

      // Handle full-time event
      if (event.type === "full-time") {
        console.log("\n=== FULL TIME ===");
        console.log(`Final Score: ${pendingUpdatesRef.current.score?.home ?? currentMatch.homeStats.goalsScored} - ${pendingUpdatesRef.current.score?.away ?? currentMatch.awayStats.goalsScored}`);
        setIsFullTime(true);
        completeMatch(
          (pendingUpdatesRef.current.score?.home ?? currentMatch.homeStats.goalsScored) > 
          (pendingUpdatesRef.current.score?.away ?? currentMatch.awayStats.goalsScored)
            ? team.id
            : currentMatch.awayTeam.id
        );
      }

      // Play audio if available and enabled
      if (event.audio_url && isAudioEnabled) {
        console.log("Playing audio for event");
        await playAudioAndWait(event.audio_url);
      } else {
        // Add a small delay for events without audio to maintain a natural pace
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Remove the processed event from queue
      eventQueueRef.current.shift();
      isPlayingRef.current = false;

      // Resume the simulation
      simulationPausedRef.current = false;

      // Process next event if any
      if (eventQueueRef.current.length > 0) {
        processNextEvent();
      }
    } catch (error) {
      console.error("Error processing event:", error);
      // Remove the failed event from queue and continue with next
      eventQueueRef.current.shift();
      isPlayingRef.current = false;
      simulationPausedRef.current = false;
      if (eventQueueRef.current.length > 0) {
        processNextEvent();
      }
    }
  };

  const handleNewEvent = (event: ClientMatchEvent) => {
    console.log("\n=== New Event Debug ===");
    console.log("Event:", event);
    console.log("Event audio URL:", event.audio_url);

    // Add event to queue
    eventQueueRef.current.push(event);
    console.log("Added to queue. Queue length:", eventQueueRef.current.length);

    // Start processing if not already processing
    if (!isPlayingRef.current) {
      processNextEvent();
    }
  };

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Clear the queue and pending updates
      eventQueueRef.current = [];
      isPlayingRef.current = false;
      simulationPausedRef.current = false;
      pendingUpdatesRef.current = {};
    };
  }, []);

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
      console.log("\n=== Starting match simulation with new engine ===");
      const { events } = await startMatchSimulationNew(
        matchId,
        team,
        currentMatch.awayTeam
      );
      setIsWarmingUp(false);

      for await (const event of events) {
        if (!event) continue;

        // Handle minute updates
        if (event.type === "minute_update") {
          const minuteUpdate = event as MinuteUpdate;
          // Store minute update in pending updates
          pendingUpdatesRef.current.minute = minuteUpdate.minute;
          pendingUpdatesRef.current.score = minuteUpdate.score;
          pendingUpdatesRef.current.stats = minuteUpdate.stats;
          continue;
        }

        // Handle match events
        if (event.type === "event") {
          const matchEvent = event;
          // Handle half-time
          if (matchEvent.event.type === "half-time") {
            console.log("\n=== HALF TIME ===");
            setIsHalfTime(true);
          }

          // Skip displaying 'shot' events but keep updating stats
          if (matchEvent.event.type === "shot") {
            // Store stats update in pending updates
            pendingUpdatesRef.current.score = matchEvent.score;
            pendingUpdatesRef.current.stats = matchEvent.stats;
            continue;
          }

          // Log event
          console.log(
            `[${matchEvent.minute}'], event_description: ${matchEvent.event.event_description}, audio_url: ${matchEvent.event.audio_url}`
          );

          const newEvent: ClientMatchEvent = {
            id: `event-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            type: matchEvent.event.type as MatchEventType,
            team: matchEvent.event.team,
            description: matchEvent.event.event_description,
            commentary: matchEvent.event.event_description,
            minute: matchEvent.minute,
            audio_url: matchEvent.event.audio_url || null,
          };

          // Store any score/stats updates in pending updates
          pendingUpdatesRef.current.score = matchEvent.score;
          pendingUpdatesRef.current.stats = matchEvent.stats;

          // Wait if simulation is paused
          while (simulationPausedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          handleNewEvent(newEvent);
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
      console.log("\n=== Starting second half ===");
      const newTactic = changeTactic || currentMatch.homeTeam.tactic;
      const newFormation = changeFormation || currentMatch.homeTeam.formation;
      console.log(`Home Tactic: ${newTactic}`);
      console.log(`Away Tactic: ${currentMatch.awayTeam.tactic}`);
      console.log(`Formation: ${newFormation}`);

      // Continue the match with any tactic/formation changes
      const { events } = await continueMatch(
        matchId,
        team,
        currentMatch.awayTeam,
        newTactic,
        newFormation,
        {
          home: currentMatch.homeStats.goalsScored,
          away: currentMatch.awayStats.goalsScored,
        },
        {
          home: {
            ...currentMatch.homeStats,
            shots: currentMatch.homeStats.shots || 0,
            shotsOnTarget: currentMatch.homeStats.shotsOnTarget || 0,
            yellowCards: currentMatch.homeStats.yellowCards || 0,
            redCards: currentMatch.homeStats.redCards || 0,
          },
          away: {
            ...currentMatch.awayStats,
            shots: currentMatch.awayStats.shots || 0,
            shotsOnTarget: currentMatch.awayStats.shotsOnTarget || 0,
            yellowCards: currentMatch.awayStats.yellowCards || 0,
            redCards: currentMatch.awayStats.redCards || 0,
          },
        }
      );

      if (changeTactic || changeFormation) {
        toast({
          title: "Tactics Changed",
          description: `Your team is now using ${
            newFormation ? `the ${newFormation} formation` : ""
          }${newFormation && newTactic ? " with " : ""}${
            newTactic ? `the ${newTactic} tactic` : ""
          }.`,
        });
        setChangeTactic(null);
        setChangeFormation(null);
      }

      setIsHalfTime(false);

      for await (const event of events) {
        if (!event) continue;

        // Handle minute updates
        if (event.type === "minute_update") {
          setMinute(event.minute);
          // Update stats from minute update
          updateMatchStats(
            {
              ...currentMatch.homeStats,
              goalsScored: event.score.home,
              goalsConceded: event.score.away,
              shots: event.stats?.home.shots || 0,
              shotsOnTarget: event.stats?.home.shotsOnTarget || 0,
              yellowCards: event.stats?.home.yellowCards || 0,
              redCards: event.stats?.home.redCards || 0,
            },
            {
              ...currentMatch.awayStats,
              goalsScored: event.score.away,
              goalsConceded: event.score.home,
              shots: event.stats?.away.shots || 0,
              shotsOnTarget: event.stats?.away.shotsOnTarget || 0,
              yellowCards: event.stats?.away.yellowCards || 0,
              redCards: event.stats?.away.redCards || 0,
            }
          );
          continue;
        }

        // Handle full-time
        if ("event" in event && event.event.type === "full-time") {
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
        if ("event" in event) {
          console.log(`[${event.minute}'] ${event.event.event_description}`);

          // Update minute
          setMinute(event.minute);

          // Add event to state
          const newEvent: ClientMatchEvent = {
            id: `event-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            type: event.event.type as MatchEventType,
            team: event.event.team,
            description: event.event.event_description,
            commentary: event.event.event_description,
            minute: event.minute,
            audio_url: event.event.audio_url || null,
          };

          handleNewEvent(newEvent);

          // Update stats from event
          updateMatchStats(
            {
              ...currentMatch.homeStats,
              goalsScored: event.score.home,
              goalsConceded: event.score.away,
              shots: event.stats?.home.shots || 0,
              shotsOnTarget: event.stats?.home.shotsOnTarget || 0,
              yellowCards: event.stats?.home.yellowCards || 0,
              redCards: event.stats?.home.redCards || 0,
            },
            {
              ...currentMatch.awayStats,
              goalsScored: event.score.away,
              goalsConceded: event.score.home,
              shots: event.stats?.away.shots || 0,
              shotsOnTarget: event.stats?.away.shotsOnTarget || 0,
              yellowCards: event.stats?.away.yellowCards || 0,
              redCards: event.stats?.away.redCards || 0,
            }
          );

          // Add a small delay between events
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
    const forfeitEvent: ClientMatchEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "goal",
      team: "system",
      description: `${team.name} has forfeited the match.`,
      commentary: `${team.name} has forfeited the match.`,
      minute: null,
    };

    handleNewEvent(forfeitEvent);
    completeMatch(currentMatch.awayTeam.id);
    setTimeout(() => navigate("/summary"), 2000);
  };

  const formatMatchTime = (minutes: number) => {
    if (minutes === 45) return "45' (HT)";
    if (minutes === 90) return "90' (FT)";
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
                      {currentMatch.homeStats.goalsScored}
                    </div>
                    <div className="text-xl font-bold">-</div>
                    <div className="text-2xl font-bold">
                      {currentMatch.awayStats.goalsScored}
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
                      <TacticSelect
                        value={changeTactic || currentMatch.homeTeam.tactic}
                        onValueChange={(value) => {
                          setChangeTactic(value);
                          console.log("Tactic changed to:", value);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">
                        Change Formation
                      </label>
                      <div>
                        <Tabs
                          value={
                            changeFormation || currentMatch.homeTeam.formation
                          }
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
                          formation={
                            changeFormation || currentMatch.homeTeam.formation
                          }
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
                <CardTitle className="flex items-center justify-between">
                  Match Events
                  <div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                      className="bg-footbai-container hover:bg-footbai-header"
                    >
                      {isAudioEnabled ? (
                        <Volume2 className="h-5 w-5" />
                      ) : (
                        <VolumeX className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
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

              {/* Goals */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Goals</div>
                <div className="flex justify-between items-center">
                  <div className="text-xl font-semibold">
                    {currentMatch.homeStats.goalsScored || 0}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <Trophy size={16} />
                    Goals
                  </div>
                  <div className="text-xl font-semibold">
                    {currentMatch.awayStats.goalsScored || 0}
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-footbai-header" />

              {/* Shots */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Shots</div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xl font-semibold">
                    {currentMatch.homeStats.shots || 0}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <Crosshair size={16} />
                    Total
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

              {/* Cards */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Cards</div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    {currentMatch.homeStats.yellowCards || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                    Yellow
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.yellowCards || 0}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    {currentMatch.homeStats.redCards || 0}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm" />
                    Red
                  </div>
                  <div className="text-sm">
                    {currentMatch.awayStats.redCards || 0}
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
