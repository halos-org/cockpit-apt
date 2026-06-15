import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../relativeTime";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();

describe("formatRelativeTime", () => {
  it("returns 'just now' for times under a minute", () => {
    const iso = new Date(NOW - 30 * 1000).toISOString();
    expect(formatRelativeTime(iso, NOW)).toBe("just now");
  });

  it("formats minutes", () => {
    const iso = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, NOW)).toBe("5 minutes ago");
  });

  it("uses singular for one minute", () => {
    const iso = new Date(NOW - 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, NOW)).toBe("1 minute ago");
  });

  it("formats hours", () => {
    const iso = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, NOW)).toBe("3 hours ago");
  });

  it("formats days", () => {
    const iso = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, NOW)).toBe("2 days ago");
  });

  it("returns null for an unparseable timestamp", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBeNull();
  });
});
