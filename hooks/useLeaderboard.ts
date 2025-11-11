// hooks/useLeaderboard.ts
import { useReducer, useCallback } from 'react';

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
  | { type: 'SET_FILTERS'; payload: Partial<LeaderboardState['filters']> }
  | { type: 'SET_ERROR'; payload: string };

function leaderboardReducer(state: LeaderboardState, action: LeaderboardAction): LeaderboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload, loading: false };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export const useLeaderboard = () => {
  const [state, dispatch] = useReducer(leaderboardReducer, {
    players: [],
    clans: [],
    loading: true,
    error: null,
    filters: {
      season: 'current',
      mode: 'solo',
      search: ''
    }
  });

  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Sua lógica de fetch aqui
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [state.filters.season, state.filters.mode]);

  return { state, dispatch, loadData };
};