import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type BaseProps = {
  isOpen?: boolean;
  as?: "input" | "select";
};

type InputProps = BaseProps & React.ComponentPropsWithoutRef<"input"> & { as?: "input" };
type SelectProps = BaseProps & React.ComponentPropsWithoutRef<"select"> & { as: "select" };

type DropdownInputProps = InputProps | SelectProps;

const DropdownInput = React.forwardRef<HTMLElement, DropdownInputProps>(
  ({ className, isOpen = false, disabled, as = "input", ...props }, ref) => {
    return (
      <div className="relative w-full min-w-0">
        {as === "select" ? (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            className={cn(
              "flex w-full min-w-0 appearance-none rounded-lg border border-border-subtle bg-bg-surface px-md py-2xs text-sm text-text-primary shadow-none transition-colors placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface focus-visible:border-border-focus disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:border-border-subtle disabled:text-text-disabled pr-10 cursor-pointer",
              disabled && "cursor-not-allowed",
              className,
            )}
            disabled={disabled}
            {...(props as SelectProps)}
          />
        ) : (
          <Input
            ref={ref as React.Ref<HTMLInputElement>}
            className={cn(
              "pr-10 cursor-pointer",
              disabled && "cursor-not-allowed",
              className,
            )}
            disabled={disabled}
            {...(props as InputProps)}
          />
        )}

        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary transition-transform",
            isOpen && "rotate-180",
            disabled && "text-text-disabled",
          )}
        />
      </div>
    );
  },
);
DropdownInput.displayName = "DropdownInput";

export { DropdownInput };
