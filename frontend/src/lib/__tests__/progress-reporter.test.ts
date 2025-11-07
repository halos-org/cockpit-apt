/**
 * Tests for progress-reporter.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
    ProgressReporter,
    createSimpleReporter,
    createMessageReporter,
    type ProgressInfo,
} from '../progress-reporter';

describe('ProgressReporter', () => {
    describe('Status-Fd Parsing', () => {
        it('should parse basic status line', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:nginx:50.00:Installing nginx');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    package: 'nginx',
                    percentage: 50.0,
                    message: 'Installing nginx',
                    stage: 'installing',
                    complete: false,
                    cancelled: false,
                })
            );
        });

        it('should parse pmstatus line', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('pmstatus:dpkg-exec:25.0:Running dpkg');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    package: 'dpkg-exec',
                    percentage: 25.0,
                    message: 'Running dpkg',
                })
            );
        });

        it('should handle message with colons', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:package:50.00:Message: with: colons');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Message: with: colons',
                })
            );
        });

        it('should handle 0% progress', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:nginx:0.00:Starting installation');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    percentage: 0,
                })
            );
        });

        it('should handle 100% progress', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:nginx:100.00:Installation complete');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    percentage: 100,
                })
            );
        });

        it('should clamp percentage to 0-100 range', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:-10.00:Negative');
            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentage: 0 })
            );

            reporter.parseLine('status:pkg:150.00:Over 100');
            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentage: 100 })
            );
        });

        it('should ignore empty lines', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('');
            reporter.parseLine('   ');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should ignore non-status lines', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('Some random output');
            reporter.parseLine('error: something failed');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should ignore malformed status lines', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:incomplete');
            reporter.parseLine('status:pkg:invalid');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle invalid percentage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:notanumber:Message');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should parse empty package name', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status::50.00:Generic message');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    package: undefined,
                    message: 'Generic message',
                })
            );
        });
    });

    describe('Stage Detection', () => {
        it('should detect downloading stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:10.00:Downloading package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'downloading' })
            );
        });

        it('should detect fetching stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:10.00:Fetching package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'downloading' })
            );
        });

        it('should detect unpacking stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:30.00:Unpacking package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'unpacking' })
            );
        });

        it('should detect installing stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:60.00:Installing package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'installing' })
            );
        });

        it('should detect configuring stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:80.00:Configuring package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'configuring' })
            );
        });

        it('should detect removing stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:Removing package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'removing' })
            );
        });

        it('should detect purging stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:Purging package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'purging' })
            );
        });

        it('should detect upgrading stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:Upgrading package');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'upgrading' })
            );
        });

        it('should detect updating stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:Updating package list');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'updating' })
            );
        });

        it('should return undefined for unknown stage', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:Processing something');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: undefined })
            );
        });

        it('should handle case-insensitive stage detection', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:pkg:50.00:DOWNLOADING PACKAGE');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'downloading' })
            );
        });
    });

    describe('Multi-line Output', () => {
        it('should parse multiple lines', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            const output = `status:nginx:0.00:Starting
status:nginx:25.00:Downloading
status:nginx:50.00:Unpacking
status:nginx:75.00:Installing
status:nginx:100.00:Complete`;

            reporter.parseOutput(output);

            expect(callback).toHaveBeenCalledTimes(5);
            expect(callback).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ percentage: 0, message: 'Starting' })
            );
            expect(callback).toHaveBeenNthCalledWith(
                5,
                expect.objectContaining({ percentage: 100, message: 'Complete' })
            );
        });

        it('should handle mixed valid and invalid lines', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            const output = `status:pkg:10.00:Valid
Random output line
status:pkg:50.00:Also valid
Another random line`;

            reporter.parseOutput(output);

            expect(callback).toHaveBeenCalledTimes(2);
        });

        it('should handle empty output', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseOutput('');

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Manual Progress Reporting', () => {
        it('should report progress manually', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(50, 'Half way done', 'nginx');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    package: 'nginx',
                    percentage: 50,
                    message: 'Half way done',
                    complete: false,
                })
            );
        });

        it('should report progress without package name', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(75, 'Almost done');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    package: undefined,
                    percentage: 75,
                    message: 'Almost done',
                })
            );
        });

        it('should clamp manual progress to 0-100', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(-10, 'Negative');
            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentage: 0 })
            );

            reporter.report(150, 'Over 100');
            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentage: 100 })
            );
        });

        it('should detect stage from manual message', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(30, 'Downloading files');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ stage: 'downloading' })
            );
        });
    });

    describe('Completion and Cancellation', () => {
        it('should mark operation as complete', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(50, 'In progress');
            reporter.complete('All done');

            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    percentage: 100,
                    message: 'All done',
                    complete: true,
                    cancelled: false,
                })
            );
        });

        it('should use default completion message', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.complete();

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Complete',
                    complete: true,
                })
            );
        });

        it('should mark operation as cancelled', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(30, 'In progress');
            reporter.cancel('User cancelled');

            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    message: 'User cancelled',
                    complete: true,
                    cancelled: true,
                })
            );
        });

        it('should use default cancellation message', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.cancel();

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Cancelled',
                    cancelled: true,
                })
            );
        });

        it('should mark subsequent progress as cancelled', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.cancel();
            callback.mockClear();

            reporter.parseLine('status:pkg:50.00:Still running');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    cancelled: true,
                })
            );
        });

        it('should report errors', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.error('Installation failed');

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Installation failed',
                    error: 'Installation failed',
                    complete: true,
                    cancelled: false,
                })
            );
        });
    });

    describe('State Management', () => {
        it('should return current progress', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.report(42, 'Testing');
            const progress = reporter.getProgress();

            expect(progress).toEqual(
                expect.objectContaining({
                    percentage: 42,
                    message: 'Testing',
                })
            );
        });

        it('should check cancellation state', () => {
            const reporter = new ProgressReporter(() => {});

            expect(reporter.isCancelRequested()).toBe(false);

            reporter.requestCancel();
            expect(reporter.isCancelRequested()).toBe(true);
        });

        it('should preserve package info across operations', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            reporter.parseLine('status:nginx:50.00:Installing');
            reporter.complete();

            expect(callback).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    package: 'nginx',
                    complete: true,
                })
            );
        });

        it('should start with initial progress', () => {
            const callback = vi.fn();
            const reporter = new ProgressReporter(callback);

            const progress = reporter.getProgress();

            expect(progress).toEqual(
                expect.objectContaining({
                    percentage: 0,
                    message: 'Starting...',
                    complete: false,
                    cancelled: false,
                })
            );
        });
    });

    describe('Helper Functions', () => {
        it('should create simple percentage reporter', () => {
            const callback = vi.fn();
            const reporter = createSimpleReporter(callback);

            reporter.report(50, 'Test message', 'nginx');

            expect(callback).toHaveBeenCalledWith(50);
        });

        it('should create message-only reporter', () => {
            const callback = vi.fn();
            const reporter = createMessageReporter(callback);

            reporter.report(50, 'Test message', 'nginx');

            expect(callback).toHaveBeenCalledWith('Test message');
        });
    });
});
