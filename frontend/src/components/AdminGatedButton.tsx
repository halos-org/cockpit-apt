import { Button, Tooltip } from "@patternfly/react-core";
import type { ButtonProps } from "@patternfly/react-core";

export const ADMIN_REQUIRED_TOOLTIP = "Administrative access required";

export interface AdminGatedButtonProps extends ButtonProps {
  isAdminRequired: boolean;
}

/**
 * Button wrapper that uses PatternFly's `isAriaDisabled` (which suppresses
 * onClick via preventDefault) when admin is required but not granted, and
 * wraps the disabled button in a tooltip explaining why.
 *
 * All standard `Button` props are forwarded. When any disable reason is set
 * (`isAdminRequired`, `isAriaDisabled`, or `isDisabled`), the underlying
 * Button is rendered with `isAriaDisabled` so click suppression composes with
 * the admin tooltip.
 */
export function AdminGatedButton({
  isAdminRequired,
  isAriaDisabled,
  isDisabled,
  children,
  ...rest
}: AdminGatedButtonProps) {
  const button = (
    <Button {...rest} isAriaDisabled={isAdminRequired || isAriaDisabled || isDisabled}>
      {children}
    </Button>
  );

  if (isAdminRequired) {
    return <Tooltip content={ADMIN_REQUIRED_TOOLTIP}>{button}</Tooltip>;
  }

  return button;
}
