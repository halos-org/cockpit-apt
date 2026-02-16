/**
 * Tests for UpdatesView
 *
 * Validates that the UpdatesView component properly:
 * - Shows generic "System is up to date" when no updates available
 * - Shows update table when updates are available
 * - Handles loading and error states correctly
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const mockLoadPackages = vi.fn();

// Mock AppContext to control state
vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    actions: {
      setActiveTab: vi.fn(),
      loadPackages: mockLoadPackages,
    },
  }),
}));

// Mock API functions
const mockUpgradeAllPackages = vi.fn();
const mockInstallPackage = vi.fn();
const mockUpdatePackageLists = vi.fn();
vi.mock("../../lib/api", () => ({
  upgradeAllPackages: (...args: unknown[]) => mockUpgradeAllPackages(...args),
  installPackage: (...args: unknown[]) => mockInstallPackage(...args),
  updatePackageLists: (...args: unknown[]) => mockUpdatePackageLists(...args),
}));

describe("UpdatesView - Empty State Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
    };
    mockUpdatePackageLists.mockResolvedValue(undefined);
    mockLoadPackages.mockResolvedValue(undefined);
  });

  it("should show 'up to date' when no updates and apt lists populated", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
      aptListsPopulated: true,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("System is up to date")).toBeInTheDocument();
      expect(
        screen.getByText("All installed packages are up to date. Check back later for new updates.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Package lists not available")).not.toBeInTheDocument();
  });

  it("should show 'package lists not available' when apt lists are empty", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
      aptListsPopulated: false,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Package lists not available")).toBeInTheDocument();
      expect(screen.getByText(/Package lists have not been downloaded yet/)).toBeInTheDocument();
    });

    expect(screen.queryByText("System is up to date")).not.toBeInTheDocument();
  });

  it("should call updatePackageLists when 'Check for updates' is clicked", async () => {
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
      aptListsPopulated: false,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    const button = screen.getByRole("button", { name: /check for updates/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockUpdatePackageLists).toHaveBeenCalled();
    expect(mockLoadPackages).toHaveBeenCalled();
  });

  it("should show error when updatePackageLists fails", async () => {
    mockUpdatePackageLists.mockRejectedValue(new Error("apt update failed"));
    mockAppState = {
      packages: [],
      packagesLoading: false,
      packagesError: null,
      aptListsPopulated: false,
    };

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    const button = screen.getByRole("button", { name: /check for updates/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Failed to check for updates")).toBeInTheDocument();
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
        installed: true,
        upgradable: true,
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
        installed: true,
        upgradable: true,
        installedVersion: "1.17.0",
        candidateVersion: "1.18.0",
      },
      {
        name: "curl",
        version: "7.68.0",
        summary: "Command line tool",
        section: "net",
        installed: true,
        upgradable: true,
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

describe("UpdatesView - Upgrade All", () => {
  const mockPackages: Package[] = [
    {
      name: "nginx",
      version: "1.18.0",
      summary: "Web server",
      section: "web",
      installed: true,
      upgradable: true,
      installedVersion: "1.17.0",
      candidateVersion: "1.18.0",
    },
    {
      name: "curl",
      version: "7.68.0",
      summary: "Command line tool",
      section: "net",
      installed: true,
      upgradable: true,
      installedVersion: "7.67.0",
      candidateVersion: "7.68.0",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      packages: mockPackages,
      packagesLoading: false,
      packagesError: null,
    };
    mockUpgradeAllPackages.mockResolvedValue(undefined);
    mockLoadPackages.mockResolvedValue(undefined);
  });

  it("should show Upgrade All button when updates exist", () => {
    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    expect(screen.getByRole("button", { name: /upgrade all/i })).toBeInTheDocument();
  });

  it("should disable Upgrade All button while upgrading", async () => {
    // Make upgradeAllPackages hang so we can check disabled state
    let resolveUpgrade!: () => void;
    mockUpgradeAllPackages.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpgrade = resolve;
        })
    );

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    const button = screen.getByRole("button", { name: /upgrade all/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Clean up
    resolveUpgrade();
  });

  it("should show error alert when upgrade fails", async () => {
    mockUpgradeAllPackages.mockRejectedValue(new Error("Upgrade failed"));

    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    const button = screen.getByRole("button", { name: /upgrade all/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // Title and message body both contain "Upgrade failed"
    expect(screen.getAllByText("Upgrade failed").length).toBeGreaterThan(0);
  });

  it("should reload packages on successful upgrade", async () => {
    render(<UpdatesView onNavigateToPackage={vi.fn()} />);

    const button = screen.getByRole("button", { name: /upgrade all/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockUpgradeAllPackages).toHaveBeenCalled();
      expect(mockLoadPackages).toHaveBeenCalled();
    });
  });
});
