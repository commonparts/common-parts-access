"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type BaseProps = {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  as?: "input" | "select";
};

type InputProps = BaseProps & React.ComponentPropsWithoutRef<"input"> & { as?: "input" };
type SelectProps = BaseProps & React.ComponentPropsWithoutRef<"select"> & { as: "select" };

type DropdownInputProps = InputProps | SelectProps;

const DropdownInput = React.forwardRef<HTMLElement, DropdownInputProps>((
  allProps,
  ref,
) => {
    const {
      className,
      isOpen = false,
      onOpenChange,
      disabled,
      as = "input",
      ...props
    } = allProps;
    const [openState, setOpenState] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const menuId = React.useId();

    const hasOpenProp = "isOpen" in allProps;
    const isControlled = as === "select" && hasOpenProp;
    const menuOpen = as === "select" ? (isControlled ? isOpen : openState) : isOpen;

    const handleOpenChange = (open: boolean) => {
      if (as !== "select") {
        return;
      }

      if (!isControlled) {
        setOpenState(open);
      }
      onOpenChange?.(open);
      if (!open) {
        setHighlightedIndex(-1);
      }
    };

    const handleClickOutside = React.useCallback(
      (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          handleOpenChange(false);
        }
      },
      [handleOpenChange],
    );

    React.useEffect(() => {
      if (!menuOpen) {
        return;
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [menuOpen, handleClickOutside]);

    return (
      <div className="relative" ref={dropdownRef}>
        {as === "select" ? (
          <DropdownSelect
            ref={ref}
            className={className}
            disabled={disabled}
            isOpen={menuOpen}
            highlightedIndex={highlightedIndex}
            menuId={menuId}
            onHighlightedIndexChange={setHighlightedIndex}
            onOpenChange={handleOpenChange}
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
            menuOpen && "rotate-180",
            disabled && "text-text-disabled",
          )}
        />
      </div>
    );
  },
);
DropdownInput.displayName = "DropdownInput";

export { DropdownInput };

type DropdownSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownSelectProps = SelectProps & {
  highlightedIndex: number;
  menuId: string;
  onHighlightedIndexChange: (index: number) => void;
};

const DropdownSelect = React.forwardRef<HTMLElement, DropdownSelectProps>(
  (
    {
      className,
      disabled,
      highlightedIndex,
      menuId,
      onHighlightedIndexChange,
      onOpenChange,
      isOpen,
      value,
      defaultValue,
      onChange,
      children,
      id,
      required,
      name,
      ...rest
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(() =>
      defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : "",
    );

    const isControlled = value !== undefined;
    const selectedValue = isControlled ? String(value ?? "") : internalValue;

    const options = React.useMemo<DropdownSelectOption[]>(() => {
      return React.Children.toArray(children)
        .filter(React.isValidElement)
        .filter((child) => child.type === "option")
        .map((child) => {
          const option = child as React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>;
          return {
            value: option.props.value !== undefined ? String(option.props.value) : "",
            label: typeof option.props.children === "string" ? option.props.children : "",
            disabled: option.props.disabled,
          };
        });
    }, [children]);

    const placeholderOption = options.find((option) => option.value === "");
    const selectedOption = options.find((option) => option.value === selectedValue);
    const hasSelection = selectedValue !== "";
    const displayValue = hasSelection ? selectedOption?.label ?? "" : "";
    const placeholderLabel = placeholderOption?.label ?? "Select an option";

    const handleSelect = (nextValue: string, optionIndex: number) => {
      if (disabled) {
        return;
      }

      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onChange?.(
        {
          target: { value: nextValue } as HTMLSelectElement,
          currentTarget: { value: nextValue } as HTMLSelectElement,
        } as React.ChangeEvent<HTMLSelectElement>,
      );

      onOpenChange?.(false);
      onHighlightedIndexChange(optionIndex);
    };

    const handleToggle = () => {
      if (disabled) {
        return;
      }

      const nextOpen = !isOpen;
      onOpenChange?.(nextOpen);
      if (nextOpen && selectedOption) {
        const index = options.findIndex((option) => option.value === selectedOption.value);
        onHighlightedIndexChange(index);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }

      if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onOpenChange?.(true);
        onHighlightedIndexChange(Math.max(0, options.findIndex((option) => option.value === selectedValue)));
        return;
      }

      if (!isOpen || options.length === 0) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          onHighlightedIndexChange(
            highlightedIndex < options.length - 1 ? highlightedIndex + 1 : 0,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          onHighlightedIndexChange(
            highlightedIndex > 0 ? highlightedIndex - 1 : options.length - 1,
          );
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            const option = options[highlightedIndex];
            if (!option.disabled) {
              handleSelect(option.value, highlightedIndex);
            }
          }
          break;
        case "Escape":
          event.preventDefault();
          onOpenChange?.(false);
          onHighlightedIndexChange(-1);
          break;
      }
    };

    return (
      <div>
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          id={id}
          type="text"
          readOnly
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-haspopup="listbox"
          placeholder={placeholderLabel}
          value={displayValue}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          className={cn("pr-10 cursor-pointer", disabled && "cursor-not-allowed", className)}
          {...rest}
        />
        {name && (
          <input
            type="hidden"
            name={name}
            value={selectedValue}
            disabled={disabled}
          />
        )}

        {isOpen && (
          <div
            id={menuId}
            role="listbox"
            className="absolute top-full left-0 right-0 z-50 mt-sm max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface shadow-none"
          >
            {options.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={selectedValue === option.value}
                disabled={option.disabled}
                onClick={() => handleSelect(option.value, index)}
                className={cn(
                  "w-full cursor-pointer border-b border-border-subtle px-md py-sm text-left text-sm text-text-primary transition-colors last:border-b-0",
                  option.disabled && "cursor-not-allowed text-text-disabled",
                  highlightedIndex === index
                    ? "bg-action-primary/10"
                    : "hover:bg-bg-hover",
                )}
              >
                <div className="font-medium">{option.label || " "}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
DropdownSelect.displayName = "DropdownSelect";
