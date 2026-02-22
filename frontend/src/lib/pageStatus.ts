/**
 * Cockpit nav bar page status notification.
 *
 * Uses the Cockpit transport control message to show/hide an icon
 * next to the "Packages" entry in the sidebar when updates are available.
 */

import { filterPackages } from "../api";

export type PageStatusType = "info" | "warning" | "error";

export function setPageStatus(status: { type: PageStatusType; title: string } | null): void {
  cockpit.transport.control("notify", { page_status: status });
}

export function checkAndNotifyUpdates(): void {
  filterPackages({ tab: "upgradable", limit: 1 })
    .then((response) => {
      const count = response.total_count;
      if (count > 0) {
        setPageStatus({
          type: "info",
          title: `${count} update${count !== 1 ? "s" : ""} available`,
        });
      } else {
        setPageStatus(null);
      }
    })
    .catch((error: unknown) => {
      console.warn("checkAndNotifyUpdates failed:", error);
      setPageStatus(null);
    });
}
