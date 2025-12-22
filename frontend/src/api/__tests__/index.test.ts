/**
 * Tests for API wrapper layer
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { APTBridgeError, filterPackages, formatErrorMessage, listRepositories } from "../index";

// Mock the global cockpit object
const mockSpawn = vi.fn();
(globalThis as typeof globalThis & { cockpit: typeof cockpit }).cockpit = {
  spawn: mockSpawn,
  file: vi.fn(),
  location: {} as Location,
} as typeof cockpit;

describe("API Wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listRepositories", () => {
    it("should list repositories", async () => {
      const mockRepos = [
        {
          id: "marine:stable",
          name: "Marine",
          origin: "marine",
          label: "Marine",
          suite: "stable",
          package_count: 10,
        },
      ];

      const mockProc = {
        stream: vi.fn((callback) => {
          callback(JSON.stringify(mockRepos));
          return mockProc;
        }),
        done: vi.fn((callback) => {
          callback();
          return mockProc;
        }),
        fail: vi.fn().mockReturnThis(),
      };

      mockSpawn.mockReturnValue(mockProc);

      const result = await listRepositories();
      expect(result).toEqual(mockRepos);
      expect(mockSpawn).toHaveBeenCalledWith(
        ["cockpit-apt-bridge", "list-repositories"],
        expect.any(Object)
      );
    });
  });

  describe("filterPackages", () => {
    it("should build correct command arguments", async () => {
      const mockResponse = {
        packages: [],
        total_count: 0,
        applied_filters: [],
        limit: 1000,
        limited: false,
      };

      const mockProc = {
        stream: vi.fn((callback) => {
          callback(JSON.stringify(mockResponse));
          return mockProc;
        }),
        done: vi.fn((callback) => {
          callback();
          return mockProc;
        }),
        fail: vi.fn().mockReturnThis(),
      };

      mockSpawn.mockReturnValue(mockProc);

      await filterPackages({
        repository_id: "marine:stable",
        tab: "installed",
        search_query: "signal",
        limit: 50,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        [
          "cockpit-apt-bridge",
          "filter-packages",
          "--repo",
          "marine:stable",
          "--tab",
          "installed",
          "--search=signal",
          "--limit",
          "50",
        ],
        expect.any(Object)
      );
    });

    it("should handle dash-prefixed search queries correctly", async () => {
      const mockResponse = {
        packages: [],
        total_count: 0,
        applied_filters: [],
        limit: 1000,
        limited: false,
      };

      const mockProc = {
        stream: vi.fn((callback) => {
          callback(JSON.stringify(mockResponse));
          return mockProc;
        }),
        done: vi.fn((callback) => {
          callback();
          return mockProc;
        }),
        fail: vi.fn().mockReturnThis(),
      };

      mockSpawn.mockReturnValue(mockProc);

      // This would previously fail because argparse would interpret "-test" as a flag
      await filterPackages({
        search_query: "-test",
      });

      // Using --search=VALUE format prevents argparse misinterpretation
      expect(mockSpawn).toHaveBeenCalledWith(
        ["cockpit-apt-bridge", "filter-packages", "--search=-test"],
        expect.any(Object)
      );
    });
  });

  describe("formatErrorMessage", () => {
    it("should format APTBridgeError with details", () => {
      const error = new APTBridgeError("Test error", "TEST_CODE", "Extra details");
      const message = formatErrorMessage(error);
      expect(message).toBe("Test error: Extra details");
    });

    it("should format APTBridgeError without details", () => {
      const error = new APTBridgeError("Test error", "TEST_CODE");
      const message = formatErrorMessage(error);
      expect(message).toBe("Test error");
    });

    it("should format generic Error", () => {
      const error = new Error("Generic error");
      const message = formatErrorMessage(error);
      expect(message).toBe("Generic error");
    });

    it("should format unknown error", () => {
      const message = formatErrorMessage("String error");
      expect(message).toBe("String error");
    });
  });
});
