// hooks/useApi.ts
import { useCallback, useRef } from 'react';

/**
 * Hook para limitar a frequência de chamadas à API (throttle).
 * Exemplo de uso:
 *   const throttledFetch = useThrottledApi(fetchPlayers, 2000);
 */
export const useThrottledApi = (apiFn: (...args: any[]) => Promise<any>, delay: number = 1000) => {
  const lastCall = useRef(0);

  return useCallback(
    async (...args: any[]) => {
      const now = Date.now();

      if (now - lastCall.current < delay) {
        console.warn('⏳ Aguarde antes de fazer outra requisição');
        throw new Error('Aguarde antes de fazer outra requisição');
      }

      lastCall.current = now;
      return await apiFn(...args);
    },
    [apiFn, delay]
  );
};
