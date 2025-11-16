/**
 * Tests for UpdatesView
 *
 * Validates that the UpdatesView component properly:
 * - Shows generic "System is up to date" when no store is active
 * - Shows store-specific messages when a store is active and no updates available
 * - Preserves store name capitalization in messages (not lowercased)
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
  activeStore: null,
  stores: [],
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
      activeStore: null,
      stores: [],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show generic message when no store is active and no updates", async () => {
    mockAppState = {
      activeStore: null,
      stores: [],
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

  it("should show store-specific message when store is active and no updates", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine Navigation & Monitoring",
          description: "Marine apps",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No updates available for Marine Navigation & Monitoring")).toBeInTheDocument();
      expect(
        screen.getByText(
          "All packages from Marine Navigation & Monitoring are up to date. Check back later for new updates."
        )
      ).toBeInTheDocument();
    });
  });

  it("should preserve store name capitalization (not use toLowerCase)", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine Navigation & Monitoring",
          description: "Marine apps",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      // Should NOT have lowercase version
      expect(
        screen.queryByText(/marine navigation & monitoring packages are up to date/)
      ).not.toBeInTheDocument();

      // Should have proper capitalization with "from"
      expect(
        screen.getByText(
          /All packages from Marine Navigation & Monitoring are up to date/
        )
      ).toBeInTheDocument();
    });
  });

  it("should show generic message when different store is active", async () => {
    mockAppState = {
      activeStore: "system",
      stores: [
        {
          id: "system",
          name: "System Packages",
          description: "Core system packages",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No updates available for System Packages")).toBeInTheDocument();
      expect(
        screen.getByText(
          "All packages from System Packages are up to date. Check back later for new updates."
        )
      ).toBeInTheDocument();
    });
  });
});

describe("UpdatesView - With Available Updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      activeStore: null,
      stores: [],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show update table when updates are available without store filter", async () => {
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
      activeStore: null,
      stores: [],
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
      activeStore: null,
      stores: [],
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

  it("should not show empty state when store is active with updates", async () => {
    const mockPackages: Package[] = [
      {
        name: "signalk-server",
        version: "1.50.0",
        summary: "Signal K server",
        section: "misc",
        installedVersion: "1.49.0",
        candidateVersion: "1.50.0",
      },
    ];

    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine Navigation & Monitoring",
          description: "Marine apps",
        },
      ],
      packages: mockPackages,
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      // Should show updates table
      expect(screen.getByText("1 update available")).toBeInTheDocument();
      // Should NOT show empty state
      expect(
        screen.queryByText("No updates available for Marine Navigation & Monitoring")
      ).not.toBeInTheDocument();
    });
  });
});

describe("UpdatesView - Loading and Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      activeStore: null,
      stores: [],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
  });

  it("should show loading state when packages are loading", async () => {
    mockAppState = {
      activeStore: null,
      stores: [],
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
      activeStore: null,
      stores: [],
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

describe("UpdatesView - Store Name Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle very long store names", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine Navigation, Monitoring, Communication, and Weather Systems Package Repository",
          description: "Marine apps",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /No updates available for Marine Navigation, Monitoring, Communication, and Weather Systems Package Repository/
        )
      ).toBeInTheDocument();
    });
  });

  it("should handle store names with special characters", async () => {
    mockAppState = {
      activeStore: "test",
      stores: [
        {
          id: "test",
          name: "Test & Demo (v2.0)",
          description: "Test packages",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No updates available for Test & Demo (v2.0)")).toBeInTheDocument();
      expect(
        screen.getByText(/All packages from Test & Demo \(v2\.0\) are up to date/)
      ).toBeInTheDocument();
    });
  });

  it("should handle single store in list", async () => {
    mockAppState = {
      activeStore: "only",
      stores: [
        {
          id: "only",
          name: "Only Store",
          description: "Single store",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No updates available for Only Store")).toBeInTheDocument();
    });
  });

  it("should handle multiple stores but only one active", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "system",
          name: "System Packages",
          description: "System packages",
        },
        {
          id: "marine",
          name: "Marine Navigation & Monitoring",
          description: "Marine apps",
        },
        {
          id: "utility",
          name: "Utility Apps",
          description: "Utility apps",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      // Should use active store, not first or last in list
      expect(screen.getByText("No updates available for Marine Navigation & Monitoring")).toBeInTheDocument();
    });
  });

  it("should handle activeStore ID that doesn't exist in stores list", async () => {
    mockAppState = {
      activeStore: "nonexistent",
      stores: [
        {
          id: "marine",
          name: "Marine Navigation & Monitoring",
          description: "Marine apps",
        },
      ],
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      // Should fall back to generic message since store not found
      expect(screen.getByText("System is up to date")).toBeInTheDocument();
      expect(
        screen.getByText("All installed packages are up to date. Check back later for new updates.")
      ).toBeInTheDocument();
    });
  });
});
