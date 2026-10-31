import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Inline error banner for a failed action or a blocking condition
 * (a failed load, a rejected save, a duplicate source).
 *
 * Styled with the status error tokens so it reads as an error in both themes.
 * `role="alert"` makes assistive technologies announce the message when it
 * appears, since these banners are rendered in response to a user action.
 */
const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-lg border border-status-errorBorder bg-status-error p-sm text-sm text-status-errorText",
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export { Alert };
