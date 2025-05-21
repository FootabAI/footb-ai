import { create } from 'zustand';
import { Match, Team, MatchStats, MatchEvent, Formation } from '@/types';
import { useTeamStore } from './useTeamStore';
type GameState = {
  currentMatch: Match | null;
  userTeam: Team | null;
  botTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  selectedFormation: Formation;

  // Actions
  setUserTeam: (team: Team | null) => void;
  setCurrentMatch: (match: Match | null) => void;
  setupMatch: (opponent: Team) => void;
  updateMatchStats: (homeStats: Partial<MatchStats>, awayStats: Partial<MatchStats>) => void;
  addMatchEvent: (event: Omit<MatchEvent, 'id'>) => void;
  completeMatch: (winnerId: string) => void;
  resetMatch: () => void;
  simulateMatch: () => void;
  setSelectedFormation: (formation: Formation) => void;
};

const defaultBotTeam: Team = {
  id: 'bot-1',
  name: 'AI United',
  logo: {
    type: 'manual',
    data: {
      initials: 'AI',
      backgroundColor: '#ff4d4d',
      mainColor: '#ff4d4d'
    }
  },
  attributes: {
    passing: 70,
    shooting: 65,
    pace: 75,
    dribbling: 68,
    defending: 72,
    physicality: 80,
  },
  tactic: 'Balanced',
  points: 0,
  isBot: true,
  players: [],
  userId: '',
  formation: '4-3-3',
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentMatch: null,
  userTeam: null,
  botTeam: defaultBotTeam,
  isLoading: false,
  error: null,
  success: null,
  selectedFormation: '4-3-3',

  // Actions
  setUserTeam: (team) => set({ userTeam: team }),
  setCurrentMatch: (match) => {
    console.log('Setting current match:', match);
    set({ currentMatch: match });
  },
  setSelectedFormation: (formation) => set({ selectedFormation: formation }),

  setupMatch: (opponent) => {
    console.log('setupMatch');
    const { team } = useTeamStore.getState();
    if (!team) {
      console.error('No team found for match setup');
      return;
    }

    const initialStats: MatchStats = {
      possession: 50,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      passAccuracy: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      corners: 0,
    };

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      homeTeam: team,
      awayTeam: opponent,
      homeScore: 0,
      awayScore: 0,
      events: [],
      homeStats: { ...initialStats },
      awayStats: { ...initialStats },
      isCompleted: false,
    };

    console.log('Setting up match:', newMatch);
    set({ currentMatch: newMatch, userTeam: team });
  },

  updateMatchStats: (homeStats, awayStats) => {
    const { currentMatch } = get();
    if (!currentMatch) return;

    set({
      currentMatch: {
        ...currentMatch,
        homeStats: { ...currentMatch.homeStats, ...homeStats },
        awayStats: { ...currentMatch.awayStats, ...awayStats },
      },
    });
  },

  addMatchEvent: (event) => {
    const { currentMatch } = get();
    if (!currentMatch) return;

    const newEvent: MatchEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    let homeScore = currentMatch.homeScore;
    let awayScore = currentMatch.awayScore;

    if (event.type === 'goal' && event.teamId !== 'system') {
      if (event.teamId === currentMatch.homeTeam.id) {
        homeScore++;
      } else if (event.teamId === currentMatch.awayTeam.id) {
        awayScore++;
      }
    }

    if (event.type === 'own-goal') {
      if (event.teamId === currentMatch.homeTeam.id) {
        awayScore++;
      } else {
        homeScore++;
      }
    }

    const updatedEvents = [...currentMatch.events, newEvent];

    set({
      currentMatch: {
        ...currentMatch,
        events: updatedEvents,
        homeScore,
        awayScore,
      },
    });
  },

  completeMatch: (winnerId) => {
    const { currentMatch, userTeam } = get();
    if (!currentMatch || !userTeam) return;

    const isUserWinner = winnerId === userTeam.id;
    const pointsEarned = isUserWinner ? 50 : 10;

    set({
      currentMatch: {
        ...currentMatch,
        isCompleted: true,
        winner: winnerId,
      },
      userTeam: {
        ...userTeam,
        points: userTeam.points + pointsEarned,
      },
    });
  },

  resetMatch: () => set({ currentMatch: null }),
  simulateMatch: () => {
    const { currentMatch } = get();
    if (!currentMatch) return;
    console.log('Match simulation started');
  },
}));