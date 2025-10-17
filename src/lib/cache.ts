const cache = new Map<string, { value: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = 1000 * 60 * 5) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function withCache<T>(key: string, fn: () => Promise<T>, ttlMs?: number) {
  const cached = getCached<T>(key);
  if (cached) return Promise.resolve(cached);
  return fn().then((value) => {
    setCached(key, value, ttlMs);
    return value;
  });
}
