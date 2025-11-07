/**
 * In-memory cache implementation for manifest and asset storage
 */

import { ICache, CacheEntry } from '../../../../libs/types';

export class MemoryCache implements ICache {
  private cache: Map<string, CacheEntry<any>>;
  private ttl: number; // Time to live in seconds

  constructor(ttl: number = 300) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry, this.ttl)) {
      await this.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, data: T, etag?: string): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag,
    };
    this.cache.set(key, entry);
  }

  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  isExpired(entry: CacheEntry<any>, ttl: number): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Convert to seconds
    return age > ttl;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, this.ttl)) {
        await this.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
