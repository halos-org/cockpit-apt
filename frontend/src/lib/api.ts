/**
 * APT Bridge API Wrapper
 *
 * TypeScript wrapper functions for calling the Python backend via cockpit.spawn.
 * All functions use caching, error translation, and type-safe responses.
 *
 * Backend Commands:
 *   - cockpit-apt-bridge search <query>
 *   - cockpit-apt-bridge details <package>
 *   - cockpit-apt-bridge sections
 *   - cockpit-apt-bridge list-section <section>
 *   - cockpit-apt-bridge list-installed
 *   - cockpit-apt-bridge list-upgradable
 *   - cockpit-apt-bridge dependencies <package>
 *   - cockpit-apt-bridge reverse-dependencies <package>
 *   - cockpit-apt-bridge files <package>
 *
 * Cache Keys:
 *   - search:{query} - Search results (TTL: 2min)
 *   - details:{package} - Package details (TTL: 60s)
 *   - sections - Sections list (TTL: 5min)
 *   - section:{name} - Packages in section (TTL: 2min)
 *   - installed - Installed packages (TTL: 30s)
 *   - upgradable - Upgradable packages (TTL: 30s)
 *   - dependencies:{package} - Dependencies (TTL: 5min)
 *   - reverse-deps:{package} - Reverse dependencies (TTL: 5min)
 *   - files:{package} - Installed files (TTL: 5min)
 *
 * Usage:
 *   import { searchPackages, getPackageDetails } from './api';
 *
 *   const results = await searchPackages('nginx');
 *   const details = await getPackageDetails('nginx');
 */

import { cache } from "./cache-manager";
import { translateError } from "./error-handler";
import type { Dependency, Package, PackageDetails, Section, UpgradablePackage } from "./types";

/**
 * Execute cockpit-apt-bridge command and parse JSON response
 *
 * @param args Command arguments
 * @returns Parsed JSON response
 * @throws APTError if command fails
 */
async function executeCommand(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const process = cockpit.spawn(["cockpit-apt-bridge", ...args], {
      err: "message",
      superuser: "try",
    });

    process
      .stream((data: string) => {
        stdout += data;
      })
      .fail((error: unknown, data: string | null) => {
        stderr = data || "";

        // Try to parse stderr as JSON error
        if (stderr) {
          try {
            const errorObj = JSON.parse(stderr);
            reject(translateError(errorObj));
            return;
          } catch {
            // Not JSON, use stderr as message
          }
        }

        reject(translateError(error));
      })
      .done(() => {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(translateError(new Error(`Failed to parse JSON response: ${error}`)));
        }
      });
  });
}

/**
 * Search for packages by name or description
 *
 * @param query Search query (minimum 2 characters)
 * @param useCache Whether to use cached results (default: true)
 * @returns List of matching packages (max 100)
 * @throws APTError if search fails
 */
export async function searchPackages(query: string, useCache: boolean = true): Promise<Package[]> {
  if (query.length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  const cacheKey = `search:${query}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<Package[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["search", query])) as Package[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Get detailed information about a package
 *
 * @param packageName Name of the package
 * @param useCache Whether to use cached results (default: true)
 * @returns Package details
 * @throws APTError if package not found or command fails
 */
export async function getPackageDetails(
  packageName: string,
  useCache: boolean = true
): Promise<PackageDetails> {
  const cacheKey = `details:${packageName}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<PackageDetails>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["details", packageName])) as PackageDetails;

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * List all Debian sections with package counts
 *
 * @param useCache Whether to use cached results (default: true)
 * @returns List of sections sorted by name
 * @throws APTError if command fails
 */
export async function listSections(useCache: boolean = true): Promise<Section[]> {
  const cacheKey = "sections";

  // Check cache
  if (useCache) {
    const cached = cache.get<Section[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["sections"])) as Section[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * List packages in a specific Debian section
 *
 * @param sectionName Name of the section (e.g., "web", "python")
 * @param useCache Whether to use cached results (default: true)
 * @returns List of packages in the section
 * @throws APTError if command fails
 */
export async function listPackagesBySection(
  sectionName: string,
  useCache: boolean = true
): Promise<Package[]> {
  const cacheKey = `section:${sectionName}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<Package[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["list-section", sectionName])) as Package[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * List all installed packages
 *
 * @param useCache Whether to use cached results (default: true)
 * @returns List of installed packages sorted by name
 * @throws APTError if command fails
 */
export async function listInstalledPackages(useCache: boolean = true): Promise<Package[]> {
  const cacheKey = "installed";

  // Check cache
  if (useCache) {
    const cached = cache.get<Package[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["list-installed"])) as Package[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * List all packages with available upgrades
 *
 * @param useCache Whether to use cached results (default: true)
 * @returns List of upgradable packages sorted by name
 * @throws APTError if command fails
 */
export async function listUpgradablePackages(
  useCache: boolean = true
): Promise<UpgradablePackage[]> {
  const cacheKey = "upgradable";

  // Check cache
  if (useCache) {
    const cached = cache.get<UpgradablePackage[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["list-upgradable"])) as UpgradablePackage[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Get package dependencies
 *
 * @param packageName Name of the package
 * @param useCache Whether to use cached results (default: true)
 * @returns List of dependencies with version constraints
 * @throws APTError if package not found or command fails
 */
export async function getPackageDependencies(
  packageName: string,
  useCache: boolean = true
): Promise<Dependency[]> {
  const cacheKey = `dependencies:${packageName}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<Dependency[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["dependencies", packageName])) as Dependency[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Get reverse dependencies (packages that depend on this package)
 *
 * @param packageName Name of the package
 * @param useCache Whether to use cached results (default: true)
 * @returns List of package names that depend on this package (max 50)
 * @throws APTError if package not found or command fails
 */
export async function getReverseDependencies(
  packageName: string,
  useCache: boolean = true
): Promise<string[]> {
  const cacheKey = `reverse-deps:${packageName}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["reverse-dependencies", packageName])) as string[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Get list of files installed by a package
 *
 * NOTE: This only works for installed packages. Attempting to get files for
 * an uninstalled package will throw a PACKAGE_NOT_FOUND error.
 *
 * @param packageName Name of the installed package
 * @param useCache Whether to use cached results (default: true)
 * @returns List of absolute file paths installed by the package
 * @throws APTError if package not installed or command fails
 */
export async function getPackageFiles(
  packageName: string,
  useCache: boolean = true
): Promise<string[]> {
  const cacheKey = `files:${packageName}`;

  // Check cache
  if (useCache) {
    const cached = cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute command
  const result = (await executeCommand(["files", packageName])) as string[];

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Clear all cached API results
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Invalidate cache for specific patterns
 *
 * @param pattern Cache key pattern (e.g., "details:", "section:")
 * @returns Number of entries invalidated
 */
export function invalidateCache(pattern: string): number {
  return cache.invalidatePattern(pattern);
}

// ==================== Utility Functions ====================

/**
 * Check if a package is installed
 *
 * @param packageName Name of the package
 * @param useCache Whether to use cached results (default: true)
 * @returns True if package is installed
 * @throws APTError if command fails
 */
export async function isInstalled(packageName: string, useCache: boolean = true): Promise<boolean> {
  try {
    const details = await getPackageDetails(packageName, useCache);
    return details.installed;
  } catch (error) {
    // If package not found, it's definitely not installed
    const aptError = translateError(error);
    if (aptError.code === "PACKAGE_NOT_FOUND") {
      return false;
    }
    throw error;
  }
}

/**
 * Check if APT is currently locked
 *
 * Attempts to execute a simple APT command to check if the lock is held.
 *
 * @returns True if APT is locked
 */
export async function isLocked(): Promise<boolean> {
  try {
    // Try to list sections (quick, read-only operation)
    await listSections(false); // Don't use cache
    return false; // If successful, not locked
  } catch (error) {
    const aptError = translateError(error);
    // Check for lock-related errors
    if (
      aptError.code === "LOCKED" ||
      aptError.message.toLowerCase().includes("lock") ||
      aptError.message.toLowerCase().includes("unable to acquire")
    ) {
      return true;
    }
    // Other errors don't indicate a lock
    return false;
  }
}

/**
 * Wait for APT lock to be released
 *
 * Polls isLocked() until lock is released or timeout occurs.
 *
 * @param timeoutMs Maximum time to wait in milliseconds (default: 30000 = 30s)
 * @param pollIntervalMs Interval between checks in milliseconds (default: 1000 = 1s)
 * @returns True if lock was released, false if timeout
 */
export async function waitForLock(
  timeoutMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const locked = await isLocked();
    if (!locked) {
      return true; // Lock released
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false; // Timeout
}

// ==================== Operation Functions ====================

/**
 * Execute a command with progress streaming
 *
 * Backend outputs JSON lines:
 * - Progress: {"type": "progress", "percentage": number, "message": string}
 * - Final: {"success": bool, "message": string, ...}
 *
 * @param args Command arguments
 * @param onProgress Optional progress callback
 * @returns Final result object
 * @throws APTError if command fails
 */
async function executeWithProgress(
  args: string[],
  onProgress?: (progress: { percentage: number; message: string }) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let finalResult: unknown = null;

    const process = cockpit.spawn(["cockpit-apt-bridge", ...args], {
      err: "message",
      superuser: "require", // Operations need sudo
    });

    process
      .stream((data: string) => {
        stdout += data;

        // Process complete JSON lines
        const lines = stdout.split("\n");
        stdout = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const obj = JSON.parse(line);

            // Check if it's a progress update
            if (obj.type === "progress" && onProgress) {
              onProgress({
                percentage: obj.percentage,
                message: obj.message,
              });
            } else if (obj.success !== undefined) {
              // This is the final result
              finalResult = obj;
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      })
      .fail((error: unknown, data: string | null) => {
        stderr = data || "";

        // Try to parse stderr as JSON error
        if (stderr) {
          try {
            const errorObj = JSON.parse(stderr);
            reject(translateError(errorObj));
            return;
          } catch {
            // Not JSON, use stderr as message
          }
        }

        reject(translateError(error));
      })
      .done(() => {
        // If we got a final result from streaming, use it
        if (finalResult) {
          resolve(finalResult);
          return;
        }

        // Process any remaining data in the buffer
        if (stdout.trim()) {
          // Try to parse remaining lines
          const lines = stdout.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const obj = JSON.parse(line);

              // Check if it's a progress update
              if (obj.type === "progress" && onProgress) {
                onProgress({
                  percentage: obj.percentage,
                  message: obj.message,
                });
              } else if (obj.success !== undefined) {
                // This is the final result
                finalResult = obj;
              }
            } catch (e) {
              // Not JSON, skip
            }
          }

          // If we found a final result, use it
          if (finalResult) {
            resolve(finalResult);
            return;
          }
        }

        // No result found
        reject(translateError(new Error("Command completed but returned no result")));
      });
  });
}

/**
 * Install a package
 *
 * @param packageName Name of the package to install
 * @param onProgress Optional progress callback
 * @throws APTError if installation fails
 */
export async function installPackage(
  packageName: string,
  onProgress?: (progress: { percentage: number; message: string }) => void
): Promise<void> {
  const result = (await executeWithProgress(["install", packageName], onProgress)) as {
    success: boolean;
  };

  if (!result.success) {
    throw translateError(new Error("Installation failed"));
  }

  // Invalidate caches after successful install
  invalidateCache("installed");
  invalidateCache("upgradable");
  invalidateCache(`details:${packageName}`);
}

/**
 * Remove a package
 *
 * @param packageName Name of the package to remove
 * @param onProgress Optional progress callback
 * @throws APTError if removal fails
 */
export async function removePackage(
  packageName: string,
  onProgress?: (progress: { percentage: number; message: string }) => void
): Promise<void> {
  const result = (await executeWithProgress(["remove", packageName], onProgress)) as {
    success: boolean;
  };

  if (!result.success) {
    throw translateError(new Error("Removal failed"));
  }

  // Invalidate caches after successful removal
  invalidateCache("installed");
  invalidateCache(`details:${packageName}`);
}

/**
 * Upgrade all upgradable packages (apt-get upgrade)
 *
 * @param onProgress Optional progress callback
 * @throws APTError if upgrade fails
 */
export async function upgradeAllPackages(
  onProgress?: (progress: { percentage: number; message: string }) => void
): Promise<void> {
  const result = (await executeWithProgress(["upgrade"], onProgress)) as {
    success: boolean;
  };

  if (!result.success) {
    throw translateError(new Error("Upgrade failed"));
  }

  // Invalidate caches after successful upgrade
  invalidateCache("installed");
  invalidateCache("upgradable");
  invalidateCache("details:");
}

/**
 * Update package lists (apt-get update)
 *
 * @param onProgress Optional progress callback
 * @throws APTError if update fails
 */
export async function updatePackageLists(
  onProgress?: (progress: { percentage: number; message: string }) => void
): Promise<void> {
  const result = (await executeWithProgress(["update"], onProgress)) as { success: boolean };

  if (!result.success) {
    throw translateError(new Error("Update failed"));
  }

  // Clear all caches after successful update
  clearCache();
}
