/**
 * API wrapper for backend commands
 * Provides typed Promise-based interface to cockpit-apt-bridge
 */

import type { APIError, FilterPackagesResponse, FilterParams, Repository } from "./types";

/**
 * Custom error class for API errors
 */
export class APTBridgeError extends Error {
  code?: string;
  details?: string;

  constructor(message: string, code?: string, details?: string) {
    super(message);
    this.name = "APTBridgeError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Execute backend command and parse JSON response
 */
async function executeCommand<T>(
  command: string,
  args: string[] = [],
  timeout = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false; // Prevent race conditions

    const proc = cockpit.spawn(["cockpit-apt-bridge", command, ...args], {
      err: "out",
      superuser: "try",
    });

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.close(() => {
            reject(new APTBridgeError(`Command timed out after ${timeout}ms`, "TIMEOUT"));
          });
        }
      }, timeout);
    }

    proc.stream((data: string) => {
      stdout += data;
    });

    proc.done(() => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);

      try {
        // Parse JSON response
        const parsed = JSON.parse(stdout);

        // Check for error response
        if (parsed.error) {
          const apiError = parsed as APIError;
          reject(new APTBridgeError(apiError.error, apiError.code, apiError.details));
          return;
        }

        resolve(parsed as T);
      } catch (e) {
        reject(new APTBridgeError("Failed to parse backend response", "PARSE_ERROR", stdout));
      }
    });

    proc.fail((error: unknown, data: string | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);

      const errorStr = String(error || data || "");

      // Try to parse error as JSON
      try {
        const parsed = JSON.parse(errorStr);
        if (parsed.error) {
          const apiError = parsed as APIError;
          reject(new APTBridgeError(apiError.error, apiError.code, apiError.details));
          return;
        }
      } catch {
        // Not JSON, treat as plain error message
      }

      reject(new APTBridgeError(errorStr || "Backend command failed", "COMMAND_FAILED"));
    });
  });
}

/**
 * List all repositories
 */
export async function listRepositories(): Promise<Repository[]> {
  return executeCommand<Repository[]>("list-repositories");
}

/**
 * Filter packages
 */
export async function filterPackages(params: FilterParams = {}): Promise<FilterPackagesResponse> {
  const args: string[] = [];

  if (params.repository_id) {
    args.push("--repo", params.repository_id);
  }
  if (params.tab) {
    args.push("--tab", params.tab);
  }
  if (params.search_query) {
    // Use --search=VALUE format to prevent argparse from interpreting
    // dash-prefixed search queries as separate arguments
    args.push(`--search=${params.search_query}`);
  }
  if (params.limit !== undefined) {
    args.push("--limit", params.limit.toString());
  }

  return executeCommand<FilterPackagesResponse>("filter-packages", args);
}

/**
 * Update APT package lists with progress reporting
 */
export async function updatePackageLists(): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const proc = cockpit.spawn(["cockpit-apt-bridge", "update"], {
      err: "out",
      superuser: "require",
    });

    let stdout = "";

    proc.stream((data: string) => {
      stdout += data;
    });

    proc.done(() => {
      if (settled) return;
      settled = true;

      // Parse the last JSON line for the final result
      const lines = stdout.trim().split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i] || "");
          if (parsed.error) {
            reject(new APTBridgeError(parsed.error, parsed.code, parsed.details));
            return;
          }
          if (parsed.success !== undefined) {
            resolve();
            return;
          }
        } catch {
          // Not JSON, continue
        }
      }
      resolve();
    });

    proc.fail((error: unknown) => {
      if (settled) return;
      settled = true;
      reject(new APTBridgeError(String(error || "Update failed"), "UPDATE_FAILED"));
    });
  });
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof APTBridgeError) {
    let message = error.message;
    if (error.details) {
      message += `: ${error.details}`;
    }
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
