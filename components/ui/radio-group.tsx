"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, disabled, children, ...props }, ref) => {
    const generatedName = React.useId();
    return (
      <RadioGroupContext.Provider
        value={{ value, onValueChange, name: name ?? generatedName, disabled }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("flex flex-col gap-2xs", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, disabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    if (!context) throw new Error("RadioGroupItem must be used within RadioGroup");

    const isChecked = context.value === value;
    const isDisabled = disabled ?? context.disabled;

    return (
      <>
        <input
          ref={ref}
          type="radio"
          name={context.name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={() => context.onValueChange(value)}
          className="sr-only peer"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "size-sm shrink-0 rounded-full border border-border-subtle bg-bg-surface shadow-none transition-colors",
            "flex items-center justify-center",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-surface",
            "peer-disabled:cursor-not-allowed peer-disabled:bg-bg-disabled peer-disabled:border-border-subtle",
            isChecked && "border-action-primary bg-action-primary",
            className,
          )}
        >
          {isChecked && <span className="size-2xs block rounded-full bg-bg-surface" />}
        </span>
      </>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
