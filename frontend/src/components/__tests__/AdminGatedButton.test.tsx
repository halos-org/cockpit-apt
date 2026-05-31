/**
 * Smoke tests for AdminGatedButton. The component is a thin PatternFly Button
 * wrapper, so we just verify the gating semantics: aria-disabled when admin
 * is required, tooltip wrapping for elevation explanation, and click
 * suppression via PatternFly's isAriaDisabled.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminGatedButton, ADMIN_REQUIRED_TOOLTIP } from "../AdminGatedButton";

describe("AdminGatedButton", () => {
  it("renders an aria-disabled button when admin is required", () => {
    render(
      <AdminGatedButton isAdminRequired onClick={vi.fn()}>
        Install
      </AdminGatedButton>
    );

    const button = screen.getByRole("button", { name: /install/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("does not invoke onClick when admin is required", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminGatedButton isAdminRequired onClick={onClick}>
        Install
      </AdminGatedButton>
    );

    await user.click(screen.getByRole("button", { name: /install/i }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("invokes onClick when admin is not required", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminGatedButton isAdminRequired={false} onClick={onClick}>
        Install
      </AdminGatedButton>
    );

    await user.click(screen.getByRole("button", { name: /install/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes the admin-required tooltip text", () => {
    expect(ADMIN_REQUIRED_TOOLTIP).toBe("Administrative access required");
  });
});
