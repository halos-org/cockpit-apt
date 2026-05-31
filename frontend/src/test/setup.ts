/**
 * Vitest setup file.
 *
 * This file runs before all tests to set up the testing environment.
 */

import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

import type { CockpitPermission } from "../lib/types";

// Cleanup after each test
afterEach(() => {
  cleanup();
  delete cockpitMock.permission;
});

// Mock cockpit global
const cockpitMock: {
  spawn: (...args: unknown[]) => {
    stream: (...args: unknown[]) => unknown;
    done: (...args: unknown[]) => unknown;
    fail: (...args: unknown[]) => unknown;
  };
  file: (...args: unknown[]) => {
    read: () => Promise<string>;
    replace: () => Promise<void>;
    watch: () => void;
  };
  location: { path: string[]; options: Record<string, unknown>; go: () => void };
  addEventListener: () => void;
  removeEventListener: () => void;
  permission?: (options: { admin: boolean }) => CockpitPermission;
} = {
  spawn: () => ({
    stream: () => ({ done: () => ({ fail: () => ({}) }) }),
    done: () => ({ fail: () => ({}) }),
    fail: () => ({}),
  }),
  file: () => ({
    read: () => Promise.resolve(""),
    replace: () => Promise.resolve(),
    watch: () => {},
  }),
  location: {
    path: [],
    options: {},
    go: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
(globalThis as any).cockpit = cockpitMock;

// Mock window.matchMedia for dark theme support
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

/**
 * Build a fake CockpitPermission without installing it on the global mock.
 */
export interface FakePermissionControls {
  permission: CockpitPermission;
  emitChanged: (next: boolean | null) => void;
}

export function makeFakePermission(initial: boolean | null): FakePermissionControls {
  const listeners = new Set<() => void>();
  const permission: CockpitPermission = {
    allowed: initial,
    addEventListener: vi.fn((event: "changed", cb: () => void) => {
      if (event === "changed") listeners.add(cb);
    }),
    removeEventListener: vi.fn((event: "changed", cb: () => void) => {
      if (event === "changed") listeners.delete(cb);
    }),
    close: vi.fn(() => listeners.clear()),
  };
  return {
    permission,
    emitChanged: (next) => {
      permission.allowed = next;
      for (const cb of listeners) cb();
    },
  };
}

/**
 * Install a fake permission as the `cockpit.permission()` factory.
 * Useful for view-level tests that need to assert gating behavior.
 */
export function installFakePermission(initial: boolean | null): FakePermissionControls {
  const handle = makeFakePermission(initial);
  cockpitMock.permission = vi.fn(() => handle.permission);
  return handle;
}

export { cockpitMock };
