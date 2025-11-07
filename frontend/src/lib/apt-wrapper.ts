/**
 * TypeScript API wrapper for cockpit-apt-bridge and apt-get commands.
 *
 * Provides type-safe Promise-based interface for UI components.
 */

import { APTError, type Package } from "./types";

/**
 * Search for packages matching a query.
 *
 * Calls cockpit-apt-bridge search command and returns typed results.
 *
 * @param query - Search query (min 2 characters)
 * @returns Promise resolving to array of matching packages
 * @throws APTError if search fails
 */
export async function searchPackages(query: string): Promise<Package[]> {
  // Validate query length
  if (query.length < 2) {
    throw new APTError("Query must be at least 2 characters", "INVALID_QUERY");
  }

  try {
    // Call cockpit-apt-bridge via cockpit.spawn
    const result = await spawnCommand(["cockpit-apt-bridge", "search", query]);

    // Parse JSON response
    const packages = JSON.parse(result) as Package[];

    return packages;
  } catch (error) {
    // Translate errors to APTError
    if (error instanceof APTError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new APTError("Failed to parse response from backend", "PARSE_ERROR", String(error));
    }

    throw new APTError(
      "Failed to execute search command",
      "EXEC_ERROR",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Execute a command via cockpit.spawn and return stdout.
 *
 * @param args - Command arguments (first arg is command name)
 * @param options - Spawn options
 * @returns Promise resolving to stdout content
 * @throws APTError if command fails
 */
function spawnCommand(args: string[], options: SpawnOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = cockpit.spawn(args, {
      err: "message",
      ...options,
    });

    proc
      .stream((data) => {
        stdout += data;
      })
      .fail((_error, data) => {
        stderr += data || "";

        // Try to parse error from stderr as JSON
        try {
          const errorObj = JSON.parse(stderr);
          reject(
            new APTError(
              errorObj.error || "Command failed",
              errorObj.code || "EXEC_ERROR",
              errorObj.details || null
            )
          );
        } catch {
          // Not JSON, use raw stderr
          reject(new APTError("Command failed", "EXEC_ERROR", stderr || "Unknown error"));
        }
      })
      .done(() => {
        resolve(stdout);
      });
  });
}
