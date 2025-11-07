/**
 * Tests for api.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Package, PackageDetails, Section, Dependency } from '../types';
import * as api from '../api';
import { cache } from '../cache-manager';

// Mock cockpit global
const mockSpawn = vi.fn();
global.cockpit = {
    spawn: mockSpawn,
    file: vi.fn(),
    location: {
        path: [],
        options: {},
        go: vi.fn(),
    },
};

/**
 * Create a mock spawn process that succeeds with JSON output
 */
function createSuccessfulSpawn(output: unknown) {
    const callbacks: {
        stream?: (data: string) => void;
        fail?: (error: unknown, data: string | null) => void;
        done?: () => void;
    } = {};

    const spawn = {
        stream: (callback: (data: string) => void) => {
            callbacks.stream = callback;
            return spawn;
        },
        fail: (callback: (error: unknown, data: string | null) => void) => {
            callbacks.fail = callback;
            return spawn;
        },
        done: (callback: () => void) => {
            callbacks.done = callback;
            // Immediately call callbacks
            setTimeout(() => {
                if (callbacks.stream) {
                    callbacks.stream(JSON.stringify(output));
                }
                if (callbacks.done) {
                    callbacks.done();
                }
            }, 0);
            return spawn;
        },
    };

    return spawn;
}

/**
 * Create a mock spawn process that fails with an error
 */
function createFailedSpawn(stderr: string) {
    const callbacks: {
        stream?: (data: string) => void;
        fail?: (error: unknown, data: string | null) => void;
        done?: () => void;
    } = {};

    const spawn = {
        stream: (callback: (data: string) => void) => {
            callbacks.stream = callback;
            return spawn;
        },
        fail: (callback: (error: unknown, data: string | null) => void) => {
            callbacks.fail = callback;
            // Immediately call fail callback
            setTimeout(() => {
                if (callbacks.fail) {
                    callbacks.fail(new Error('Command failed'), stderr);
                }
            }, 0);
            return spawn;
        },
        done: (callback: () => void) => {
            callbacks.done = callback;
            return spawn;
        },
    };

    return spawn;
}

describe('API Functions', () => {
    beforeEach(() => {
        mockSpawn.mockClear();
        cache.clear();
    });

    describe('searchPackages', () => {
        it('should search for packages', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
                { name: 'nginx-common', summary: 'Common files', version: '1.18.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            const result = await api.searchPackages('nginx');

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'search', 'nginx'],
                expect.objectContaining({ err: 'message', superuser: 'try' })
            );
            expect(result).toEqual(packages);
        });

        it('should use cached results on second call', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            // First call
            await api.searchPackages('nginx');
            expect(mockSpawn).toHaveBeenCalledTimes(1);

            // Second call (should use cache)
            const result = await api.searchPackages('nginx');
            expect(mockSpawn).toHaveBeenCalledTimes(1); // Still 1
            expect(result).toEqual(packages);
        });

        it('should bypass cache when requested', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            // First call
            await api.searchPackages('nginx');
            expect(mockSpawn).toHaveBeenCalledTimes(1);

            // Second call with useCache=false
            await api.searchPackages('nginx', false);
            expect(mockSpawn).toHaveBeenCalledTimes(2);
        });

        it('should reject query less than 2 characters', async () => {
            await expect(api.searchPackages('a')).rejects.toThrow('at least 2 characters');
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('should handle backend errors', async () => {
            const errorJson = JSON.stringify({
                error: 'Query too short',
                code: 'INVALID_QUERY',
            });

            mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

            await expect(api.searchPackages('ng')).rejects.toThrow('Query too short');
        });
    });

    describe('getPackageDetails', () => {
        it('should get package details', async () => {
            const details: PackageDetails = {
                name: 'nginx',
                summary: 'HTTP server',
                description: 'Nginx is a web server...',
                section: 'web',
                installed: false,
                installedVersion: null,
                candidateVersion: '1.18.0',
                priority: 'optional',
                homepage: 'https://nginx.org',
                maintainer: 'Debian Team',
                size: 1024000,
                installedSize: 4096000,
                dependencies: [
                    { name: 'libc6', relation: '>=', version: '2.34' },
                ],
                reverseDependencies: ['nginx-full'],
            };

            mockSpawn.mockReturnValue(createSuccessfulSpawn(details));

            const result = await api.getPackageDetails('nginx');

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'details', 'nginx'],
                expect.anything()
            );
            expect(result).toEqual(details);
        });

        it('should use cached results', async () => {
            const details: PackageDetails = {
                name: 'nginx',
                summary: 'HTTP server',
                description: 'Description',
                section: 'web',
                installed: false,
                installedVersion: null,
                candidateVersion: '1.18.0',
                priority: 'optional',
                homepage: '',
                maintainer: '',
                size: 0,
                installedSize: 0,
                dependencies: [],
                reverseDependencies: [],
            };

            mockSpawn.mockReturnValue(createSuccessfulSpawn(details));

            await api.getPackageDetails('nginx');
            await api.getPackageDetails('nginx');

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });

        it('should handle package not found', async () => {
            const errorJson = JSON.stringify({
                error: 'Package not found: nonexistent',
                code: 'PACKAGE_NOT_FOUND',
                details: 'nonexistent',
            });

            mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

            await expect(api.getPackageDetails('nonexistent')).rejects.toThrow('Package not found');
        });
    });

    describe('listSections', () => {
        it('should list all sections', async () => {
            const sections: Section[] = [
                { name: 'admin', count: 50 },
                { name: 'web', count: 100 },
                { name: 'python', count: 200 },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(sections));

            const result = await api.listSections();

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'sections'],
                expect.anything()
            );
            expect(result).toEqual(sections);
        });

        it('should cache sections list', async () => {
            const sections: Section[] = [{ name: 'web', count: 100 }];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(sections));

            await api.listSections();
            await api.listSections();

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('listPackagesBySection', () => {
        it('should list packages in section', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
                { name: 'apache2', summary: 'HTTP server', version: '2.4.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            const result = await api.listPackagesBySection('web');

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'list-section', 'web'],
                expect.anything()
            );
            expect(result).toEqual(packages);
        });

        it('should cache section packages', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            await api.listPackagesBySection('web');
            await api.listPackagesBySection('web');

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('listInstalledPackages', () => {
        it('should list installed packages', async () => {
            const packages: Package[] = [
                { name: 'vim', summary: 'Text editor', version: '8.2.0', installed: true, section: 'editors' },
                { name: 'curl', summary: 'HTTP client', version: '7.74.0', installed: true, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            const result = await api.listInstalledPackages();

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'list-installed'],
                expect.anything()
            );
            expect(result).toEqual(packages);
        });

        it('should cache installed packages', async () => {
            const packages: Package[] = [
                { name: 'vim', summary: 'Text editor', version: '8.2.0', installed: true, section: 'editors' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            await api.listInstalledPackages();
            await api.listInstalledPackages();

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('listUpgradablePackages', () => {
        it('should list upgradable packages', async () => {
            const packages: Package[] = [
                { name: 'curl', summary: 'HTTP client', version: '7.75.0', installed: true, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            const result = await api.listUpgradablePackages();

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'list-upgradable'],
                expect.anything()
            );
            expect(result).toEqual(packages);
        });

        it('should cache upgradable packages', async () => {
            const packages: Package[] = [
                { name: 'curl', summary: 'HTTP client', version: '7.75.0', installed: true, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            await api.listUpgradablePackages();
            await api.listUpgradablePackages();

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('getPackageDependencies', () => {
        it('should get package dependencies', async () => {
            const dependencies: Dependency[] = [
                { name: 'libc6', relation: '>=', version: '2.34' },
                { name: 'libssl3', relation: '>=', version: '3.0.0' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(dependencies));

            const result = await api.getPackageDependencies('nginx');

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'dependencies', 'nginx'],
                expect.anything()
            );
            expect(result).toEqual(dependencies);
        });

        it('should cache dependencies', async () => {
            const dependencies: Dependency[] = [
                { name: 'libc6', relation: '>=', version: '2.34' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(dependencies));

            await api.getPackageDependencies('nginx');
            await api.getPackageDependencies('nginx');

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('getReverseDependencies', () => {
        it('should get reverse dependencies', async () => {
            const reverseDeps: string[] = ['nginx-full', 'nginx-light'];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(reverseDeps));

            const result = await api.getReverseDependencies('nginx-common');

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-apt-bridge', 'reverse-dependencies', 'nginx-common'],
                expect.anything()
            );
            expect(result).toEqual(reverseDeps);
        });

        it('should cache reverse dependencies', async () => {
            const reverseDeps: string[] = ['nginx-full'];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(reverseDeps));

            await api.getReverseDependencies('nginx-common');
            await api.getReverseDependencies('nginx-common');

            expect(mockSpawn).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cache Management', () => {
        it('should clear all cache', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
            ];

            mockSpawn.mockReturnValue(createSuccessfulSpawn(packages));

            // Cache some results
            await api.searchPackages('nginx');
            await api.listInstalledPackages();

            // Clear cache
            api.clearCache();

            // Should make new requests
            await api.searchPackages('nginx');
            await api.listInstalledPackages();

            expect(mockSpawn).toHaveBeenCalledTimes(4);
        });

        it('should invalidate cache by pattern', async () => {
            const packages: Package[] = [
                { name: 'nginx', summary: 'HTTP server', version: '1.18.0', installed: false, section: 'web' },
            ];

            const details: PackageDetails = {
                name: 'nginx',
                summary: 'HTTP server',
                description: 'Description',
                section: 'web',
                installed: false,
                installedVersion: null,
                candidateVersion: '1.18.0',
                priority: 'optional',
                homepage: '',
                maintainer: '',
                size: 0,
                installedSize: 0,
                dependencies: [],
                reverseDependencies: [],
            };

            mockSpawn.mockReturnValueOnce(createSuccessfulSpawn(packages));
            mockSpawn.mockReturnValueOnce(createSuccessfulSpawn(details));
            mockSpawn.mockReturnValueOnce(createSuccessfulSpawn(packages));
            mockSpawn.mockReturnValueOnce(createSuccessfulSpawn(details));

            // Cache search and details
            await api.searchPackages('nginx');
            await api.getPackageDetails('nginx');
            expect(mockSpawn).toHaveBeenCalledTimes(2);

            // Invalidate only details
            const count = api.invalidateCache('details:');
            expect(count).toBe(1);

            // Search should use cache, details should not
            await api.searchPackages('nginx');
            await api.getPackageDetails('nginx');
            expect(mockSpawn).toHaveBeenCalledTimes(3); // Only details made new request
        });
    });

    describe('Error Handling', () => {
        it('should handle JSON parse errors', async () => {
            // Reset mock to ensure clean state
            mockSpawn.mockReset();

            const spawn = {
                stream: (callback: (data: string) => void) => {
                    setTimeout(() => callback('invalid json'), 0);
                    return spawn;
                },
                fail: (callback: (error: unknown, data: string | null) => void) => spawn,
                done: (callback: () => void) => {
                    setTimeout(callback, 0);
                    return spawn;
                },
            };

            mockSpawn.mockReturnValue(spawn);

            // Use unique query and explicitly bypass cache
            await expect(api.searchPackages('jsontest', false)).rejects.toThrow('Failed to parse JSON');
        });

        it('should translate backend errors to APTError', async () => {
            const errorJson = JSON.stringify({
                error: 'Failed to open APT cache',
                code: 'CACHE_ERROR',
                details: 'Permission denied',
            });

            mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

            await expect(api.listInstalledPackages()).rejects.toMatchObject({
                message: 'Failed to open APT cache',
                code: 'CACHE_ERROR',
                details: 'Permission denied',
            });
        });
    });

    describe('Utility Functions', () => {
        describe('isInstalled', () => {
            it('should return true for installed package', async () => {
                const details: PackageDetails = {
                    name: 'vim',
                    summary: 'Text editor',
                    description: 'Vim text editor',
                    section: 'editors',
                    installed: true,
                    installedVersion: '8.2.0',
                    candidateVersion: '8.2.0',
                    priority: 'optional',
                    homepage: '',
                    maintainer: '',
                    size: 0,
                    installedSize: 0,
                    dependencies: [],
                    reverseDependencies: [],
                };

                mockSpawn.mockReturnValue(createSuccessfulSpawn(details));

                const result = await api.isInstalled('vim');
                expect(result).toBe(true);
            });

            it('should return false for not installed package', async () => {
                const details: PackageDetails = {
                    name: 'nginx',
                    summary: 'HTTP server',
                    description: 'Description',
                    section: 'web',
                    installed: false,
                    installedVersion: null,
                    candidateVersion: '1.18.0',
                    priority: 'optional',
                    homepage: '',
                    maintainer: '',
                    size: 0,
                    installedSize: 0,
                    dependencies: [],
                    reverseDependencies: [],
                };

                mockSpawn.mockReturnValue(createSuccessfulSpawn(details));

                const result = await api.isInstalled('nginx');
                expect(result).toBe(false);
            });

            it('should return false for non-existent package', async () => {
                const errorJson = JSON.stringify({
                    error: 'Package not found: nonexistent',
                    code: 'PACKAGE_NOT_FOUND',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                const result = await api.isInstalled('nonexistent');
                expect(result).toBe(false);
            });

            it('should throw other errors', async () => {
                const errorJson = JSON.stringify({
                    error: 'Cache error',
                    code: 'CACHE_ERROR',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                await expect(api.isInstalled('vim')).rejects.toThrow();
            });
        });

        describe('isLocked', () => {
            it('should return false when not locked', async () => {
                const sections: Section[] = [{ name: 'web', count: 100 }];
                mockSpawn.mockReturnValue(createSuccessfulSpawn(sections));

                const result = await api.isLocked();
                expect(result).toBe(false);
            });

            it('should return true for LOCKED error code', async () => {
                const errorJson = JSON.stringify({
                    error: 'Unable to lock',
                    code: 'LOCKED',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                const result = await api.isLocked();
                expect(result).toBe(true);
            });

            it('should return true for lock-related error messages', async () => {
                const errorJson = JSON.stringify({
                    error: 'Unable to acquire the dpkg frontend lock',
                    code: 'COMMAND_FAILED',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                const result = await api.isLocked();
                expect(result).toBe(true);
            });

            it('should return false for other errors', async () => {
                const errorJson = JSON.stringify({
                    error: 'Network error',
                    code: 'NETWORK_ERROR',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                const result = await api.isLocked();
                expect(result).toBe(false);
            });
        });

        describe('waitForLock', () => {
            it('should return true when lock is not held', async () => {
                const sections: Section[] = [{ name: 'web', count: 100 }];
                mockSpawn.mockReturnValue(createSuccessfulSpawn(sections));

                const result = await api.waitForLock(1000, 100);
                expect(result).toBe(true);
            });

            it('should return true when lock is released', async () => {
                const sections: Section[] = [{ name: 'web', count: 100 }];
                const errorJson = JSON.stringify({
                    error: 'Locked',
                    code: 'LOCKED',
                });

                // First call: locked, second call: not locked
                mockSpawn
                    .mockReturnValueOnce(createFailedSpawn(errorJson))
                    .mockReturnValueOnce(createSuccessfulSpawn(sections));

                const result = await api.waitForLock(5000, 100);
                expect(result).toBe(true);
            });

            it('should return false on timeout', async () => {
                const errorJson = JSON.stringify({
                    error: 'Locked',
                    code: 'LOCKED',
                });

                mockSpawn.mockReturnValue(createFailedSpawn(errorJson));

                // Short timeout to avoid slow test
                const result = await api.waitForLock(500, 100);
                expect(result).toBe(false);
            }, 10000); // Increase test timeout
        });
    });

    describe('Operation Functions', () => {
        it('should throw not implemented for installPackage', async () => {
            await expect(api.installPackage('nginx')).rejects.toThrow('not yet implemented');
        });

        it('should throw not implemented for removePackage', async () => {
            await expect(api.removePackage('nginx')).rejects.toThrow('not yet implemented');
        });

        it('should throw not implemented for updatePackageLists', async () => {
            await expect(api.updatePackageLists()).rejects.toThrow('not yet implemented');
        });
    });
});
