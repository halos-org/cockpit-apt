/**
 * Tests for apt.tsx routing functions
 *
 * Validates that parseRoute correctly handles:
 * - Section names with slashes (e.g., "contrib/comm")
 * - URL encoding/decoding of section names
 * - Standard routing paths
 */

import { describe, expect, it } from "vitest";
import { parseRoute } from "../apt";

describe("parseRoute", () => {
  describe("sections routing", () => {
    it("should parse sections list route", () => {
      const result = parseRoute(["apt", "sections"]);
      expect(result).toEqual({
        view: "sections",
        params: {},
      });
    });

    it("should parse section with simple name", () => {
      const result = parseRoute(["apt", "sections", "admin"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "admin" },
      });
    });

    it("should parse section with URL-encoded slash", () => {
      // When clicking "contrib/comm", it gets encoded as "contrib%2Fcomm"
      const result = parseRoute(["apt", "sections", "contrib%2Fcomm"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "contrib/comm" },
      });
    });

    it("should parse section with URL-encoded slash (non-free)", () => {
      const result = parseRoute(["apt", "sections", "non-free%2Fadmin"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "non-free/admin" },
      });
    });

    it("should parse section with URL-encoded slash (non-free-firmware)", () => {
      const result = parseRoute(["apt", "sections", "non-free-firmware%2Fkernel"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "non-free-firmware/kernel" },
      });
    });
  });

  describe("other routes", () => {
    it("should parse search route", () => {
      const result = parseRoute(["apt", "search"]);
      expect(result).toEqual({
        view: "search",
        params: {},
      });
    });

    it("should default to search for empty path", () => {
      const result = parseRoute(["apt"]);
      expect(result).toEqual({
        view: "search",
        params: {},
      });
    });

    it("should parse package details route", () => {
      const result = parseRoute(["apt", "package", "nginx"]);
      expect(result).toEqual({
        view: "package-details",
        params: { name: "nginx" },
      });
    });

    it("should parse installed route", () => {
      const result = parseRoute(["apt", "installed"]);
      expect(result).toEqual({
        view: "installed",
        params: {},
      });
    });

    it("should parse updates route", () => {
      const result = parseRoute(["apt", "updates"]);
      expect(result).toEqual({
        view: "updates",
        params: {},
      });
    });
  });

  describe("path handling", () => {
    it("should handle paths without 'apt' prefix", () => {
      const result = parseRoute(["sections", "admin"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "admin" },
      });
    });

    it("should handle paths without 'apt' prefix with encoded slashes", () => {
      const result = parseRoute(["sections", "contrib%2Fcomm"]);
      expect(result).toEqual({
        view: "section-packages",
        params: { section: "contrib/comm" },
      });
    });
  });
});
