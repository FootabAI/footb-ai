import { create } from 'zustand';
import { Match, Team, MatchStats, MatchEvent, Formation } from '@/types';
import { useTeamStore } from './useTeamStore';

type GameState = {
  currentMatch: Match | null;
  userTeam: Team | null;
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
  completeMatch: (winnerId: string) => Promise<void>;
  resetMatch: () => void;
  simulateMatch: () => void;
  setSelectedFormation: (formation: Formation) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  currentMatch: null,
  userTeam: null,
  isLoading: false,
  error: null,
  success: null,
  selectedFormation: '4-4-2',

  setUserTeam: (team) => set({ userTeam: team }),
  setCurrentMatch: (match) => set({ currentMatch: match }),
  setSelectedFormation: (formation) => set({ selectedFormation: formation }),

  setupMatch: (opponent) => {
    const userTeam = useTeamStore.getState().team;
    if (!userTeam) return;

    const match: Match = {
      id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      homeTeam: userTeam,
      awayTeam: opponent,
      homeScore: 0,
      awayScore: 0,
      events: [],
      homeStats: {
        goalsScored: 0,
        goalsConceded: 0,
        cleanSheets: 0,
        totalMatches: 0,
        form: [],
        wins: 0,
        losses: 0,
        draws: 0,
        shots: 0,
        shotsOnTarget: 0,
        yellowCards: 0,
        redCards: 0,
        
      },
      awayStats: {
        goalsScored: 0,
        goalsConceded: 0,
        cleanSheets: 0,
        totalMatches: 0,
        form: [],
        wins: 0,
        losses: 0,
        draws: 0,
        shots: 0,
        shotsOnTarget: 0,
        yellowCards: 0,
        redCards: 0,
      },
      isCompleted: false,
    };

    set({ currentMatch: match });
  },

  updateMatchStats: (homeStats, awayStats) => {
    set((state) => {
      if (!state.currentMatch) return state;

      return {
        currentMatch: {
          ...state.currentMatch,
          homeStats: {
            ...state.currentMatch.homeStats,
            ...homeStats,
          },
          awayStats: {
            ...state.currentMatch.awayStats,
            ...awayStats,
          },
        },
      };
    });
  },

  addMatchEvent: (event) => {
    set((state) => {
      if (!state.currentMatch) return state;

      const newEvent = {
        ...event,
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      return {
        currentMatch: {
          ...state.currentMatch,
          events: [...state.currentMatch.events, newEvent],
        },
      };
    });
  },

  completeMatch: async (winnerId) => {
    const { currentMatch } = get();
    if (!currentMatch) return;

    const { homeTeam, awayTeam, homeStats, awayStats } = currentMatch;
    const isHomeWinner = homeTeam.id === winnerId;
    const isAwayWinner = awayTeam.id === winnerId;

    // Update match state
    set((state) => ({
      currentMatch: {
        ...state.currentMatch!,
        homeScore: isHomeWinner ? state.currentMatch!.homeScore + 1 : state.currentMatch!.homeScore,
        awayScore: isAwayWinner ? state.currentMatch!.awayScore + 1 : state.currentMatch!.awayScore,
        isCompleted: true,
      },
    }));

    // Update team stats
    const teamStore = useTeamStore.getState();
    const userTeam = teamStore.team;
    
    if (userTeam) {
      const isUserHome = userTeam.id === homeTeam.id;
      const userStats = isUserHome ? homeStats : awayStats;
      const opponentStats = isUserHome ? awayStats : homeStats;

      // Calculate new team stats
      const newStats = {
        totalMatches: (userTeam.teamStats?.totalMatches || 0) + 1,
        wins: (userTeam.teamStats?.wins || 0) + (isUserHome ? (isHomeWinner ? 1 : 0) : (isAwayWinner ? 1 : 0)),
        draws: (userTeam.teamStats?.draws || 0) + (homeStats.shots === awayStats.shots ? 1 : 0),
        losses: (userTeam.teamStats?.losses || 0) + (isUserHome ? (isAwayWinner ? 1 : 0) : (isHomeWinner ? 1 : 0)),
        goalsScored: (userTeam.teamStats?.goalsScored || 0) + (isUserHome ? homeStats.shots : awayStats.shots),
        goalsConceded: (userTeam.teamStats?.goalsConceded || 0) + (isUserHome ? awayStats.shots : homeStats.shots),
        cleanSheets: (userTeam.teamStats?.cleanSheets || 0) + (isUserHome ? (awayStats.shots === 0 ? 1 : 0) : (homeStats.shots === 0 ? 1 : 0)),
      };

      // Update team stats in Firestore
      await teamStore.updateTeamStats(newStats);
    }
  },

  resetMatch: () => {
    set({
      currentMatch: null,
      isLoading: false,
      error: null,
      success: null,
    });
  },

  simulateMatch: () => {
    // This will be implemented later
    console.log('Match simulation not implemented yet');
  },
}));