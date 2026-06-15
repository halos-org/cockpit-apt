/**
 * Format an ISO 8601 timestamp as a coarse "X ago" string.
 *
 * Returns null when the input cannot be parsed.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return null;
  }

  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) {
    return "just now";
  }

  const units: [string, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) {
      return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}
