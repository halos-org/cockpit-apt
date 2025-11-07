/**
 * Progress Reporter for APT Operations
 *
 * Parses progress information from apt-get Status-Fd output and provides
 * structured progress updates for UI display.
 *
 * Status-Fd Format:
 *   apt-get uses Status-Fd to report progress. Each line has the format:
 *   status:<package>:<percentage>:<message>
 *
 *   Examples:
 *     status:nginx:0.00:Installing nginx
 *     status:nginx:50.00:Unpacking nginx
 *     status:nginx:100.00:Installed nginx
 *     pmstatus:dpkg-exec:25.0:Running dpkg
 *
 * Progress Events:
 *   - package: Package being operated on
 *   - percentage: Progress 0-100
 *   - message: Human-readable status message
 *   - stage: Operation stage (downloading, installing, configuring, etc.)
 *
 * Usage:
 *   const reporter = new ProgressReporter((progress) => {
 *     console.log(`${progress.percentage}%: ${progress.message}`);
 *   });
 *
 *   // Parse Status-Fd output line by line
 *   reporter.parseLine('status:nginx:25.00:Downloading nginx');
 *   reporter.parseLine('status:nginx:75.00:Installing nginx');
 *   reporter.parseLine('status:nginx:100.00:Installed nginx');
 *
 *   reporter.complete();
 */

/**
 * Progress information for an operation
 */
export interface ProgressInfo {
    /** Package name being operated on (if applicable) */
    package?: string;

    /** Progress percentage (0-100) */
    percentage: number;

    /** Human-readable status message */
    message: string;

    /** Operation stage (downloading, unpacking, installing, configuring, etc.) */
    stage?: string;

    /** Whether operation is complete */
    complete: boolean;

    /** Whether operation was cancelled */
    cancelled: boolean;

    /** Error message if operation failed */
    error?: string;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Parse operation stage from message
 *
 * @param message Status message
 * @returns Operation stage
 */
function parseStage(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('download')) return 'downloading';
    if (lowerMessage.includes('fetch')) return 'downloading';
    if (lowerMessage.includes('unpack')) return 'unpacking';
    if (lowerMessage.includes('install')) return 'installing';
    if (lowerMessage.includes('configur')) return 'configuring';
    if (lowerMessage.includes('remov')) return 'removing';
    if (lowerMessage.includes('purg')) return 'purging';
    if (lowerMessage.includes('upgrad')) return 'upgrading';
    if (lowerMessage.includes('updat')) return 'updating';

    return undefined;
}

/**
 * Progress reporter for APT operations
 *
 * Parses Status-Fd output from apt-get and reports structured progress.
 */
export class ProgressReporter {
    private callback: ProgressCallback;
    private lastProgress: ProgressInfo;
    private isCancelled: boolean;

    /**
     * Create a new progress reporter
     *
     * @param callback Function to call with progress updates
     */
    constructor(callback: ProgressCallback) {
        this.callback = callback;
        this.isCancelled = false;
        this.lastProgress = {
            percentage: 0,
            message: 'Starting...',
            complete: false,
            cancelled: false,
        };
    }

    /**
     * Parse a Status-Fd output line
     *
     * Format: status:<package>:<percentage>:<message>
     *         or
     *         pmstatus:<package>:<percentage>:<message>
     *
     * @param line Status-Fd output line
     */
    parseLine(line: string): void {
        if (!line || line.trim() === '') {
            return;
        }

        // Check for status or pmstatus line
        if (!line.startsWith('status:') && !line.startsWith('pmstatus:')) {
            return;
        }

        // Split on colons (but message may contain colons)
        const parts = line.split(':');
        if (parts.length < 4) {
            return;
        }

        const type = parts[0]; // 'status' or 'pmstatus'
        const packageName = parts[1];
        const percentageStr = parts[2];
        const message = parts.slice(3).join(':'); // Rejoin message parts

        // Parse percentage
        const percentage = parseFloat(percentageStr);
        if (isNaN(percentage)) {
            return;
        }

        // Create progress info
        const progress: ProgressInfo = {
            package: packageName || undefined,
            percentage: Math.min(100, Math.max(0, percentage)),
            message: message || 'Processing...',
            stage: parseStage(message),
            complete: false,
            cancelled: this.isCancelled,
        };

        this.lastProgress = progress;
        this.callback(progress);
    }

    /**
     * Parse multiple lines of Status-Fd output
     *
     * @param output Status-Fd output (multiple lines)
     */
    parseOutput(output: string): void {
        const lines = output.split('\n');
        for (const line of lines) {
            this.parseLine(line);
        }
    }

    /**
     * Report progress manually (not from Status-Fd)
     *
     * @param percentage Progress percentage (0-100)
     * @param message Status message
     * @param packageName Optional package name
     */
    report(percentage: number, message: string, packageName?: string): void {
        const progress: ProgressInfo = {
            package: packageName,
            percentage: Math.min(100, Math.max(0, percentage)),
            message,
            stage: parseStage(message),
            complete: false,
            cancelled: this.isCancelled,
        };

        this.lastProgress = progress;
        this.callback(progress);
    }

    /**
     * Mark operation as complete
     *
     * @param message Optional completion message
     */
    complete(message?: string): void {
        const progress: ProgressInfo = {
            ...this.lastProgress,
            percentage: 100,
            message: message || 'Complete',
            complete: true,
            cancelled: false,
        };

        this.lastProgress = progress;
        this.callback(progress);
    }

    /**
     * Mark operation as cancelled
     *
     * @param message Optional cancellation message
     */
    cancel(message?: string): void {
        this.isCancelled = true;

        const progress: ProgressInfo = {
            ...this.lastProgress,
            message: message || 'Cancelled',
            complete: true,
            cancelled: true,
        };

        this.lastProgress = progress;
        this.callback(progress);
    }

    /**
     * Report an error
     *
     * @param error Error message
     */
    error(error: string): void {
        const progress: ProgressInfo = {
            ...this.lastProgress,
            message: error,
            complete: true,
            cancelled: false,
            error,
        };

        this.lastProgress = progress;
        this.callback(progress);
    }

    /**
     * Get current progress state
     *
     * @returns Current progress information
     */
    getProgress(): ProgressInfo {
        return { ...this.lastProgress };
    }

    /**
     * Check if operation is cancelled
     *
     * @returns True if cancelled
     */
    isCancelRequested(): boolean {
        return this.isCancelled;
    }

    /**
     * Request cancellation
     */
    requestCancel(): void {
        this.isCancelled = true;
    }
}

/**
 * Create a simple progress reporter that just reports percentage
 *
 * @param callback Callback function receiving percentage only
 * @returns ProgressReporter instance
 */
export function createSimpleReporter(callback: (percentage: number) => void): ProgressReporter {
    return new ProgressReporter((progress) => {
        callback(progress.percentage);
    });
}

/**
 * Create a progress reporter that updates a message element
 *
 * @param callback Callback function receiving message only
 * @returns ProgressReporter instance
 */
export function createMessageReporter(callback: (message: string) => void): ProgressReporter {
    return new ProgressReporter((progress) => {
        callback(progress.message);
    });
}
