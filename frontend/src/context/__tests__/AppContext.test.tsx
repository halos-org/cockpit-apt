/**
 * AppContext auto-update gating tests.
 *
 * Covers the policy decision from halos-org/cockpit-apt#154: when the user
 * lacks administrative access, AppProvider.loadPackages must NOT fire the
 * auto-`updatePackageLists()` call. The banner shown at the App level is
 * responsible for surfacing the missing-lists state instead.
 *
 * When admin transitions from null/false to true while lists are still
 * missing, loadPackages should re-fire so the gated auto-update path runs
 * without the user clicking "Try again".
 */

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api", () => ({
  APTBridgeError: class extends Error {},
  filterPackages: vi.fn(),
  listRepositories: vi.fn(),
  updatePackageLists: vi.fn(),
}));

vi.mock("../../lib/pageStatus", () => ({
  checkAndNotifyUpdates: vi.fn(),
}));

import { AppProvider, useApp } from "../AppContext";
import { filterPackages, listRepositories, updatePackageLists } from "../../api";

function Probe() {
  useApp();
  return null;
}

describe("AppContext auto-update gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listRepositories).mockResolvedValue([]);
    vi.mocked(filterPackages).mockResolvedValue({
      packages: [],
      total_count: 0,
      applied_filters: [],
      limit: 1000,
      limited: false,
      apt_lists_populated: false,
    });
    vi.mocked(updatePackageLists).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).cockpit.permission;
  });

  it("does NOT fire updatePackageLists when admin is not granted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).cockpit.permission = vi.fn(() => ({
      allowed: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    }));

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );

    await waitFor(() => {
      expect(filterPackages).toHaveBeenCalled();
    });

    // Give any rogue auto-update microtask a chance to fire before asserting.
    await new Promise((r) => setTimeout(r, 50));
    expect(updatePackageLists).not.toHaveBeenCalled();
  });

  it("DOES fire updatePackageLists when admin is granted and lists are missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).cockpit.permission = vi.fn(() => ({
      allowed: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    }));

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );

    await waitFor(() => {
      expect(updatePackageLists).toHaveBeenCalled();
    });
  });
});
