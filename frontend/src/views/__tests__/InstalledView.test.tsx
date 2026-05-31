import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Package } from "../../api/types";
import { InstalledView } from "../InstalledView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).cockpit = {
  spawn: vi.fn(),
  file: vi.fn(),
  location: { path: [], options: {}, go: vi.fn() },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  transport: { control: vi.fn() },
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

const stableContext = {
  state: {
    packages: [installedPackage],
    packagesLoading: false,
    packagesError: null,
  },
  actions: {
    setActiveTab: vi.fn(),
    loadPackages: vi.fn().mockResolvedValue(undefined),
  },
};

vi.mock("../../context/AppContext", () => ({
  useApp: () => stableContext,
}));

vi.mock("../../hooks/useAdminPermission", () => ({
  useAdminPermission: () => ({ allowed: true }),
}));

describe("InstalledView - parent handler wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes onRemove with the package name when Remove is clicked", async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(<InstalledView onNavigateToPackage={vi.fn()} onRemove={onRemove} />);

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith("curl");
    });
  });
});
