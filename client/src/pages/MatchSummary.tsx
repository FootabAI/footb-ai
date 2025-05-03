import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/useGameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import TeamLogo from '@/components/TeamLogo';
import { CheckCircle2, XCircle, Trophy, ArrowRight } from 'lucide-react';
import StatBar from '@/components/StatBar';
import { useTeamStore } from '@/stores/useTeamStore';
const MatchSummary = () => {
  const navigate = useNavigate();
  const { team } = useTeamStore();
  const { currentMatch, resetMatch } = useGameStore();

  // If no match found, redirect to play page
  useEffect(() => {
    if (!currentMatch) {
      navigate('/play');
    }
  }, [currentMatch, navigate]);

  if (!currentMatch || !team) return null;

  const { homeTeam, awayTeam, homeScore, awayScore, homeStats, awayStats } = currentMatch;
  
  // Determine if user team won
  const userTeamId = team.id;
  const isUserHome = homeTeam.id === userTeamId;
  const userScore = isUserHome ? homeScore : awayScore;
  const opponentScore = isUserHome ? awayScore : homeScore;
  const didUserWin = isUserHome ? homeScore > awayScore : awayScore > homeScore;
  const isDraw = homeScore === awayScore;
  
  const resultClass = didUserWin ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
  const resultText = didUserWin ? 'Victory' : isDraw ? 'Draw' : 'Defeat';
  const resultIcon = didUserWin ? <CheckCircle2 size={20} className="text-green-400 mr-2" /> : 
                                  isDraw ? null : 
                                  <XCircle size={20} className="text-red-400 mr-2" />;

  // Format stats for display
  const formatStat = (value: number | undefined) => {
    return value !== undefined ? value : 0;
  };

  const handlePlayAgain = () => {
    resetMatch();
    navigate('/play');
  };

  const handleReturnToDashboard = () => {
    resetMatch();
    navigate('/dashboard');
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Match Summary</h1>
        <div className="flex items-center text-gray-400">
          <span>{homeTeam.name} vs {awayTeam.name}</span>
        </div>
      </header>

      {/* Match result */}
      <Card className="mb-6 bg-footbai-container border-footbai-header">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center">
              <TeamLogo logo={homeTeam.logo} size="lg" />
              <h3 className="text-lg font-semibold mt-3">{homeTeam.name}</h3>
              <p className="text-sm text-gray-400">{homeTeam.tactic} Tactic</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold mb-3">
                {homeScore} - {awayScore}
              </div>
              <div className="flex items-center">
                {resultIcon}
                <span className={`font-semibold ${resultClass}`}>{resultText}</span>
              </div>
              <div className="mt-3 text-sm text-gray-400">Final Score</div>
            </div>
            
            <div className="flex flex-col items-center">
              <TeamLogo logo={awayTeam.logo} size="lg" />
              <h3 className="text-lg font-semibold mt-3">{awayTeam.name}</h3>
              <p className="text-sm text-gray-400">{awayTeam.tactic} Tactic</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match stats */}
      <Card className="mb-6 bg-footbai-container border-footbai-header">
        <CardHeader className="bg-footbai-header pb-3">
          <CardTitle>Match Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Possession */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">
                  {formatStat(Math.round(homeStats.possession))}%
                </div>
                <div className="text-sm text-gray-400">Possession</div>
                <div className="text-lg font-semibold">
                  {formatStat(Math.round(awayStats.possession))}%
                </div>
              </div>
              <div className="flex h-2 rounded overflow-hidden">
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${homeStats.possession}%` }}
                ></div>
                <div 
                  className="bg-red-500" 
                  style={{ width: `${awayStats.possession}%` }}
                ></div>
              </div>
            </div>
            
            {/* Shots */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">{formatStat(homeStats.shots)}</div>
                <div className="text-sm text-gray-400">Shots</div>
                <div className="text-lg font-semibold">{formatStat(awayStats.shots)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatBar 
                  value={formatStat(homeStats.shots)} 
                  maxValue={Math.max(formatStat(homeStats.shots), formatStat(awayStats.shots), 1)}
                  color={homeTeam.logo.backgroundColor || "#62df6e"}
                  showValue={false}
                />
                <StatBar 
                  value={formatStat(awayStats.shots)}
                  maxValue={Math.max(formatStat(homeStats.shots), formatStat(awayStats.shots), 1)}
                  color={awayTeam.logo.backgroundColor || "#ff4d4d"}
                  showValue={false}
                />
              </div>
            </div>
            
            {/* Shots on target */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">{formatStat(homeStats.shotsOnTarget)}</div>
                <div className="text-sm text-gray-400">Shots on Target</div>
                <div className="text-lg font-semibold">{formatStat(awayStats.shotsOnTarget)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatBar 
                  value={formatStat(homeStats.shotsOnTarget)} 
                  maxValue={Math.max(formatStat(homeStats.shotsOnTarget), formatStat(awayStats.shotsOnTarget), 1)}
                  color={homeTeam.logo.backgroundColor || "#62df6e"}
                  showValue={false}
                />
                <StatBar 
                  value={formatStat(awayStats.shotsOnTarget)}
                  maxValue={Math.max(formatStat(homeStats.shotsOnTarget), formatStat(awayStats.shotsOnTarget), 1)}
                  color={awayTeam.logo.backgroundColor || "#ff4d4d"}
                  showValue={false}
                />
              </div>
            </div>
            
            <Separator className="bg-footbai-header" />
            
            {/* Passes */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">{formatStat(homeStats.passes)}</div>
                <div className="text-sm text-gray-400">Passes</div>
                <div className="text-lg font-semibold">{formatStat(awayStats.passes)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatBar 
                  value={formatStat(homeStats.passes)} 
                  maxValue={Math.max(formatStat(homeStats.passes), formatStat(awayStats.passes), 1)}
                  color={homeTeam.logo.backgroundColor || "#62df6e"}
                  showValue={false}
                />
                <StatBar 
                  value={formatStat(awayStats.passes)}
                  maxValue={Math.max(formatStat(homeStats.passes), formatStat(awayStats.passes), 1)}
                  color={awayTeam.logo.backgroundColor || "#ff4d4d"}
                  showValue={false}
                />
              </div>
            </div>
            
            {/* Pass accuracy */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">{Math.round(formatStat(homeStats.passAccuracy))}%</div>
                <div className="text-sm text-gray-400">Pass Accuracy</div>
                <div className="text-lg font-semibold">{Math.round(formatStat(awayStats.passAccuracy))}%</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatBar 
                  value={formatStat(homeStats.passAccuracy)} 
                  maxValue={100}
                  color={homeTeam.logo.backgroundColor || "#62df6e"}
                  showValue={false}
                />
                <StatBar 
                  value={formatStat(awayStats.passAccuracy)}
                  maxValue={100}
                  color={awayTeam.logo.backgroundColor || "#ff4d4d"}
                  showValue={false}
                />
              </div>
            </div>
            
            <Separator className="bg-footbai-header" />
            
            {/* Cards & Fouls */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex justify-center">
                  <div className="text-lg font-semibold">{formatStat(homeStats.fouls)}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">Fouls</div>
                <div className="text-lg font-semibold mt-2">{formatStat(awayStats.fouls)}</div>
              </div>
              
              <div>
                <div className="flex justify-center">
                  <div className="text-lg font-semibold">{formatStat(homeStats.yellowCards)}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">Yellow Cards</div>
                <div className="text-lg font-semibold mt-2">{formatStat(awayStats.yellowCards)}</div>
              </div>
              
              <div>
                <div className="flex justify-center">
                  <div className="text-lg font-semibold">{formatStat(homeStats.redCards)}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">Red Cards</div>
                <div className="text-lg font-semibold mt-2">{formatStat(awayStats.redCards)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward card */}
      <Card className={`mb-6 bg-footbai-container ${didUserWin ? 'border-green-500/30' : 'border-footbai-header'}`}>
        <CardHeader className={`${didUserWin ? 'bg-green-500/10' : 'bg-footbai-header'} pb-3`}>
          <CardTitle className="flex items-center">
            {didUserWin && <Trophy size={20} className="mr-2 text-yellow-500" />}
            {didUserWin ? 'Match Rewards' : 'Match Results'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {didUserWin ? (
            <div className="text-center">
              <div className="text-lg mb-2">Congratulations on your victory!</div>
              <div className="flex justify-center items-center space-x-2 my-4">
                <div className="text-3xl font-bold text-footbai-accent">+50</div>
                <div className="text-gray-400">points earned</div>
              </div>
              <p className="text-sm text-gray-300">
                Use these points to upgrade your team attributes and become even stronger.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-lg mb-2">{isDraw ? "It's a draw!" : "Better luck next time!"}</div>
              <div className="flex justify-center items-center space-x-2 my-4">
                <div className="text-3xl font-bold text-gray-400">+10</div>
                <div className="text-gray-500">points earned</div>
              </div>
              <p className="text-sm text-gray-300">
                {isDraw 
                  ? "A solid performance, but there's room for improvement."
                  : "Learn from this defeat and come back stronger."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Button
          variant="outline"
          className="bg-footbai-container hover:bg-footbai-hover border-footbai-header"
          onClick={handlePlayAgain}
        >
          Play Another Match
        </Button>
        <Button
          className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
          onClick={handleReturnToDashboard}
        >
          Return to Dashboard
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default MatchSummary;