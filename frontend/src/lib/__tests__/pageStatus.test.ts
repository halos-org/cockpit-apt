/**
 * Tests for pageStatus.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import type { FilterPackagesResponse } from "../../api/types";
import { checkAndNotifyUpdates, setPageStatus } from "../pageStatus";

// Mock the api module
vi.mock("../../api", () => ({
  filterPackages: vi.fn(),
  APTBridgeError: class extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Mock cockpit global
const mockControl = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).cockpit = {
  spawn: vi.fn(),
  file: vi.fn(),
  location: { path: [], options: {}, go: vi.fn() },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  transport: {
    control: mockControl,
  },
};

describe("pageStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setPageStatus", () => {
    it("should send page_status via cockpit transport control", () => {
      setPageStatus({ type: "info", title: "3 updates available" });
      expect(mockControl).toHaveBeenCalledWith("notify", {
        page_status: { type: "info", title: "3 updates available" },
      });
    });

    it("should clear status when null is passed", () => {
      setPageStatus(null);
      expect(mockControl).toHaveBeenCalledWith("notify", {
        page_status: null,
      });
    });
  });

  describe("checkAndNotifyUpdates", () => {
    it("should set info status when updates are available", async () => {
      const response: FilterPackagesResponse = {
        packages: [
          {
            name: "pkg1",
            version: "1.0",
            summary: "",
            section: "",
            installed: true,
            upgradable: true,
          },
        ],
        total_count: 5,
        applied_filters: ["upgradable"],
        limit: 1,
        limited: true,
        apt_lists_populated: true,
      };
      vi.mocked(api.filterPackages).mockResolvedValue(response);

      checkAndNotifyUpdates();
      await vi.waitFor(() => {
        expect(mockControl).toHaveBeenCalledWith("notify", {
          page_status: { type: "info", title: "5 updates available" },
        });
      });

      expect(api.filterPackages).toHaveBeenCalledWith({ tab: "upgradable", limit: 1 });
    });

    it("should use singular 'update' for count of 1", async () => {
      const response: FilterPackagesResponse = {
        packages: [
          {
            name: "pkg1",
            version: "1.0",
            summary: "",
            section: "",
            installed: true,
            upgradable: true,
          },
        ],
        total_count: 1,
        applied_filters: ["upgradable"],
        limit: 1,
        limited: false,
        apt_lists_populated: true,
      };
      vi.mocked(api.filterPackages).mockResolvedValue(response);

      checkAndNotifyUpdates();
      await vi.waitFor(() => {
        expect(mockControl).toHaveBeenCalledWith("notify", {
          page_status: { type: "info", title: "1 update available" },
        });
      });
    });

    it("should clear status when no updates are available", async () => {
      const response: FilterPackagesResponse = {
        packages: [],
        total_count: 0,
        applied_filters: ["upgradable"],
        limit: 1,
        limited: false,
        apt_lists_populated: true,
      };
      vi.mocked(api.filterPackages).mockResolvedValue(response);

      checkAndNotifyUpdates();
      await vi.waitFor(() => {
        expect(mockControl).toHaveBeenCalledWith("notify", {
          page_status: null,
        });
      });
    });

    it("should clear status on error", async () => {
      vi.mocked(api.filterPackages).mockRejectedValue(new Error("backend unavailable"));

      checkAndNotifyUpdates();
      await vi.waitFor(() => {
        expect(mockControl).toHaveBeenCalledWith("notify", {
          page_status: null,
        });
      });
    });
  });
});
