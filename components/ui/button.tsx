import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-sm whitespace-nowrap rounded-lg border border-transparent text-md font-regular transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:pointer-events-none disabled:bg-action-disabled disabled:text-text-disabled disabled:border-border-subtle shadow-none [&_svg]:pointer-events-none [&_svg]:size-md [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-action-primary text-text-inverse hover:bg-action-primaryHover active:bg-action-primaryActive",
        secondary:
          "bg-bg-subtle text-text-primary border-border-subtle hover:bg-bg-hover",
        outline:
          "border-border-default bg-transparent text-text-primary hover:bg-bg-hover",
        ghost: "text-text-primary hover:bg-bg-hover",
        link: "text-text-link hover:text-text-link",
      },
      size: {
        default: "px-sm py-xs",
        sm: "px-sm py-xs text-sm",
        lg: "px-lg py-md text-base",
        icon: "size-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
