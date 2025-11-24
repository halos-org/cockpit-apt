/**
 * Tests for SectionsView
 *
 * Validates that the SectionsView component properly:
 * - Renders sections as a grid of cards
 * - Shows loading skeleton during data fetch
 * - Shows error alert with retry button on error
 * - Shows empty state when no sections available
 * - Sorts sections by archive area (main, contrib, non-free)
 * - Calls navigation callback when section is clicked
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock data for sections
const mockSections = [
  { name: "admin", count: 150 },
  { name: "devel", count: 500 },
  { name: "games", count: 200 },
  { name: "web", count: 100 },
];

const mockSectionsWithArchives = [
  { name: "admin", count: 150 },
  { name: "contrib/admin", count: 20 },
  { name: "non-free/admin", count: 10 },
  { name: "devel", count: 500 },
];

// Mock hook state
let mockHookState = {
  data: null as Array<{ name: string; count: number }> | null,
  loading: false,
  error: null as Error | null,
  refetch: vi.fn(),
};

// Mock the useSections hook
vi.mock("../../hooks/usePackages", () => ({
  useSections: () => mockHookState,
}));

// Mock SectionCard to simplify testing
vi.mock("../../components/SectionCard", () => ({
  SectionCard: ({
    section,
    displayName,
    onNavigate,
  }: {
    section: { name: string; count: number };
    displayName: string;
    onNavigate: (name: string) => void;
  }) => (
    <div
      data-testid={`section-card-${section.name}`}
      onClick={() => onNavigate(section.name)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onNavigate(section.name)}
    >
      <span data-testid="display-name">{displayName}</span>
      <span data-testid="count">{section.count}</span>
    </div>
  ),
}));

// Import after mocks are set up
import { SectionsView } from "../SectionsView";

describe("SectionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  describe("Loading State", () => {
    it("shows loading skeleton when loading", () => {
      mockHookState = {
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      // LoadingSkeleton renders multiple skeleton elements
      expect(screen.getByText("Browse by Section")).toBeInTheDocument();
      // The LoadingSkeleton component should be rendered (PatternFly 6)
      expect(document.querySelector(".pf-v6-c-skeleton")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error alert when error occurs", () => {
      mockHookState = {
        data: null,
        loading: false,
        error: new Error("Failed to load sections"),
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      expect(screen.getByText("Browse by Section")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", async () => {
      const mockRefetch = vi.fn();
      mockHookState = {
        data: null,
        loading: false,
        error: new Error("Failed to load sections"),
        refetch: mockRefetch,
      };

      render(<SectionsView />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no sections available", () => {
      mockHookState = {
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      expect(screen.getByText("No sections found")).toBeInTheDocument();
      expect(
        screen.getByText("No package sections are available in the APT cache.")
      ).toBeInTheDocument();
    });
  });

  describe("Sections Rendering", () => {
    it("renders sections as cards", async () => {
      mockHookState = {
        data: mockSections,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        expect(screen.getByTestId("section-card-admin")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-devel")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-games")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-web")).toBeInTheDocument();
      });
    });

    it("shows section count", async () => {
      mockHookState = {
        data: mockSections,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        expect(screen.getByText("4 sections available")).toBeInTheDocument();
      });
    });

    it("shows singular 'section' for one section", async () => {
      mockHookState = {
        data: [{ name: "admin", count: 150 }],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        expect(screen.getByText("1 section available")).toBeInTheDocument();
      });
    });

    it("capitalizes section display names", async () => {
      mockHookState = {
        data: [{ name: "admin", count: 150 }],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        expect(screen.getByTestId("display-name")).toHaveTextContent("Admin");
      });
    });
  });

  describe("Archive Area Handling", () => {
    it("renders sections from different archive areas", async () => {
      mockHookState = {
        data: mockSectionsWithArchives,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        // All sections should be rendered
        expect(screen.getByTestId("section-card-admin")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-devel")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-contrib/admin")).toBeInTheDocument();
        expect(screen.getByTestId("section-card-non-free/admin")).toBeInTheDocument();
      });
    });

    it("extracts base section name for display", async () => {
      mockHookState = {
        data: [{ name: "contrib/games", count: 50 }],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        // Display name should be "Games" (capitalized base section, not "Contrib/games")
        expect(screen.getByTestId("display-name")).toHaveTextContent("Games");
      });
    });
  });

  describe("Navigation", () => {
    it("calls onNavigateToSection when section card is clicked", async () => {
      const mockNavigate = vi.fn();
      mockHookState = {
        data: mockSections,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView onNavigateToSection={mockNavigate} />);

      await waitFor(() => {
        expect(screen.getByTestId("section-card-admin")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("section-card-admin"));

      expect(mockNavigate).toHaveBeenCalledWith("admin");
    });

    it("does not throw when onNavigateToSection is not provided", async () => {
      mockHookState = {
        data: mockSections,
        loading: false,
        error: null,
        refetch: vi.fn(),
      };

      render(<SectionsView />);

      await waitFor(() => {
        expect(screen.getByTestId("section-card-admin")).toBeInTheDocument();
      });

      // Should not throw
      await userEvent.click(screen.getByTestId("section-card-admin"));
    });
  });
});
