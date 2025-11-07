/**
 * Error Handler for APT Bridge API
 *
 * Translates errors from the Python backend into TypeScript APTError instances.
 * Provides type-safe error handling for all APT operations.
 *
 * Error Flow:
 *   1. Backend command fails (Python exception)
 *   2. Backend outputs JSON error to stderr
 *   3. cockpit.spawn rejects with stderr content
 *   4. translateError() parses JSON and creates APTError
 *   5. UI displays user-friendly error message
 *
 * Backend Error Format (from backend/cockpit_apt_bridge/utils/errors.py):
 *   {
 *     "error": "Human-readable error message",
 *     "code": "MACHINE_READABLE_CODE",
 *     "details": "Optional additional context"
 *   }
 *
 * Error Codes:
 *   - PACKAGE_NOT_FOUND: Package doesn't exist in cache
 *   - INVALID_INPUT: User input failed validation
 *   - CACHE_ERROR: Failed to load or query APT cache
 *   - COMMAND_FAILED: Command execution failed
 *   - UNKNOWN_ERROR: Unexpected or unclassified error
 *   - UNKNOWN_COMMAND: Invalid command name
 *
 * Usage:
 *   try {
 *     await installPackage('nginx');
 *   } catch (error) {
 *     const aptError = translateError(error);
 *     if (aptError.code === 'PACKAGE_NOT_FOUND') {
 *       showMessage(`Package not found: ${aptError.details}`);
 *     } else {
 *       showMessage(`Error: ${aptError.message}`);
 *     }
 *   }
 */

/**
 * APT Bridge error class
 *
 * Represents errors from the Python backend with structured error information.
 */
export class APTError extends Error {
    /** Machine-readable error code */
    code: string;

    /** Optional additional details (e.g., package name, stack trace) */
    details?: string;

    /**
     * Create a new APT error
     *
     * @param message Human-readable error message
     * @param code Machine-readable error code
     * @param details Optional additional details
     */
    constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: string) {
        super(message);
        this.name = 'APTError';
        this.code = code;
        this.details = details;

        // Maintains proper stack trace for where our error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APTError);
        }
    }

    /**
     * Convert error to JSON format
     *
     * @returns JSON representation of error
     */
    toJSON(): { error: string; code: string; details?: string } {
        const json: { error: string; code: string; details?: string } = {
            error: this.message,
            code: this.code,
        };

        if (this.details) {
            json.details = this.details;
        }

        return json;
    }

    /**
     * Convert error to string
     *
     * @returns String representation
     */
    toString(): string {
        if (this.details) {
            return `${this.name} [${this.code}]: ${this.message} (${this.details})`;
        }
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}

/**
 * Backend error JSON structure
 */
interface BackendError {
    error: string;
    code: string;
    details?: string;
}

/**
 * Check if value is a backend error JSON object
 *
 * @param value Value to check
 * @returns True if value matches backend error structure
 */
function isBackendError(value: unknown): value is BackendError {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    return (
        typeof obj.error === 'string' &&
        typeof obj.code === 'string' &&
        (obj.details === undefined || typeof obj.details === 'string')
    );
}

/**
 * Translate error from backend to APTError
 *
 * Handles various error formats:
 * - Backend JSON errors (from stderr)
 * - Cockpit spawn errors (exit code, signal)
 * - Network/communication errors
 * - Unexpected errors
 *
 * @param error Error from cockpit.spawn or other source
 * @returns APTError instance
 */
export function translateError(error: unknown): APTError {
    // Already an APTError - pass through
    if (error instanceof APTError) {
        return error;
    }

    // Standard Error object
    if (error instanceof Error) {
        // Try to parse message as JSON (backend errors are JSON in stderr)
        try {
            const parsed = JSON.parse(error.message);
            if (isBackendError(parsed)) {
                return new APTError(parsed.error, parsed.code, parsed.details);
            }
        } catch {
            // Not JSON, use error message as-is
        }

        // Check for common error patterns
        const message = error.message.toLowerCase();

        if (message.includes('not found') || message.includes('no such package')) {
            return new APTError(error.message, 'PACKAGE_NOT_FOUND', error.message);
        }

        if (message.includes('permission denied') || message.includes('not authorized')) {
            return new APTError(error.message, 'PERMISSION_DENIED', error.message);
        }

        if (message.includes('cache')) {
            return new APTError(error.message, 'CACHE_ERROR', error.message);
        }

        if (message.includes('locked') || message.includes('unable to lock')) {
            return new APTError(error.message, 'LOCKED', error.message);
        }

        // Generic error with original message
        return new APTError(error.message, 'COMMAND_FAILED', error.message);
    }

    // Cockpit spawn error object (has exit status/signal)
    if (typeof error === 'object' && error !== null) {
        const obj = error as Record<string, unknown>;

        // Check for exit status
        if ('exit_status' in obj && typeof obj.exit_status === 'number') {
            const exitStatus = obj.exit_status;
            const problem = obj.problem as string | undefined;

            if (exitStatus !== 0) {
                const message = problem || `Command failed with exit code ${exitStatus}`;
                return new APTError(message, 'COMMAND_FAILED', `Exit code: ${exitStatus}`);
            }
        }

        // Check for signal (process was killed)
        if ('exit_signal' in obj && typeof obj.exit_signal === 'string') {
            const signal = obj.exit_signal;
            return new APTError(
                `Command terminated by signal ${signal}`,
                'COMMAND_FAILED',
                `Signal: ${signal}`
            );
        }

        // Check if object has error/code structure
        if (isBackendError(obj)) {
            return new APTError(obj.error, obj.code, obj.details);
        }
    }

    // String error
    if (typeof error === 'string') {
        // Try to parse as JSON
        try {
            const parsed = JSON.parse(error);
            if (isBackendError(parsed)) {
                return new APTError(parsed.error, parsed.code, parsed.details);
            }
        } catch {
            // Not JSON, use string as message
        }

        return new APTError(error, 'UNKNOWN_ERROR', error);
    }

    // Unknown error type
    return new APTError(
        'An unexpected error occurred',
        'UNKNOWN_ERROR',
        String(error)
    );
}

/**
 * Check if error is a specific type
 *
 * @param error Error to check
 * @param code Error code to match
 * @returns True if error matches code
 */
export function isErrorCode(error: unknown, code: string): boolean {
    if (error instanceof APTError) {
        return error.code === code;
    }

    const aptError = translateError(error);
    return aptError.code === code;
}

/**
 * Get user-friendly error message
 *
 * Converts technical errors into user-friendly messages suitable for display.
 *
 * @param error Error to format
 * @returns User-friendly error message
 */
export function getUserMessage(error: unknown): string {
    const aptError = translateError(error);

    switch (aptError.code) {
        case 'PACKAGE_NOT_FOUND':
            return aptError.details
                ? `Package "${aptError.details}" was not found`
                : 'Package was not found';

        case 'PERMISSION_DENIED':
            return 'You do not have permission to perform this operation. Try using administrator mode.';

        case 'LOCKED':
            return 'Package manager is locked by another process. Please wait and try again.';

        case 'CACHE_ERROR':
            return 'Failed to access package database. Try refreshing the package list.';

        case 'INVALID_INPUT':
            return aptError.message;

        case 'COMMAND_FAILED':
            return aptError.message || 'Command failed. Please try again.';

        default:
            return aptError.message || 'An unexpected error occurred';
    }
}
