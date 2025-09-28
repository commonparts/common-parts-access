import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:stroke-[1.5] [&_svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:bg-primary/95",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-sm shadow-secondary/10 hover:shadow-md hover:bg-secondary/95",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:shadow-md hover:bg-destructive/95",
        outline: "text-foreground border-foreground/20 hover:border-foreground/40",
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
