import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Package } from "../../api/types";
import { SectionPackageListView } from "../SectionPackageListView";

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
  section: "utils",
  architecture: "arm64",
};

vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: { packages: [], packagesLoading: false, packagesError: null },
    actions: { loadPackages: vi.fn().mockResolvedValue(undefined) },
  }),
}));

vi.mock("../../hooks/useAdminPermission", () => ({
  useAdminPermission: () => ({ allowed: true }),
}));

const mockListPackagesBySection = vi.fn();
vi.mock("../../lib/api", () => ({
  listPackagesBySection: (...args: unknown[]) => mockListPackagesBySection(...args),
}));

describe("SectionPackageListView - parent handler wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPackagesBySection.mockResolvedValue([installablePackage, installedPackage]);
  });

  it("invokes onInstall with the package name when Install is clicked", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <SectionPackageListView
        sectionName="utils"
        onNavigateToPackage={vi.fn()}
        onNavigateToSections={vi.fn()}
        onInstall={onInstall}
        onRemove={onRemove}
      />
    );

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

    render(
      <SectionPackageListView
        sectionName="utils"
        onNavigateToPackage={vi.fn()}
        onNavigateToSections={vi.fn()}
        onInstall={onInstall}
        onRemove={onRemove}
      />
    );

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith("curl");
    });
    expect(onInstall).not.toHaveBeenCalled();
  });
});
