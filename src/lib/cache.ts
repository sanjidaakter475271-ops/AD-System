type CacheEntry<T> = {
  data: T;
  expiry: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const serverCache = new MemoryCache();

export function invalidateEquipmentCache() {
  serverCache.invalidatePrefix('equipment:');
  serverCache.invalidatePrefix('not-eligible:');
  serverCache.invalidatePrefix('section-count:');
}
