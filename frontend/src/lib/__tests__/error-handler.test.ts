/**
 * Tests for error-handler.ts
 */

import { describe, it, expect } from 'vitest';
import { APTError, translateError, isErrorCode, getUserMessage } from '../error-handler';

describe('APTError', () => {
    describe('Constructor', () => {
        it('should create error with message and code', () => {
            const error = new APTError('Test error', 'TEST_CODE');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.name).toBe('APTError');
            expect(error.details).toBeUndefined();
        });

        it('should create error with details', () => {
            const error = new APTError('Test error', 'TEST_CODE', 'Additional details');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.details).toBe('Additional details');
        });

        it('should use default code if not provided', () => {
            const error = new APTError('Test error');

            expect(error.code).toBe('UNKNOWN_ERROR');
        });

        it('should extend Error properly', () => {
            const error = new APTError('Test error', 'TEST_CODE');

            expect(error instanceof Error).toBe(true);
            expect(error instanceof APTError).toBe(true);
        });
    });

    describe('toJSON', () => {
        it('should convert to JSON format', () => {
            const error = new APTError('Test error', 'TEST_CODE');
            const json = error.toJSON();

            expect(json).toEqual({
                error: 'Test error',
                code: 'TEST_CODE',
            });
        });

        it('should include details if present', () => {
            const error = new APTError('Test error', 'TEST_CODE', 'Details');
            const json = error.toJSON();

            expect(json).toEqual({
                error: 'Test error',
                code: 'TEST_CODE',
                details: 'Details',
            });
        });
    });

    describe('toString', () => {
        it('should convert to string without details', () => {
            const error = new APTError('Test error', 'TEST_CODE');
            const str = error.toString();

            expect(str).toBe('APTError [TEST_CODE]: Test error');
        });

        it('should include details if present', () => {
            const error = new APTError('Test error', 'TEST_CODE', 'Details');
            const str = error.toString();

            expect(str).toBe('APTError [TEST_CODE]: Test error (Details)');
        });
    });
});

describe('translateError', () => {
    describe('APTError Pass-through', () => {
        it('should pass through existing APTError', () => {
            const original = new APTError('Test error', 'TEST_CODE', 'Details');
            const translated = translateError(original);

            expect(translated).toBe(original);
            expect(translated.message).toBe('Test error');
            expect(translated.code).toBe('TEST_CODE');
            expect(translated.details).toBe('Details');
        });
    });

    describe('Backend JSON Errors', () => {
        it('should parse JSON error from Error.message', () => {
            const backendJson = JSON.stringify({
                error: 'Package not found: nginx',
                code: 'PACKAGE_NOT_FOUND',
                details: 'nginx',
            });
            const error = new Error(backendJson);
            const translated = translateError(error);

            expect(translated).toBeInstanceOf(APTError);
            expect(translated.message).toBe('Package not found: nginx');
            expect(translated.code).toBe('PACKAGE_NOT_FOUND');
            expect(translated.details).toBe('nginx');
        });

        it('should parse JSON error from string', () => {
            const backendJson = JSON.stringify({
                error: 'Cache error',
                code: 'CACHE_ERROR',
            });
            const translated = translateError(backendJson);

            expect(translated).toBeInstanceOf(APTError);
            expect(translated.message).toBe('Cache error');
            expect(translated.code).toBe('CACHE_ERROR');
        });

        it('should parse JSON error from object', () => {
            const backendError = {
                error: 'Invalid input',
                code: 'INVALID_INPUT',
                details: 'Package name too long',
            };
            const translated = translateError(backendError);

            expect(translated).toBeInstanceOf(APTError);
            expect(translated.message).toBe('Invalid input');
            expect(translated.code).toBe('INVALID_INPUT');
            expect(translated.details).toBe('Package name too long');
        });

        it('should handle backend error without details', () => {
            const backendError = {
                error: 'Unknown command',
                code: 'UNKNOWN_COMMAND',
            };
            const translated = translateError(backendError);

            expect(translated).toBeInstanceOf(APTError);
            expect(translated.message).toBe('Unknown command');
            expect(translated.code).toBe('UNKNOWN_COMMAND');
            expect(translated.details).toBeUndefined();
        });
    });

    describe('Standard Error Objects', () => {
        it('should handle "not found" error pattern', () => {
            const error = new Error('Package nginx not found');
            const translated = translateError(error);

            expect(translated.code).toBe('PACKAGE_NOT_FOUND');
            expect(translated.message).toBe('Package nginx not found');
        });

        it('should handle "no such package" error pattern', () => {
            const error = new Error('No such package: apache2');
            const translated = translateError(error);

            expect(translated.code).toBe('PACKAGE_NOT_FOUND');
        });

        it('should handle permission denied error pattern', () => {
            const error = new Error('Permission denied');
            const translated = translateError(error);

            expect(translated.code).toBe('PERMISSION_DENIED');
            expect(translated.message).toBe('Permission denied');
        });

        it('should handle not authorized error pattern', () => {
            const error = new Error('User not authorized');
            const translated = translateError(error);

            expect(translated.code).toBe('PERMISSION_DENIED');
        });

        it('should handle cache error pattern', () => {
            const error = new Error('Failed to open APT cache');
            const translated = translateError(error);

            expect(translated.code).toBe('CACHE_ERROR');
        });

        it('should handle locked error pattern', () => {
            const error = new Error('Unable to lock /var/lib/dpkg/lock');
            const translated = translateError(error);

            expect(translated.code).toBe('LOCKED');
        });

        it('should handle generic Error as COMMAND_FAILED', () => {
            const error = new Error('Something went wrong');
            const translated = translateError(error);

            expect(translated.code).toBe('COMMAND_FAILED');
            expect(translated.message).toBe('Something went wrong');
        });
    });

    describe('Cockpit Spawn Errors', () => {
        it('should handle exit status error', () => {
            const error = {
                exit_status: 1,
                problem: 'Command failed',
            };
            const translated = translateError(error);

            expect(translated.code).toBe('COMMAND_FAILED');
            expect(translated.message).toBe('Command failed');
            expect(translated.details).toBe('Exit code: 1');
        });

        it('should handle exit status without problem', () => {
            const error = {
                exit_status: 127,
            };
            const translated = translateError(error);

            expect(translated.code).toBe('COMMAND_FAILED');
            expect(translated.message).toBe('Command failed with exit code 127');
            expect(translated.details).toBe('Exit code: 127');
        });

        it('should handle signal error', () => {
            const error = {
                exit_signal: 'SIGTERM',
            };
            const translated = translateError(error);

            expect(translated.code).toBe('COMMAND_FAILED');
            expect(translated.message).toBe('Command terminated by signal SIGTERM');
            expect(translated.details).toBe('Signal: SIGTERM');
        });
    });

    describe('String Errors', () => {
        it('should handle JSON string', () => {
            const jsonStr = '{"error":"Test error","code":"TEST_CODE"}';
            const translated = translateError(jsonStr);

            expect(translated.code).toBe('TEST_CODE');
            expect(translated.message).toBe('Test error');
        });

        it('should handle non-JSON string', () => {
            const translated = translateError('Simple error message');

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.message).toBe('Simple error message');
            expect(translated.details).toBe('Simple error message');
        });
    });

    describe('Unknown Error Types', () => {
        it('should handle null', () => {
            const translated = translateError(null);

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.message).toBe('An unexpected error occurred');
        });

        it('should handle undefined', () => {
            const translated = translateError(undefined);

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.message).toBe('An unexpected error occurred');
        });

        it('should handle number', () => {
            const translated = translateError(42);

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.message).toBe('An unexpected error occurred');
            expect(translated.details).toBe('42');
        });

        it('should handle boolean', () => {
            const translated = translateError(false);

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.details).toBe('false');
        });

        it('should handle array', () => {
            const translated = translateError([1, 2, 3]);

            expect(translated.code).toBe('UNKNOWN_ERROR');
            expect(translated.details).toBe('1,2,3');
        });
    });
});

describe('isErrorCode', () => {
    it('should return true for matching APTError', () => {
        const error = new APTError('Test', 'TEST_CODE');
        expect(isErrorCode(error, 'TEST_CODE')).toBe(true);
    });

    it('should return false for non-matching APTError', () => {
        const error = new APTError('Test', 'TEST_CODE');
        expect(isErrorCode(error, 'OTHER_CODE')).toBe(false);
    });

    it('should work with translated errors', () => {
        const error = new Error('Package not found');
        expect(isErrorCode(error, 'PACKAGE_NOT_FOUND')).toBe(true);
        expect(isErrorCode(error, 'CACHE_ERROR')).toBe(false);
    });

    it('should work with JSON errors', () => {
        const error = JSON.stringify({
            error: 'Cache error',
            code: 'CACHE_ERROR',
        });
        expect(isErrorCode(error, 'CACHE_ERROR')).toBe(true);
        expect(isErrorCode(error, 'UNKNOWN_ERROR')).toBe(false);
    });
});

describe('getUserMessage', () => {
    it('should provide friendly message for PACKAGE_NOT_FOUND', () => {
        const error = new APTError('Package not found', 'PACKAGE_NOT_FOUND', 'nginx');
        const message = getUserMessage(error);

        expect(message).toBe('Package "nginx" was not found');
    });

    it('should provide friendly message for PACKAGE_NOT_FOUND without details', () => {
        const error = new APTError('Package not found', 'PACKAGE_NOT_FOUND');
        const message = getUserMessage(error);

        expect(message).toBe('Package was not found');
    });

    it('should provide friendly message for PERMISSION_DENIED', () => {
        const error = new APTError('Permission denied', 'PERMISSION_DENIED');
        const message = getUserMessage(error);

        expect(message).toBe(
            'You do not have permission to perform this operation. Try using administrator mode.'
        );
    });

    it('should provide friendly message for LOCKED', () => {
        const error = new APTError('Locked', 'LOCKED');
        const message = getUserMessage(error);

        expect(message).toBe(
            'Package manager is locked by another process. Please wait and try again.'
        );
    });

    it('should provide friendly message for CACHE_ERROR', () => {
        const error = new APTError('Cache error', 'CACHE_ERROR');
        const message = getUserMessage(error);

        expect(message).toBe('Failed to access package database. Try refreshing the package list.');
    });

    it('should use original message for INVALID_INPUT', () => {
        const error = new APTError('Package name too long', 'INVALID_INPUT');
        const message = getUserMessage(error);

        expect(message).toBe('Package name too long');
    });

    it('should use original message for COMMAND_FAILED', () => {
        const error = new APTError('Command exited with code 1', 'COMMAND_FAILED');
        const message = getUserMessage(error);

        expect(message).toBe('Command exited with code 1');
    });

    it('should provide default message for unknown codes', () => {
        const error = new APTError('Unknown problem', 'WEIRD_CODE');
        const message = getUserMessage(error);

        expect(message).toBe('Unknown problem');
    });

    it('should work with non-APTError', () => {
        const error = new Error('Something failed');
        const message = getUserMessage(error);

        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
    });

    it('should provide fallback for errors without message', () => {
        const error = new APTError('', 'UNKNOWN_ERROR');
        const message = getUserMessage(error);

        expect(message).toBe('An unexpected error occurred');
    });
});
