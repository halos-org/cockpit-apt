/**
 * Tests for UpdatesView
 *
 * Validates that the UpdatesView component properly:
 * - Shows generic "System is up to date" when no updates available
 * - Shows update table when updates are available
 * - Handles loading and error states correctly
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Package } from "../../api/types";
import { UpdatesView } from "../UpdatesView";

// Mock cockpit global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).cockpit = {
  spawn: vi.fn(),
  file: vi.fn(),
  location: {
    path: [],
    options: {},
    go: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Default mock for AppContext - will be overridden in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockAppState: any = {
  packages: [],
  packagesLoading: false,
  packagesError: null,
};

// Mock AppContext to control state
vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    actions: {
      setActiveTab: vi.fn(),
      loadPackages: vi.fn(),
    },
  }),
}));

describe("UpdatesView - Empty State Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show generic message when no updates", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("System is up to date")).toBeInTheDocument();
      expect(
        screen.getByText("All installed packages are up to date. Check back later for new updates.")
      ).toBeInTheDocument();
    });
  });
});

describe("UpdatesView - With Available Updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show update table when updates are available", async () => {
    const mockPackages: Package[] = [
      {
        name: "nginx",
        version: "1.18.0",
        summary: "High performance web server",
        section: "web",
        installedVersion: "1.17.0",
        candidateVersion: "1.18.0",
      },
    ];

    mockAppState = {
      packages: mockPackages,
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("1 update available")).toBeInTheDocument();
      expect(screen.getByText("nginx")).toBeInTheDocument();
    });

    // Empty state should NOT be shown
    expect(screen.queryByText("System is up to date")).not.toBeInTheDocument();
  });

  it("should show multiple updates with correct count", async () => {
    const mockPackages: Package[] = [
      {
        name: "nginx",
        version: "1.18.0",
        summary: "Web server",
        section: "web",
        installedVersion: "1.17.0",
        candidateVersion: "1.18.0",
      },
      {
        name: "curl",
        version: "7.68.0",
        summary: "Command line tool",
        section: "net",
        installedVersion: "7.67.0",
        candidateVersion: "7.68.0",
      },
    ];

    mockAppState = {
      packages: mockPackages,
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("2 updates available")).toBeInTheDocument();
      expect(screen.getByText("nginx")).toBeInTheDocument();
      expect(screen.getByText("curl")).toBeInTheDocument();
    });
  });
});

describe("UpdatesView - Loading and Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show loading state when packages are loading", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: true,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Checking for updates...")).toBeInTheDocument();
    });
  });

  it("should show error state when packages error exists", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: "Failed to load packages",
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Available Updates")).toBeInTheDocument();
      // ErrorAlert should be rendered
      expect(screen.queryByText("System is up to date")).not.toBeInTheDocument();
    });
  });
});
