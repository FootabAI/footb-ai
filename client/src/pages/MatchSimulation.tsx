import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, MatchEvent } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamTactic } from '@/contexts/GameContext';
import TeamLogo from '@/components/TeamLogo';
import { Play, Pause, Clock, Flag, AlertCircle, Goal, ArrowUpRight, CornerUpRight, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MatchSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    currentMatch, 
    userTeam, 
    addMatchEvent, 
    updateMatchStats, 
    completeMatch
  } = useGame();

  const [isPlaying, setIsPlaying] = useState(false);
  const [minute, setMinute] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [isFullTime, setIsFullTime] = useState(false);
  const [changeTactic, setChangeTactic] = useState<TeamTactic | null>(null);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  
  // Refs for scrolling
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Simulation variables
  const totalMinutes = 90;
  const halfTime = 45;
  const simulationSpeed = 300; // milliseconds per minute

  // Hard-coded simulation events
  const hardCodedEvents = [
    { minute: 1, type: 'goal', teamId: 'system', description: 'The match has started!' },
    { minute: 5, type: 'goal', teamId: 'home', description: 'GOAL! J. Smith scores for the home team!' },
    { minute: 12, type: 'card', teamId: 'away', description: 'Yellow Card: A. Johnson is booked for a foul.' },
    { minute: 18, type: 'substitution', teamId: 'home', description: 'Substitution: T. Williams comes on for R. Brown.' },
    { minute: 24, type: 'injury', teamId: 'away', description: 'Injury Concern: M. Garcia is down and receiving treatment.' },
    { minute: 32, type: 'goal', teamId: 'away', description: 'GOAL! P. Martinez scores for the away team!' },
    { minute: 45, type: 'goal', teamId: 'system', description: 'Half Time! The players head to the dressing room.' },
    { minute: 46, type: 'goal', teamId: 'system', description: 'Second half begins!' },
    { minute: 52, type: 'goal', teamId: 'home', description: 'GOAL! C. Wilson scores for the home team!' },
    { minute: 61, type: 'card', teamId: 'home', description: 'Yellow Card: D. Thomas is booked for a late challenge.' },
    { minute: 68, type: 'goal', teamId: 'away', description: 'GOAL! F. Rodriguez scores for the away team!' },
    { minute: 75, type: 'substitution', teamId: 'away', description: 'Substitution: L. Taylor comes on for K. Anderson.' },
    { minute: 84, type: 'goal', teamId: 'home', description: 'GOAL! S. Jackson scores for the home team!' },
    { minute: 90, type: 'goal', teamId: 'system', description: 'Full Time! The match has ended.' },
  ];

  // Stats update points
  const statsUpdates = [
    { minute: 5, home: { possession: 55, shots: 1, shotsOnTarget: 1, passes: 20, passAccuracy: 85 }, away: { possession: 45, shots: 0, shotsOnTarget: 0, passes: 12, passAccuracy: 78 } },
    { minute: 15, home: { possession: 52, shots: 2, shotsOnTarget: 1, passes: 45, passAccuracy: 82 }, away: { possession: 48, shots: 1, shotsOnTarget: 0, passes: 35, passAccuracy: 75 } },
    { minute: 30, home: { possession: 48, shots: 3, shotsOnTarget: 2, passes: 78, passAccuracy: 81 }, away: { possession: 52, shots: 3, shotsOnTarget: 1, passes: 80, passAccuracy: 79 } },
    { minute: 45, home: { possession: 50, shots: 4, shotsOnTarget: 2, passes: 120, passAccuracy: 83, fouls: 2, yellowCards: 0 }, away: { possession: 50, shots: 5, shotsOnTarget: 2, passes: 110, passAccuracy: 77, fouls: 3, yellowCards: 1 } },
    { minute: 60, home: { possession: 53, shots: 6, shotsOnTarget: 3, passes: 180, passAccuracy: 80, fouls: 3, yellowCards: 1 }, away: { possession: 47, shots: 7, shotsOnTarget: 3, passes: 165, passAccuracy: 76, fouls: 4, yellowCards: 1 } },
    { minute: 75, home: { possession: 51, shots: 8, shotsOnTarget: 4, passes: 230, passAccuracy: 79, fouls: 5, yellowCards: 1 }, away: { possession: 49, shots: 8, shotsOnTarget: 3, passes: 215, passAccuracy: 78, fouls: 5, yellowCards: 1 } },
    { minute: 90, home: { possession: 50, shots: 10, shotsOnTarget: 5, passes: 280, passAccuracy: 81, fouls: 6, yellowCards: 1 }, away: { possession: 50, shots: 9, shotsOnTarget: 4, passes: 270, passAccuracy: 77, fouls: 7, yellowCards: 2 } },
  ];

  useEffect(() => {
    // If there's no currentMatch or userTeam, redirect to the play page
    if (!currentMatch || !userTeam) {
      navigate('/play');
      return;
    }
  }, [currentMatch, userTeam, navigate]);

  if (!currentMatch || !userTeam) {
    return null; // Return early if no match or team
  }

  // Get the home and away teams
  const { homeTeam, awayTeam, homeScore, awayScore, events } = currentMatch;

  useEffect(() => {
    // Start simulation after a short delay
    const timer = setTimeout(() => {
      setIsPlaying(true);
      
      // Add match start event
      const startEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'goal' as const, 
        minute: 0,
        teamId: 'system',
        description: 'The match has started!',
      };
      
      setMatchEvents([startEvent]);
      
      // Also add to the context
      addMatchEvent({
        type: 'goal',
        minute: 0,
        teamId: 'system',
        description: 'The match has started!',
      });

      // Update initial stats
      updateMatchStats(
        { possession: 50, passes: 0, passAccuracy: 80 },
        { possession: 50, passes: 0, passAccuracy: 75 }
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to the bottom of the events container when new events are added
  useEffect(() => {
    if (!matchEvents || matchEvents.length === 0) return;

    const scrollToBottom = () => {
      // Direct access to the viewport element using its ref
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    };
    
    // We need to do this after rendering is complete
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [matchEvents]);

  useEffect(() => {
    let simulationInterval: ReturnType<typeof setInterval>;

    if (isPlaying && !isFullTime) {
      simulationInterval = setInterval(() => {
        setMinute(prev => {
          const newMinute = prev + 1;
          
          // Check for half time
          if (newMinute === halfTime && !isHalfTime) {
            setIsPlaying(false);
            setIsHalfTime(true);
            
            return newMinute;
          }
          
          // Check for full time
          if (newMinute >= totalMinutes) {
            setIsPlaying(false);
            setIsFullTime(true);
            
            // Determine the winner based on score
            if (homeScore > awayScore) {
              completeMatch(homeTeam.id);
            } else if (awayScore > homeScore) {
              completeMatch(awayTeam.id);
            } else {
              // It's a draw, give it to home team for MVP simplicity
              completeMatch(homeTeam.id);
            }
            
            // Navigate to summary after a delay
            setTimeout(() => {
              navigate('/summary');
            }, 5000);
            
            return totalMinutes;
          }
          
          // Process hard-coded events for this minute
          processHardCodedEvents(newMinute);
          
          // Update stats for this minute
          updateHardCodedStats(newMinute);
          
          return newMinute;
        });
      }, simulationSpeed);
    }

    return () => {
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [isPlaying, isFullTime, isHalfTime]);

  // Process hard-coded events for the current minute
  const processHardCodedEvents = (currentMinute: number) => {
    const eventsForThisMinute = hardCodedEvents.filter(event => event.minute === currentMinute);
    
    if (eventsForThisMinute.length > 0) {
      const newEvents = eventsForThisMinute.map(event => {
        let teamId: string;
        
        // Determine which team ID to use based on 'home' or 'away'
        if (event.teamId === 'home') {
          teamId = homeTeam.id;
        } else if (event.teamId === 'away') {
          teamId = awayTeam.id;
        } else {
          teamId = event.teamId;
        }
        
        // Create the event object with a unique ID
        const newEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: event.type as any,
          minute: currentMinute,
          teamId: teamId,
          description: event.description,
        };
        
        // Also add to the context
        addMatchEvent({
          type: event.type as any,
          minute: currentMinute,
          teamId: teamId,
          description: event.description,
        });
        
        return newEvent;
      });
      
      // Update the local state with the new events
      setMatchEvents(prev => [...prev, ...newEvents]);
    }
  };

  // Update stats based on hard-coded data
  const updateHardCodedStats = (currentMinute: number) => {
    // Find the closest stats update point that's less than or equal to the current minute
    const relevantUpdate = [...statsUpdates]
      .reverse()
      .find(update => update.minute <= currentMinute);
    
    if (relevantUpdate) {
      updateMatchStats(relevantUpdate.home, relevantUpdate.away);
    }
  };

  const handleContinue = () => {
    setIsHalfTime(false);
    
    // Apply tactic change if selected
    if (changeTactic) {
      // In MVP, just show a message
      toast({
        title: 'Tactic Changed',
        description: `Your team is now using the ${changeTactic} tactic.`,
      });
      setChangeTactic(null);
    }
    
    setTimeout(() => setIsPlaying(true), 500);
  };

  const handleForfeit = () => {
    // End the match with a forfeit
    const forfeitEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'goal' as const,
      minute: minute,
      teamId: 'system',
      description: `${homeTeam.name} has forfeited the match.`,
    };
    
    setMatchEvents(prev => [...prev, forfeitEvent]);
    
    // Also add to the context
    addMatchEvent({
      type: 'goal',
      minute: minute,
      teamId: 'system',
      description: `${homeTeam.name} has forfeited the match.`,
    });
    
    // Give the win to the away team
    completeMatch(awayTeam.id);
    
    // Navigate to summary after a delay
    setTimeout(() => {
      navigate('/summary');
    }, 2000);
  };

  const formatMatchTime = (minutes: number) => {
    if (minutes === 45) return "45' (HT)";
    if (minutes === 90) return "90' (FT)";
    if (minutes > 45 && minutes < 50) return `45+${minutes - 45}'`;
    if (minutes > 90) return `90+${minutes - 90}'`;
    return `${minutes}'`;
  };

  const getEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal':
        return <Goal className="w-5 h-5 text-green-500" />;
      case 'card':
        return <div className="w-4 h-5 bg-yellow-500 rounded-sm" />; 
      case 'injury':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'substitution':
        return <ArrowUpRight className="w-5 h-5 text-blue-500" />;
      case 'own-goal':
        return <Goal className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventBorderColor = (event: MatchEvent) => {
    if (event.teamId === 'system') {
      return 'border-gray-700';
    }
    
    const isUserTeam = event.teamId === userTeam.id;
    
    switch (event.type) {
      case 'goal':
        return isUserTeam ? 'border-green-500' : 'border-red-500';
      case 'card':
        return 'border-yellow-500';
      case 'injury':
        return 'border-red-500';
      case 'substitution':
        return 'border-blue-500';
      case 'own-goal':
        return 'border-purple-500';
      default:
        return 'border-gray-700';
    }
  };

  const getEventBgColor = (event: MatchEvent) => {
    if (event.teamId === 'system') {
      return 'bg-footbai-header';
    }
    
    switch (event.type) {
      case 'goal':
        return 'bg-green-500/20';
      case 'card':
        return 'bg-yellow-500/20';
      case 'injury':
        return 'bg-red-500/20';
      case 'substitution':
        return 'bg-blue-500/20';
      case 'own-goal':
        return 'bg-purple-500/20';
      default:
        return 'bg-footbai-header';
    }
  };

  const getEventTextColor = (event: MatchEvent) => {
    if (event.teamId === 'system') {
      return 'text-gray-300';
    }
    switch (event.type) {
      case 'goal':
        return 'text-green-400';
      case 'card':
        return 'text-yellow-400';
      case 'injury':
        return 'text-red-400';
      case 'substitution':
        return 'text-blue-400';
      case 'own-goal':
        return 'text-purple-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Match Simulation</h1>
        <div className="flex items-center">
          <Clock size={16} className="mr-2 text-gray-400" />
          <span className="text-gray-400">
            {isFullTime ? "Full Time" : isHalfTime ? "Half Time" : `Match Time: ${formatMatchTime(minute)}`}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6 bg-footbai-container border-footbai-header">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <TeamLogo logo={homeTeam.logo} size="lg" />
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{homeTeam.name}</h3>
                    <p className="text-xs text-gray-400">{homeTeam.tactic}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center bg-footbai-header px-6 py-3 rounded-lg">
                  <div className="text-center mr-4">
                    <div className="text-3xl font-bold">{homeScore}</div>
                    <div className="text-xs text-gray-400">HOME</div>
                  </div>
                  <div className="text-xl font-bold px-2">-</div>
                  <div className="text-center ml-4">
                    <div className="text-3xl font-bold">{awayScore}</div>
                    <div className="text-xs text-gray-400">AWAY</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{awayTeam.name}</h3>
                    <p className="text-xs text-gray-400">{awayTeam.tactic}</p>
                  </div>
                  <TeamLogo logo={awayTeam.logo} size="lg" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6 bg-footbai-container border-footbai-header">
            <CardContent className="p-4">
              <div className="mb-1 flex justify-between text-xs">
                <span>Kick Off</span>
                <span>Half Time</span>
                <span>Full Time</span>
              </div>
              <Progress value={(minute / totalMinutes) * 100} className="h-2 bg-footbai-header" />
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm">
                  {formatMatchTime(minute)}
                </div>
                <div className="space-x-2">
                  {!isFullTime && (
                    isPlaying ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsPlaying(false)}
                        className="bg-footbai-header hover:bg-footbai-hover"
                      >
                        <Pause size={16} className="mr-2" />
                        Pause
                      </Button>
                    ) : (
                      !isHalfTime && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsPlaying(true)}
                          className="bg-footbai-header hover:bg-footbai-hover"
                        >
                          <Play size={16} className="mr-2" />
                          Resume
                        </Button>
                      )
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {isHalfTime && (
            <Card className="mb-6 bg-footbai-container border-footbai-header border-yellow-500/50">
              <CardHeader className="bg-yellow-500/10 pb-3">
                <CardTitle className="text-yellow-500 flex items-center">
                  <AlertCircle size={18} className="mr-2" />
                  Half Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-300 mb-4">
                  It's half-time! You can make tactical changes before the second half begins.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Change Team Tactic</label>
                    <Select
                      value={changeTactic || homeTeam.tactic}
                      onValueChange={(value) => setChangeTactic(value as TeamTactic)}
                    >
                      <SelectTrigger className="bg-footbai-header border-footbai-hover">
                        <SelectValue placeholder="Select tactic" />
                      </SelectTrigger>
                      <SelectContent className="bg-footbai-container border-footbai-hover">
                        <SelectItem value="Balanced">Balanced</SelectItem>
                        <SelectItem value="Offensive">Offensive</SelectItem>
                        <SelectItem value="Defensive">Defensive</SelectItem>
                        <SelectItem value="Counter-Attacking">Counter-Attacking</SelectItem>
                        <SelectItem value="Aggressive">Aggressive</SelectItem>
                        <SelectItem value="Possession-Based">Possession-Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between">
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
          
          <Card className="bg-footbai-container border-footbai-header">
            <CardHeader className="bg-footbai-header pb-3">
              <CardTitle>Match Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea 
                className="h-[400px]" 
                ref={scrollAreaRef}
                viewportRef={viewportRef}
              >
                <div className="p-4">
                  {(!matchEvents || matchEvents.length === 0) && (
                    <div className="text-center py-6 text-gray-400">
                      Match events will appear here once the simulation begins.
                    </div>
                  )}
                  <div className="space-y-2">
                    {matchEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className={`p-3 rounded-lg ${getEventBgColor(event)} border-l-4 ${getEventBorderColor(event)} animate-fade-in`}
                      >
                        <div className="flex items-start">
                          <div className="bg-footbai-container px-2 py-1 rounded mr-3 text-xs font-medium">
                            {formatMatchTime(event.minute)}
                          </div>
                          <div className="flex-1 flex items-start">
                            <span className="mt-0.5 mr-2">{getEventIcon(event)}</span>
                            <p className={getEventTextColor(event)}>
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div ref={eventsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="bg-footbai-container border-footbai-header sticky top-4">
            <CardHeader className="bg-footbai-header pb-3">
              <CardTitle>Match Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span>{Math.round(currentMatch.homeStats.possession)}%</span>
                  <span className="text-gray-400">Possession</span>
                  <span>{Math.round(currentMatch.awayStats.possession)}%</span>
                </div>
                <div className="flex h-2 rounded overflow-hidden">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${currentMatch.homeStats.possession}%` }}
                  ></div>
                  <div 
                    className="bg-red-500" 
                    style={{ width: `${currentMatch.awayStats.possession}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xl font-semibold">{currentMatch.homeStats.shots || 0}</div>
                  <div className="text-sm text-gray-400">Shots</div>
                  <div className="text-xl font-semibold">{currentMatch.awayStats.shots || 0}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">{currentMatch.homeStats.shotsOnTarget || 0}</div>
                  <div className="text-xs text-gray-400">On Target</div>
                  <div className="text-sm">{currentMatch.awayStats.shotsOnTarget || 0}</div>
                </div>
              </div>
              
              <Separator className="my-4 bg-footbai-header" />
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xl font-semibold">{currentMatch.homeStats.passes || 0}</div>
                  <div className="text-sm text-gray-400">Passes</div>
                  <div className="text-xl font-semibold">{currentMatch.awayStats.passes || 0}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">{Math.round(currentMatch.homeStats.passAccuracy || 0)}%</div>
                  <div className="text-xs text-gray-400">Accuracy</div>
                  <div className="text-sm">{Math.round(currentMatch.awayStats.passAccuracy || 0)}%</div>
                </div>
              </div>
              
              <Separator className="my-4 bg-footbai-header" />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">{currentMatch.homeStats.fouls || 0}</div>
                  <div className="text-xs text-gray-400">Fouls</div>
                  <div className="text-sm">{currentMatch.awayStats.fouls || 0}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">{currentMatch.homeStats.yellowCards || 0}</div>
                  <div className="text-xs text-gray-400">Yellow Cards</div>
                  <div className="text-sm">{currentMatch.awayStats.yellowCards || 0}</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm">{currentMatch.homeStats.redCards || 0}</div>
                  <div className="text-xs text-gray-400">Red Cards</div>
                  <div className="text-sm">{currentMatch.awayStats.redCards || 0}</div>
                </div>
              </div>
              
              <Separator className="my-4 bg-footbai-header" />
              
              <div className="text-sm">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">{homeTeam.name}</span>
                  <span className="text-gray-400">Tactic</span>
                  <span className="font-semibold">{awayTeam.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{homeTeam.tactic}</span>
                  <span className="text-transparent">-</span>
                  <span>{awayTeam.tactic}</span>
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
