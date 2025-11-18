import { useCallback, useRef } from 'react';

const apiCache = new Map<string, { data: any; timestamp: number }>();

interface CacheOptions {
  cacheTime?: number; // tempo em ms (ex: 60000 = 1 min)
  throttleDelay?: number;
}

export const useThrottledApi = (
  apiFn: (...args: any[]) => Promise<any>,
  options: CacheOptions = {}
) => {
  const { cacheTime = 60000, throttleDelay = 1000 } = options;

  const lastCall = useRef(0);

  return useCallback(
    async (...args: any[]) => {
      const now = Date.now();
      const cacheKey = JSON.stringify(args);

      // 1. Verifica cache
      const cached = apiCache.get(cacheKey);
      if (cached && now - cached.timestamp < cacheTime) {
        return cached.data;
      }

      // 2. Throttle
      if (now - lastCall.current < throttleDelay) {
        console.warn('⏳ Aguarde antes de fazer outra requisição');
        throw new Error('Aguarde antes de fazer outra requisição');
      }

      lastCall.current = now;

      // 3. Chamada real à API
      const result = await apiFn(...args);

      // 4. Salva no cache
      apiCache.set(cacheKey, {
        data: result,
        timestamp: now,
      });

      return result;
    },
    [apiFn, cacheTime, throttleDelay]
  );
};
