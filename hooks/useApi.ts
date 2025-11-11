// hooks/useApi.ts
import { useCallback, useRef } from 'react';

export const useThrottledApi = (apiFn: Function, delay: number = 1000) => {
  const lastCall = useRef(0);

  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current < delay) {
      return Promise.reject(new Error('Aguarde antes de fazer outra requisição'));
    }
    
    lastCall.current = now;
    return apiFn(...args);
  }, [apiFn, delay]);
};

// Uso no seu componente
const throttledLoadData = useThrottledApi(loadLeaderboardData, 2000);