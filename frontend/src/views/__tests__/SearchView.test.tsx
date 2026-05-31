import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Package } from "../../api/types";
import { SearchView } from "../SearchView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).cockpit = {
  spawn: vi.fn(),
  file: vi.fn(),
  location: { path: [], options: {}, go: vi.fn() },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  transport: { control: vi.fn() },
};

const installablePackage: Package = {
  name: "htop",
  version: "3.3.0-2",
  installedVersion: undefined,
  candidateVersion: "3.3.0-2",
  installed: false,
  upgradable: false,
  summary: "interactive process viewer",
  section: "utils",
  architecture: "arm64",
};

const installedPackage: Package = {
  name: "curl",
  version: "8.5.0-1",
  installedVersion: "8.5.0-1",
  candidateVersion: "8.5.0-1",
  installed: true,
  upgradable: false,
  summary: "command line tool for transferring data with URL syntax",
  section: "web",
  architecture: "arm64",
};

vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: {
      packages: [installablePackage, installedPackage],
      packagesLoading: false,
      packagesError: null,
      searchQuery: "ht",
      limitedResults: false,
    },
    actions: {
      setActiveTab: vi.fn(),
      setSearchQuery: vi.fn(),
      loadPackages: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
    },
  }),
}));

vi.mock("../../hooks/useAdminPermission", () => ({
  useAdminPermission: () => ({ allowed: true }),
}));

describe("SearchView - parent handler wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes onInstall with the package name when Install is clicked", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(<SearchView onInstall={onInstall} onRemove={onRemove} />);

    const installButton = await screen.findByRole("button", { name: "Install" });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(onInstall).toHaveBeenCalledWith("htop");
    });
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("invokes onRemove with the package name when Remove is clicked", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(<SearchView onInstall={onInstall} onRemove={onRemove} />);

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith("curl");
    });
    expect(onInstall).not.toHaveBeenCalled();
  });
});
