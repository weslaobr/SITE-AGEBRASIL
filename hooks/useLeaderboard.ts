// hooks/useLeaderboard.ts
import { useReducer, useCallback } from 'react';

// ====================
// Tipos (Models)
// ====================

export interface Player {
  id: number;
  name: string;
  profile_url: string;
  civilization?: string;
  rank: number;
  points: number;
  elo: number;
  win_rate: number;
  wins: number;
  losses: number;
  total_matches: number;
  last_game: string;
  last_game_timestamp?: number;
  region?: string;
  clan_tag?: string;
  avatar_url?: string;
}

export interface Clan {
  id: number;
  name: string;
  tag: string;
  members: number;
  region?: string;
  rating?: number;
  wins?: number;
  losses?: number;
  win_rate?: number;
  leader?: string;
  logo_url?: string;
}

// ====================
// Estado e Reducer
// ====================

interface LeaderboardState {
  players: Player[];
  clans: Clan[];
  loading: boolean;
  error: string | null;
  filters: {
    season: string;
    mode: string;
    search: string;
  };
}

type LeaderboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'SET_CLANS'; payload: Clan[] }
  | { type: 'SET_FILTERS'; payload: Partial<LeaderboardState['filters']> }
  | { type: 'SET_ERROR'; payload: string };

function leaderboardReducer(state: LeaderboardState, action: LeaderboardAction): LeaderboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_PLAYERS':
      return { ...state, players: action.payload, loading: false };

    case 'SET_CLANS':
      return { ...state, clans: action.payload, loading: false };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    default:
      return state;
  }
}

// ====================
// Hook Principal
// ====================

export const useLeaderboard = () => {
  const [state, dispatch] = useReducer(leaderboardReducer, {
    players: [],
    clans: [],
    loading: true,
    error: null,
    filters: {
      season: 'current',
      mode: 'solo',
      search: '',
    },
  });

  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Exemplo de fetch — substitua pela sua rota real
      const res = await fetch('/api/players');
      const data = await res.json();

      if (data.success) {
        dispatch({ type: 'SET_PLAYERS', payload: data.data || [] });
      } else {
        throw new Error('Erro ao carregar leaderboard');
      }

      // Caso tenha endpoint de clãs:
      const resClans = await fetch('/api/clans');
      if (resClans.ok) {
        const clansData = await resClans.json();
        dispatch({ type: 'SET_CLANS', payload: clansData.data || [] });
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar leaderboard:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [state.filters.season, state.filters.mode]);

  return { state, dispatch, loadData };
};
