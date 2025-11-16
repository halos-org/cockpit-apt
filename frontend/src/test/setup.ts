/**
 * Vitest setup file.
 *
 * This file runs before all tests to set up the testing environment.
 */

import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock cockpit global
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
(globalThis as any).cockpit = {
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
