type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(key: string, ttlMs: number, producer: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const value = await producer();
  store.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
}

export function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  }
}

