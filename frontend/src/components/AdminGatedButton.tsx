import { Button, Tooltip } from "@patternfly/react-core";
import type { ReactNode } from "react";

export const ADMIN_REQUIRED_TOOLTIP = "Administrative access required";

export interface AdminGatedButtonProps {
  variant?: "primary" | "secondary" | "danger" | "link";
  size?: "sm" | "default";
  onClick?: () => void;
  isAdminRequired: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  type?: "button" | "submit";
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Button wrapper that uses PatternFly's `isAriaDisabled` (which suppresses
 * onClick via preventDefault) when admin is required but not granted, and
 * wraps the disabled button in a tooltip explaining why.
 */
export function AdminGatedButton({
  variant = "primary",
  size,
  onClick,
  isAdminRequired,
  isDisabled,
  isLoading,
  type,
  icon,
  children,
}: AdminGatedButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={size === "sm" ? "sm" : undefined}
      onClick={onClick}
      isAriaDisabled={isAdminRequired || isDisabled}
      isLoading={isLoading}
      type={type}
      icon={icon}
    >
      {children}
    </Button>
  );

  if (isAdminRequired) {
    return <Tooltip content={ADMIN_REQUIRED_TOOLTIP}>{button}</Tooltip>;
  }

  return button;
}
