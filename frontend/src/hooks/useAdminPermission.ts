/**
 * useAdminPermission
 *
 * Reactive accessor for Cockpit's administrative-access state. Returns whether
 * the current Cockpit session is elevated (`allowed`) so admin-only UI actions
 * can be disabled with a clear tooltip when the user is in Limited Access mode.
 *
 * `allowed` is `null` until Cockpit has resolved the permission state. Callers
 * should treat `null` as "not yet allowed" (i.e. keep actions disabled) to
 * avoid races during the brief resolution window.
 *
 * Test / non-Cockpit fallback: when `typeof cockpit === 'undefined'` or
 * `cockpit.permission` is absent (e.g. jsdom test runs without an explicit
 * mock), the hook resolves to `allowed: true` so the admin-allowed UI path is
 * exercised by default.
 */

import { useEffect, useState } from "react";

export interface AdminPermission {
  allowed: boolean | null;
}

export function useAdminPermission(): AdminPermission {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof cockpit === "undefined" || !cockpit.permission) {
      setAllowed(true);
      return;
    }

    const permission = cockpit.permission({ admin: true });
    const update = () => setAllowed(permission.allowed);
    update();
    permission.addEventListener("changed", update);

    return () => {
      permission.removeEventListener("changed", update);
      permission.close();
    };
  }, []);

  return { allowed };
}
