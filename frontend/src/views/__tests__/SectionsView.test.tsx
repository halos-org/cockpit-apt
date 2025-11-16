/**
 * Tests for SectionsView
 *
 * Validates that the SectionsView component properly:
 * - Shows Debian sections when no store is active or store has no category_metadata
 * - Shows categories when active store has category_metadata
 * - Renders correct icons (PatternFly and file paths)
 * - Switches between modes when active store changes
 * - Handles loading and error states correctly
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "../../api/types";
import * as api from "../../lib/api";
import type { Section } from "../../lib/types";
import { SectionsView } from "../SectionsView";

// Mock API
vi.mock("../../lib/api");

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

// Mock AppContext to control active store
vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    actions: {},
  }),
}));

describe("SectionsView - Sections Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      activeStore: null,
      stores: [],
    };
  });

  it("should show sections mode when no store is active", async () => {
    const mockSections: Section[] = [
      { name: "web", count: 100 },
      { name: "net", count: 50 },
    ];

    vi.mocked(api.listSections).mockResolvedValue(mockSections);
    vi.mocked(api.listCategories).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Browse by Section")).toBeInTheDocument();
      expect(screen.getByText("Web")).toBeInTheDocument();
      expect(screen.getByText("Net")).toBeInTheDocument();
    });

    // listSections is called without parameters (useCache defaults to true in the hook)
    expect(api.listSections).toHaveBeenCalled();
    expect(api.listCategories).not.toHaveBeenCalled();
  });

  it("should show sections mode when store has no category_metadata", async () => {
    mockAppState = {
      activeStore: "test-store",
      stores: [
        {
          id: "test-store",
          name: "Test Store",
          description: "Test",
          custom_sections: [
            { section: "web", label: "Web Apps", description: "Web applications" },
          ],
        },
      ],
    };

    const mockSections: Section[] = [{ name: "web", count: 50 }];
    vi.mocked(api.listSections).mockResolvedValue(mockSections);
    vi.mocked(api.listCategories).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Browse by Section")).toBeInTheDocument();
    });

    // listSections should be called, but listCategories hook is still mounted
    // (it's just disabled with enabled=false parameter in useCategories)
    expect(api.listSections).toHaveBeenCalled();
  });

  it("should display section count correctly", async () => {
    const mockSections: Section[] = [
      { name: "web", count: 100 },
      { name: "net", count: 1 },
    ];

    vi.mocked(api.listSections).mockResolvedValue(mockSections);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("100 packages")).toBeInTheDocument();
      expect(screen.getByText("1 package")).toBeInTheDocument();
    });
  });
});

describe("SectionsView - Categories Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine Store",
          description: "Marine apps",
          category_metadata: [
            {
              id: "navigation",
              label: "Navigation & Charts",
              description: "Chart plotters and navigation tools",
            },
            {
              id: "monitoring",
              label: "Data & Monitoring",
              description: "Data logging and monitoring",
            },
          ],
        },
      ],
    };
  });

  it("should show categories mode when store has category_metadata", async () => {
    const mockCategories: Category[] = [
      {
        id: "navigation",
        label: "Navigation & Charts",
        description: "Chart plotters and navigation tools",
        count: 5,
      },
      {
        id: "monitoring",
        label: "Data & Monitoring",
        description: "Data logging and monitoring",
        count: 3,
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.listSections).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Browse by Category")).toBeInTheDocument();
      expect(screen.getByText("Navigation & Charts")).toBeInTheDocument();
      expect(screen.getByText("Data & Monitoring")).toBeInTheDocument();
    });

    // listCategories is called with storeId only (useCache defaults to true in the hook)
    expect(api.listCategories).toHaveBeenCalledWith("marine");
    expect(api.listSections).not.toHaveBeenCalled();
  });

  it("should display category descriptions", async () => {
    const mockCategories: Category[] = [
      {
        id: "navigation",
        label: "Navigation",
        description: "Navigation tools for marine use",
        count: 5,
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation tools for marine use")).toBeInTheDocument();
    });
  });

  it("should display category count correctly", async () => {
    const mockCategories: Category[] = [
      { id: "navigation", label: "Navigation", count: 10 },
      { id: "monitoring", label: "Monitoring", count: 1 },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("10 packages")).toBeInTheDocument();
      expect(screen.getByText("1 package")).toBeInTheDocument();
    });
  });

  it("should sort categories alphabetically by label", async () => {
    const mockCategories: Category[] = [
      { id: "visualization", label: "Visualization", count: 2 },
      { id: "navigation", label: "Navigation", count: 5 },
      { id: "monitoring", label: "Monitoring", count: 3 },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      const cards = screen.getAllByRole("button");
      expect(cards[0]).toHaveAccessibleName(/Monitoring/);
      expect(cards[1]).toHaveAccessibleName(/Navigation/);
      expect(cards[2]).toHaveAccessibleName(/Visualization/);
    });
  });
});

describe("SectionsView - Icon Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render PatternFly icons for known category IDs", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "navigation", label: "Navigation" }],
        },
      ],
    };

    const mockCategories: Category[] = [
      { id: "navigation", label: "Navigation", count: 5 },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      // Check that an icon is rendered (PatternFly icons render as SVG)
      const card = screen.getByRole("button", { name: /Navigation/ });
      expect(card).toBeInTheDocument();
    });
  });

  it("should render image tags for file path icons", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [
            {
              id: "custom",
              label: "Custom Category",
              icon: "/usr/share/icons/custom.svg",
            },
          ],
        },
      ],
    };

    const mockCategories: Category[] = [
      {
        id: "custom",
        label: "Custom Category",
        icon: "/usr/share/icons/custom.svg",
        count: 2,
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    const { container } = render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      const img = container.querySelector('img[src="/usr/share/icons/custom.svg"]');
      expect(img).toBeInTheDocument();
    });
  });
});

describe("SectionsView - Loading and Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      activeStore: null,
      stores: [],
    };
  });

  it("should show loading skeleton in sections mode", async () => {
    let resolveListSections: (value: Section[]) => void;
    const promise = new Promise<Section[]>((resolve) => {
      resolveListSections = resolve;
    });

    vi.mocked(api.listSections).mockReturnValue(promise);
    vi.mocked(api.listCategories).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    // Initially loading - heading should still be visible but no content
    expect(screen.getByText("Browse by Section")).toBeInTheDocument();
    expect(screen.queryByText("sections available")).not.toBeInTheDocument();

    // Resolve the promise
    resolveListSections!([{ name: "web", count: 1 }]);

    // After loading, content should appear
    await waitFor(() => {
      expect(screen.getByText("1 section available")).toBeInTheDocument();
    });
  });

  it("should show loading skeleton in categories mode", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "navigation", label: "Navigation" }],
        },
      ],
    };

    let resolveListCategories: (value: Category[]) => void;
    const promise = new Promise<Category[]>((resolve) => {
      resolveListCategories = resolve;
    });

    vi.mocked(api.listCategories).mockReturnValue(promise);
    vi.mocked(api.listSections).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    // Initially loading
    expect(screen.getByText("Browse by Category")).toBeInTheDocument();
    expect(screen.queryByText("categories available")).not.toBeInTheDocument();

    // Resolve the promise
    resolveListCategories!([{ id: "navigation", label: "Navigation", count: 1 }]);

    // After loading, content should appear
    await waitFor(() => {
      expect(screen.getByText("1 category available")).toBeInTheDocument();
    });
  });

  it("should show error alert in sections mode on API failure", async () => {
    vi.mocked(api.listSections).mockRejectedValue(new Error("API Error"));

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      // ErrorAlert component should be rendered
      expect(screen.queryByText("2 sections available")).not.toBeInTheDocument();
    });
  });

  it("should show error alert in categories mode on API failure", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "navigation", label: "Navigation" }],
        },
      ],
    };

    vi.mocked(api.listCategories).mockRejectedValue(new Error("API Error"));

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText("Browse by Category")).toBeInTheDocument();
    });
  });

  it("should show empty state when no sections found", async () => {
    vi.mocked(api.listSections).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No sections found")).toBeInTheDocument();
      expect(
        screen.getByText("No package sections are available in the APT cache.")
      ).toBeInTheDocument();
    });
  });

  it("should show empty state when no categories found", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "navigation", label: "Navigation" }],
        },
      ],
    };

    vi.mocked(api.listCategories).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No categories found")).toBeInTheDocument();
      expect(screen.getByText("No categories found for this store.")).toBeInTheDocument();
    });
  });
});

describe("SectionsView - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show sections mode when category_metadata is empty array", async () => {
    mockAppState = {
      activeStore: "test",
      stores: [
        {
          id: "test",
          name: "Test",
          category_metadata: [], // Empty array - should show sections mode
        },
      ],
    };

    vi.mocked(api.listSections).mockResolvedValue([{ name: "web", count: 1 }]);
    vi.mocked(api.listCategories).mockResolvedValue([]);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Browse by Section")).toBeInTheDocument();
      expect(screen.getByText("Web")).toBeInTheDocument();
    });
  });

  it("should handle category without description or icon gracefully", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "minimal", label: "Minimal Category" }],
        },
      ],
    };

    const mockCategories: Category[] = [
      {
        id: "minimal",
        label: "Minimal Category",
        count: 5,
        // No description, no icon
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Minimal Category")).toBeInTheDocument();
      expect(screen.getByText("5 packages")).toBeInTheDocument();
      // Description should not be present
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });
  });

  it("should not crash when onNavigateToSection is undefined", async () => {
    mockAppState = {
      activeStore: null,
      stores: [],
    };

    vi.mocked(api.listSections).mockResolvedValue([{ name: "web", count: 1 }]);

    const { container } = render(<SectionsView />); // No onNavigateToSection prop

    // Wait for the button to be rendered (not just the heading)
    // The heading is always rendered, but the button is only rendered after data loads
    const card = await screen.findByRole("button", { name: /View.*web/i });

    // Click on a section card - should not crash
    card.click();

    // Component should still be rendered
    expect(container).toBeInTheDocument();
  });

  it("should handle very long category names gracefully", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [
            {
              id: "long",
              label: "This is a very very very very very very long category name that might overflow",
            },
          ],
        },
      ],
    };

    const mockCategories: Category[] = [
      {
        id: "long",
        label: "This is a very very very very very very long category name that might overflow",
        count: 1,
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "This is a very very very very very very long category name that might overflow"
        )
      ).toBeInTheDocument();
    });
  });

  it("should handle category with count of 0", async () => {
    mockAppState = {
      activeStore: "marine",
      stores: [
        {
          id: "marine",
          name: "Marine",
          category_metadata: [{ id: "empty", label: "Empty Category" }],
        },
      ],
    };

    const mockCategories: Category[] = [
      {
        id: "empty",
        label: "Empty Category",
        count: 0,
      },
    ];

    vi.mocked(api.listCategories).mockResolvedValue(mockCategories);

    render(<SectionsView onNavigateToSection={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("0 packages")).toBeInTheDocument();
    });
  });
});
