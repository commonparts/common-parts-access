import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type DropdownInputProps = React.ComponentPropsWithoutRef<"input"> & {
  isOpen?: boolean;
};

const DropdownInput = React.forwardRef<HTMLInputElement, DropdownInputProps>(
  ({ className, isOpen = false, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn(
            "pr-10 cursor-pointer",
            disabled && "cursor-not-allowed",
            className,
          )}
          disabled={disabled}
          {...props}
        />
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
