/**
 * Tests for the useAdminPermission hook. Mirrors the pilot in
 * cockpit-container-apps: covers fallback when Cockpit is absent, mirrors
 * cockpit.permission state, reacts to `changed` events, and cleans up on
 * unmount. Also verifies that remounts get an independent permission handle
 * (guards against the "shared singleton listener" failure mode).
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminPermission } from "../useAdminPermission";
import { cockpitMock, installFakePermission, makeFakePermission } from "../../test/setup";

type CockpitGlobal = typeof globalThis & { cockpit?: typeof cockpit };

describe("useAdminPermission", () => {
  let originalCockpit: typeof cockpit | undefined;

  beforeEach(() => {
    originalCockpit = (globalThis as CockpitGlobal).cockpit;
    delete cockpitMock.permission;
  });

  afterEach(() => {
    if (originalCockpit === undefined) {
      delete (globalThis as CockpitGlobal).cockpit;
    } else {
      (globalThis as CockpitGlobal).cockpit = originalCockpit;
    }
    delete cockpitMock.permission;
  });

  it("returns allowed=true when running outside Cockpit (no global cockpit)", () => {
    delete (globalThis as CockpitGlobal).cockpit;
    const { result } = renderHook(() => useAdminPermission());
    expect(result.current.allowed).toBe(true);
  });

  it("returns allowed=true when cockpit lacks permission()", () => {
    const { result } = renderHook(() => useAdminPermission());
    expect(result.current.allowed).toBe(true);
  });

  it("mirrors the initial allowed value reported by cockpit.permission()", () => {
    installFakePermission(false);
    const { result } = renderHook(() => useAdminPermission());
    expect(cockpitMock.permission).toHaveBeenCalledWith({ admin: true });
    expect(result.current.allowed).toBe(false);
  });

  it("re-renders with the new value when permission fires changed", () => {
    const { emitChanged } = installFakePermission(false);
    const { result } = renderHook(() => useAdminPermission());
    expect(result.current.allowed).toBe(false);

    act(() => {
      emitChanged(true);
    });
    expect(result.current.allowed).toBe(true);

    act(() => {
      emitChanged(null);
    });
    expect(result.current.allowed).toBeNull();
  });

  it("removes the listener and closes the permission on unmount", () => {
    const { permission } = installFakePermission(true);

    const { unmount } = renderHook(() => useAdminPermission());
    expect(permission.addEventListener).toHaveBeenCalledWith("changed", expect.any(Function));

    unmount();

    expect(permission.removeEventListener).toHaveBeenCalledWith("changed", expect.any(Function));
    expect(permission.close).toHaveBeenCalledTimes(1);
  });

  it("second mount gets an independent handle and reacts on its own", () => {
    const handles: ReturnType<typeof makeFakePermission>[] = [];
    cockpitMock.permission = vi.fn(() => {
      const handle = makeFakePermission(false);
      handles.push(handle);
      return handle.permission;
    });

    const first = renderHook(() => useAdminPermission());
    expect(first.result.current.allowed).toBe(false);
    first.unmount();
    expect(handles[0].permission.close).toHaveBeenCalled();

    const second = renderHook(() => useAdminPermission());
    expect(second.result.current.allowed).toBe(false);
    expect(cockpitMock.permission).toHaveBeenCalledTimes(2);

    act(() => {
      handles[1].emitChanged(true);
    });
    expect(second.result.current.allowed).toBe(true);
  });
});
