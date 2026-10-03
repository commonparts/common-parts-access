import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge styling is a two-axis system:
 * - `variant` sets the treatment (how much surface the badge occupies)
 * - `tone` sets the colour family (what the badge means)
 *
 * The two axes are combined in `compoundVariants` because a treatment only
 * resolves to concrete tokens once its tone is known — a soft success badge
 * and a soft danger badge share geometry but nothing else.
 */
const badgeVariants = cva(
  "inline-flex max-w-full items-center whitespace-nowrap border align-middle font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  {
    variants: {
      /** Surface treatment — colours are resolved per tone below. */
      variant: {
        solid: "",
        soft: "",
        outline: "",
        ghost: "",
      },
      /** Colour family — carries the meaning of the badge. */
      tone: {
        neutral: "",
        accent: "",
        success: "",
        warning: "",
        danger: "",
      },
      size: {
        sm: "gap-3xs px-2xs py-3xs text-micro [&_svg]:size-3",
        md: "gap-2xs px-xs py-3xs text-caption [&_svg]:size-3.5",
      },
      shape: {
        pill: "rounded-pill",
        rounded: "rounded-md",
      },
      /**
       * Adds affordances for badges used as links, filters or toggles.
       * `select-none` belongs here and not in the base: a static badge holds
       * text worth copying (a licence name, a tag), a clickable one does not.
       */
      interactive: {
        true: "cursor-pointer select-none hover:opacity-80 active:opacity-70",
        false: "",
      },
    },
    compoundVariants: [
      /* ── Neutral ── */
      {
        variant: "solid",
        tone: "neutral",
        className: "border-transparent bg-text-primary text-text-inverse",
      },
      {
        variant: "soft",
        tone: "neutral",
        className: "border-transparent bg-bg-subtle text-text-primary",
      },
      {
        variant: "outline",
        tone: "neutral",
        className: "border-border-default bg-transparent text-text-primary",
      },
      {
        variant: "ghost",
        tone: "neutral",
        className: "border-transparent bg-transparent text-text-secondary",
      },

      /* ── Accent (institutional green) ── */
      {
        variant: "solid",
        tone: "accent",
        className: "border-transparent bg-action-primary text-text-inverse",
      },
      {
        variant: "soft",
        tone: "accent",
        // text-link rather than action-primary: it is the only green that
        // stays legible on bg-accent in both the light and dark themes.
        className: "border-transparent bg-bg-accent text-text-link",
      },
      {
        variant: "outline",
        tone: "accent",
        className: "border-action-primary bg-transparent text-text-link",
      },
      {
        variant: "ghost",
        tone: "accent",
        className: "border-transparent bg-transparent text-text-link",
      },

      /* ── Success ── */
      {
        variant: "solid",
        tone: "success",
        className: "border-transparent bg-status-successText text-text-inverse",
      },
      {
        variant: "soft",
        tone: "success",
        className: "border-transparent bg-status-success text-status-successText",
      },
      {
        variant: "outline",
        tone: "success",
        className: "border-status-successText bg-transparent text-status-successText",
      },
      {
        variant: "ghost",
        tone: "success",
        className: "border-transparent bg-transparent text-status-successText",
      },

      /* ── Warning ── */
      {
        variant: "solid",
        tone: "warning",
        className: "border-transparent bg-status-warningText text-text-inverse",
      },
      {
        variant: "soft",
        tone: "warning",
        className: "border-transparent bg-status-warning text-status-warningText",
      },
      {
        variant: "outline",
        tone: "warning",
        className: "border-status-warningBorder bg-transparent text-status-warningText",
      },
      {
        variant: "ghost",
        tone: "warning",
        className: "border-transparent bg-transparent text-status-warningText",
      },

      /* ── Danger ── */
      {
        variant: "solid",
        tone: "danger",
        className: "border-transparent bg-status-errorText text-text-inverse",
      },
      {
        variant: "soft",
        tone: "danger",
        className: "border-transparent bg-status-error text-status-errorText",
      },
      {
        variant: "outline",
        tone: "danger",
        className: "border-status-errorBorder bg-transparent text-status-errorText",
      },
      {
        variant: "ghost",
        tone: "danger",
        className: "border-transparent bg-transparent text-status-errorText",
      },
    ],
    defaultVariants: {
      variant: "soft",
      tone: "neutral",
      size: "sm",
      shape: "pill",
      interactive: false,
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders the badge styles onto the single child element (a link, a button). */
  asChild?: boolean;
  /** Leading dot, tinted with the badge's own colour — for statuses. */
  dot?: boolean;
}

/**
 * Compact label for statuses, counts, licences and metadata.
 *
 * Pick the variant by weight (`solid` for the one thing that must be noticed,
 * `soft` for the default label, `outline` for neutral metadata, `ghost` for
 * near-invisible annotations) and the tone by meaning.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      tone,
      size,
      shape,
      interactive,
      asChild = false,
      dot = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "span";
    return (
      <Comp
        ref={ref}
        className={cn(
          badgeVariants({ variant, tone, size, shape, interactive }),
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 rounded-full bg-current",
              size === "md" ? "size-1.5" : "size-1",
            )}
          />
        )}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
