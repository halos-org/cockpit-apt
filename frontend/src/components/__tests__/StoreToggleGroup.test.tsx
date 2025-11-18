/**
 * Tests for StoreToggleGroup
 *
 * Validates that the StoreToggleGroup component properly:
 * - Only renders when stores are available (hidden in vanilla mode)
 * - Displays "All Packages" as the first option
 * - Does not render a label element
 * - Has proper accessibility attributes (aria-label, no aria-labelledby)
 * - Handles store selection correctly
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreToggleGroup } from "../StoreToggleGroup";

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
};

// Mock AppContext to control state
vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    actions: {
      setActiveStore: vi.fn(),
    },
  }),
}));

describe("StoreToggleGroup - Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when stores.length === 0 (vanilla mode)", () => {
    mockAppState = {
      activeStore: null,
      stores: [],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when stores.length === 1", () => {
    mockAppState = {
      activeStore: null,
      stores: [{ id: "test", name: "Test Store" }],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.firstChild).not.toBeNull();
    // Should show "All Packages" + the single store
    expect(screen.getByText("All Packages")).toBeInTheDocument();
    expect(screen.getByText("Test Store")).toBeInTheDocument();
  });

  it("should render when stores.length >= 2", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.firstChild).not.toBeNull();
  });

  it("should render with 3 or more stores", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
        { id: "test", name: "Test" },
      ],
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("Marine")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});

describe("StoreToggleGroup - Text Content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display 'All Packages' not 'All Stores'", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("All Packages")).toBeInTheDocument();
    expect(screen.queryByText("All Stores")).not.toBeInTheDocument();
  });

  it("should display all store names", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine Navigation & Monitoring" },
        { id: "dev", name: "Development Tools" },
      ],
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("Marine Navigation & Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Development Tools")).toBeInTheDocument();
  });
});

describe("StoreToggleGroup - DOM Structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render a label element", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.querySelector("label")).not.toBeInTheDocument();
  });

  it("should render ToggleGroup with wrapper div", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.querySelector(".store-toggle-group")).toBeInTheDocument();
  });
});

describe("StoreToggleGroup - Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have aria-label without aria-labelledby", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    render(<StoreToggleGroup />);
    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "Store selection");
    expect(group).not.toHaveAttribute("aria-labelledby");
  });

  it("should have correct button IDs for accessibility", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    const { container } = render(<StoreToggleGroup />);
    expect(container.querySelector("#store-all")).toBeInTheDocument();
    expect(container.querySelector("#store-marine")).toBeInTheDocument();
    expect(container.querySelector("#store-dev")).toBeInTheDocument();
  });
});

describe("StoreToggleGroup - Selection State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show 'All Packages' selected when activeStore is null", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    render(<StoreToggleGroup />);
    const allButton = screen.getByRole("button", { name: "All Packages" });
    expect(allButton).toHaveAttribute("aria-pressed", "true");
  });

  it("should show correct store selected when activeStore is set", () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    render(<StoreToggleGroup />);
    const marineButton = screen.getByRole("button", { name: "Marine" });
    expect(marineButton).toHaveAttribute("aria-pressed", "true");

    const allButton = screen.getByRole("button", { name: "All Packages" });
    expect(allButton).toHaveAttribute("aria-pressed", "false");
  });

  it("should have correct selection state for different stores", () => {
    mockAppState = {
      activeStore: "dev",
      stores: [
        { id: "marine", name: "Marine" },
        { id: "dev", name: "Development" },
      ],
    };

    render(<StoreToggleGroup />);
    const devButton = screen.getByRole("button", { name: "Development" });
    const marineButton = screen.getByRole("button", { name: "Marine" });
    const allButton = screen.getByRole("button", { name: "All Packages" });

    expect(devButton).toHaveAttribute("aria-pressed", "true");
    expect(marineButton).toHaveAttribute("aria-pressed", "false");
    expect(allButton).toHaveAttribute("aria-pressed", "false");
  });
});

describe("StoreToggleGroup - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle exactly 2 stores", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "store1", name: "Store 1" },
        { id: "store2", name: "Store 2" },
      ],
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("All Packages")).toBeInTheDocument();
    expect(screen.getByText("Store 1")).toBeInTheDocument();
    expect(screen.getByText("Store 2")).toBeInTheDocument();
  });

  it("should handle stores with special characters in names", () => {
    mockAppState = {
      activeStore: null,
      stores: [
        { id: "marine", name: "Marine Navigation & Monitoring (v2.0)" },
        { id: "dev", name: "Dev/Test Tools" },
      ],
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("Marine Navigation & Monitoring (v2.0)")).toBeInTheDocument();
    expect(screen.getByText("Dev/Test Tools")).toBeInTheDocument();
  });

  it("should render 'All Packages' even with many stores", () => {
    mockAppState = {
      activeStore: null,
      stores: Array.from({ length: 10 }, (_, i) => ({
        id: `store${i}`,
        name: `Store ${i}`,
      })),
    };

    render(<StoreToggleGroup />);
    expect(screen.getByText("All Packages")).toBeInTheDocument();
  });
});
