import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-sm rounded-sm border px-sm py-xs text-xs font-semibold text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface [&_svg]:stroke-[1.5] [&_svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-action-primary/10 text-action-primary hover:bg-action-primary/15",
        secondary:
          "border-border-subtle bg-bg-subtle text-text-primary hover:bg-bg-hover",
        outline:
          "border-border-default bg-transparent text-text-primary hover:bg-bg-hover",
        ghost: "border-transparent bg-transparent text-text-secondary hover:bg-bg-hover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
