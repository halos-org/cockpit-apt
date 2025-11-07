/**
 * Cache Manager for APT Bridge API
 *
 * Provides TTL-based caching for API responses to reduce backend calls and improve
 * performance. Each cache entry has a timestamp and TTL, and is automatically
 * invalidated when expired.
 *
 * Features:
 *   - Per-key TTL configuration
 *   - Automatic expiration checking
 *   - Pattern-based invalidation
 *   - Type-safe generic interface
 *
 * Cache Key Patterns:
 *   - details:{packageName} - Package details (TTL: 60s)
 *   - sections - List of sections (TTL: 5min)
 *   - section:{sectionName} - Packages in section (TTL: 2min)
 *   - installed - Installed packages (TTL: 30s)
 *   - upgradable - Upgradable packages (TTL: 30s)
 *   - search:{query} - Search results (TTL: 2min)
 *   - dependencies:{packageName} - Package dependencies (TTL: 5min)
 *   - reverse-deps:{packageName} - Reverse dependencies (TTL: 5min)
 *
 * Usage:
 *   const cache = new CacheManager();
 *
 *   // Set with default TTL
 *   cache.set('details:nginx', packageDetails);
 *
 *   // Get (returns undefined if expired or missing)
 *   const cached = cache.get<PackageDetails>('details:nginx');
 *
 *   // Invalidate all package details
 *   cache.invalidatePattern('details:');
 *
 *   // Clear everything
 *   cache.clear();
 */

/**
 * Cache entry with data, timestamp, and TTL
 */
interface CacheEntry<T = unknown> {
    /** Cached data */
    data: T;
    /** Timestamp when entry was created (ms since epoch) */
    timestamp: number;
    /** Time-to-live in milliseconds */
    ttl: number;
}

/**
 * Default TTL values for different cache key patterns (in milliseconds)
 */
const DEFAULT_TTLS: Record<string, number> = {
    'details:': 60 * 1000,              // 60 seconds for package details
    'sections': 5 * 60 * 1000,          // 5 minutes for sections list
    'section:': 2 * 60 * 1000,          // 2 minutes for packages in section
    'installed': 30 * 1000,             // 30 seconds for installed packages
    'upgradable': 30 * 1000,            // 30 seconds for upgradable packages
    'search:': 2 * 60 * 1000,           // 2 minutes for search results
    'dependencies:': 5 * 60 * 1000,     // 5 minutes for dependencies
    'reverse-deps:': 5 * 60 * 1000,     // 5 minutes for reverse dependencies
};

/**
 * Cache manager for API responses
 */
export class CacheManager {
    private cache: Map<string, CacheEntry>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * Get TTL for a cache key based on key pattern
     *
     * @param key Cache key
     * @returns TTL in milliseconds
     */
    private getTTL(key: string): number {
        // Check for exact match first
        if (key in DEFAULT_TTLS) {
            return DEFAULT_TTLS[key];
        }

        // Check for prefix match
        for (const [pattern, ttl] of Object.entries(DEFAULT_TTLS)) {
            if (key.startsWith(pattern)) {
                return ttl;
            }
        }

        // Default TTL: 1 minute
        return 60 * 1000;
    }

    /**
     * Check if a cache entry is expired
     *
     * @param entry Cache entry to check
     * @returns True if entry is expired
     */
    private isExpired(entry: CacheEntry): boolean {
        const now = Date.now();
        return (now - entry.timestamp) > entry.ttl;
    }

    /**
     * Get cached value if present and not expired
     *
     * @param key Cache key
     * @returns Cached data or undefined if missing/expired
     */
    get<T>(key: string): T | undefined {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;

        if (!entry) {
            return undefined;
        }

        // Check expiration
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.data;
    }

    /**
     * Store value in cache with TTL
     *
     * @param key Cache key
     * @param data Data to cache
     * @param ttl Optional custom TTL in milliseconds (uses default if not provided)
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.getTTL(key),
        };

        this.cache.set(key, entry);
    }

    /**
     * Delete a specific cache entry
     *
     * @param key Cache key to delete
     * @returns True if entry was deleted, false if not found
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Invalidate all cache entries matching a pattern (prefix)
     *
     * @param pattern Prefix pattern to match
     * @returns Number of entries invalidated
     */
    invalidatePattern(pattern: string): number {
        let count = 0;

        for (const key of this.cache.keys()) {
            if (key.startsWith(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Get current cache size (number of entries)
     *
     * @returns Number of cached entries
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Check if cache has a key (regardless of expiration)
     *
     * @param key Cache key
     * @returns True if key exists in cache
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Prune expired entries from cache
     *
     * @returns Number of entries pruned
     */
    prune(): number {
        let count = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }
}

/**
 * Singleton cache manager instance
 */
export const cache = new CacheManager();
