/**
 * Tests for cache-manager.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheManager, cache } from '../cache-manager';

describe('CacheManager', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
        cacheManager = new CacheManager();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Basic Operations', () => {
        it('should store and retrieve values', () => {
            cacheManager.set('test-key', 'test-value');
            const result = cacheManager.get<string>('test-key');
            expect(result).toBe('test-value');
        });

        it('should return undefined for missing keys', () => {
            const result = cacheManager.get('nonexistent');
            expect(result).toBeUndefined();
        });

        it('should store complex objects', () => {
            const obj = { name: 'nginx', version: '1.18.0', installed: false };
            cacheManager.set('details:nginx', obj);
            const result = cacheManager.get<typeof obj>('details:nginx');
            expect(result).toEqual(obj);
        });

        it('should delete entries', () => {
            cacheManager.set('test', 'value');
            expect(cacheManager.has('test')).toBe(true);

            const deleted = cacheManager.delete('test');
            expect(deleted).toBe(true);
            expect(cacheManager.has('test')).toBe(false);
        });

        it('should return false when deleting nonexistent key', () => {
            const deleted = cacheManager.delete('nonexistent');
            expect(deleted).toBe(false);
        });

        it('should clear all entries', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');
            cacheManager.set('key3', 'value3');

            expect(cacheManager.size()).toBe(3);

            cacheManager.clear();
            expect(cacheManager.size()).toBe(0);
        });

        it('should report cache size', () => {
            expect(cacheManager.size()).toBe(0);

            cacheManager.set('key1', 'value1');
            expect(cacheManager.size()).toBe(1);

            cacheManager.set('key2', 'value2');
            expect(cacheManager.size()).toBe(2);

            cacheManager.delete('key1');
            expect(cacheManager.size()).toBe(1);
        });

        it('should check if key exists', () => {
            cacheManager.set('test', 'value');
            expect(cacheManager.has('test')).toBe(true);
            expect(cacheManager.has('nonexistent')).toBe(false);
        });
    });

    describe('TTL and Expiration', () => {
        it('should return undefined for expired entries', () => {
            cacheManager.set('test', 'value', 1000); // 1 second TTL

            // Value should be available immediately
            expect(cacheManager.get('test')).toBe('value');

            // Advance time by 500ms - still valid
            vi.advanceTimersByTime(500);
            expect(cacheManager.get('test')).toBe('value');

            // Advance time by another 600ms - now expired
            vi.advanceTimersByTime(600);
            expect(cacheManager.get('test')).toBeUndefined();
        });

        it('should remove expired entries on get', () => {
            cacheManager.set('test', 'value', 1000);
            expect(cacheManager.size()).toBe(1);

            // Expire the entry
            vi.advanceTimersByTime(1100);
            cacheManager.get('test');

            // Should be removed
            expect(cacheManager.size()).toBe(0);
        });

        it('should use default TTL for package details (60s)', () => {
            cacheManager.set('details:nginx', { name: 'nginx' });

            // Should be valid at 50s
            vi.advanceTimersByTime(50 * 1000);
            expect(cacheManager.get('details:nginx')).toBeDefined();

            // Should be expired at 70s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('details:nginx')).toBeUndefined();
        });

        it('should use default TTL for sections (5min)', () => {
            cacheManager.set('sections', [{ name: 'web', count: 10 }]);

            // Should be valid at 4min
            vi.advanceTimersByTime(4 * 60 * 1000);
            expect(cacheManager.get('sections')).toBeDefined();

            // Should be expired at 6min
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(cacheManager.get('sections')).toBeUndefined();
        });

        it('should use default TTL for section packages (2min)', () => {
            cacheManager.set('section:web', [{ name: 'nginx' }]);

            // Should be valid at 1min
            vi.advanceTimersByTime(60 * 1000);
            expect(cacheManager.get('section:web')).toBeDefined();

            // Should be expired at 3min
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(cacheManager.get('section:web')).toBeUndefined();
        });

        it('should use default TTL for installed packages (30s)', () => {
            cacheManager.set('installed', [{ name: 'vim' }]);

            // Should be valid at 20s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('installed')).toBeDefined();

            // Should be expired at 40s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('installed')).toBeUndefined();
        });

        it('should use default TTL for upgradable packages (30s)', () => {
            cacheManager.set('upgradable', [{ name: 'curl' }]);

            // Should be valid at 20s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('upgradable')).toBeDefined();

            // Should be expired at 40s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('upgradable')).toBeUndefined();
        });

        it('should use default TTL for search results (2min)', () => {
            cacheManager.set('search:nginx', [{ name: 'nginx' }]);

            // Should be valid at 1min
            vi.advanceTimersByTime(60 * 1000);
            expect(cacheManager.get('search:nginx')).toBeDefined();

            // Should be expired at 3min
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(cacheManager.get('search:nginx')).toBeUndefined();
        });

        it('should use default TTL for dependencies (5min)', () => {
            cacheManager.set('dependencies:nginx', [{ name: 'libc6' }]);

            // Should be valid at 4min
            vi.advanceTimersByTime(4 * 60 * 1000);
            expect(cacheManager.get('dependencies:nginx')).toBeDefined();

            // Should be expired at 6min
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(cacheManager.get('dependencies:nginx')).toBeUndefined();
        });

        it('should use default TTL for reverse dependencies (5min)', () => {
            cacheManager.set('reverse-deps:nginx', [{ name: 'nginx-full' }]);

            // Should be valid at 4min
            vi.advanceTimersByTime(4 * 60 * 1000);
            expect(cacheManager.get('reverse-deps:nginx')).toBeDefined();

            // Should be expired at 6min
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(cacheManager.get('reverse-deps:nginx')).toBeUndefined();
        });

        it('should use fallback TTL for unknown keys (1min)', () => {
            cacheManager.set('unknown-key', 'value');

            // Should be valid at 50s
            vi.advanceTimersByTime(50 * 1000);
            expect(cacheManager.get('unknown-key')).toBeDefined();

            // Should be expired at 70s
            vi.advanceTimersByTime(20 * 1000);
            expect(cacheManager.get('unknown-key')).toBeUndefined();
        });

        it('should allow custom TTL override', () => {
            cacheManager.set('test', 'value', 500); // 500ms TTL

            // Should be valid at 400ms
            vi.advanceTimersByTime(400);
            expect(cacheManager.get('test')).toBeDefined();

            // Should be expired at 600ms
            vi.advanceTimersByTime(200);
            expect(cacheManager.get('test')).toBeUndefined();
        });
    });

    describe('Pattern Invalidation', () => {
        it('should invalidate all keys matching pattern', () => {
            cacheManager.set('details:nginx', { name: 'nginx' });
            cacheManager.set('details:apache2', { name: 'apache2' });
            cacheManager.set('section:web', []);

            const count = cacheManager.invalidatePattern('details:');

            expect(count).toBe(2);
            expect(cacheManager.get('details:nginx')).toBeUndefined();
            expect(cacheManager.get('details:apache2')).toBeUndefined();
            expect(cacheManager.get('section:web')).toBeDefined();
        });

        it('should return 0 when no keys match pattern', () => {
            cacheManager.set('details:nginx', { name: 'nginx' });

            const count = cacheManager.invalidatePattern('search:');

            expect(count).toBe(0);
            expect(cacheManager.get('details:nginx')).toBeDefined();
        });

        it('should handle empty pattern', () => {
            cacheManager.set('test1', 'value1');
            cacheManager.set('test2', 'value2');

            // Empty pattern matches all keys (all start with "")
            const count = cacheManager.invalidatePattern('');

            expect(count).toBe(2);
            expect(cacheManager.size()).toBe(0);
        });

        it('should invalidate section caches', () => {
            cacheManager.set('section:web', []);
            cacheManager.set('section:python', []);
            cacheManager.set('sections', []);

            const count = cacheManager.invalidatePattern('section:');

            expect(count).toBe(2);
            expect(cacheManager.get('sections')).toBeDefined();
        });
    });

    describe('Pruning', () => {
        it('should remove expired entries', () => {
            cacheManager.set('key1', 'value1', 1000);
            cacheManager.set('key2', 'value2', 2000);
            cacheManager.set('key3', 'value3', 3000);

            // Expire first two entries
            vi.advanceTimersByTime(2100);

            const pruned = cacheManager.prune();

            expect(pruned).toBe(2);
            expect(cacheManager.size()).toBe(1);
            expect(cacheManager.has('key1')).toBe(false);
            expect(cacheManager.has('key2')).toBe(false);
            expect(cacheManager.has('key3')).toBe(true);
        });

        it('should not remove valid entries', () => {
            cacheManager.set('key1', 'value1', 1000);
            cacheManager.set('key2', 'value2', 2000);

            // Don't expire anything
            vi.advanceTimersByTime(500);

            const pruned = cacheManager.prune();

            expect(pruned).toBe(0);
            expect(cacheManager.size()).toBe(2);
        });

        it('should return 0 for empty cache', () => {
            const pruned = cacheManager.prune();
            expect(pruned).toBe(0);
        });
    });

    describe('Singleton Instance', () => {
        it('should export singleton cache instance', () => {
            expect(cache).toBeInstanceOf(CacheManager);
        });

        it('should share state across imports', () => {
            cache.set('shared-key', 'shared-value');
            expect(cache.get('shared-key')).toBe('shared-value');
        });
    });

    describe('Type Safety', () => {
        it('should preserve types through get/set', () => {
            interface PackageDetails {
                name: string;
                version: string;
                installed: boolean;
            }

            const pkg: PackageDetails = {
                name: 'nginx',
                version: '1.18.0',
                installed: false,
            };

            cacheManager.set('details:nginx', pkg);
            const result = cacheManager.get<PackageDetails>('details:nginx');

            // TypeScript should enforce type
            expect(result?.name).toBe('nginx');
            expect(result?.version).toBe('1.18.0');
            expect(result?.installed).toBe(false);
        });

        it('should handle arrays', () => {
            const packages = [
                { name: 'nginx' },
                { name: 'apache2' },
            ];

            cacheManager.set('section:web', packages);
            const result = cacheManager.get<typeof packages>('section:web');

            expect(Array.isArray(result)).toBe(true);
            expect(result?.length).toBe(2);
        });
    });
});
