"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

import { Command, CommandItem, CommandList } from "./command";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id: string;
  name: string;
}

interface ComboboxProps<T extends ComboboxOption> {
  id?: string;
  label?: string;
  placeholder?: string;
  options: T[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: T) => void;
  allowCreate?: boolean;
  onCreate?: (value: string) => void;
  createLabel?: (value: string) => string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  disabled?: boolean;
  inputClassName?: string;
  emptyMessage?: string;
}

const ROW_CLASS =
  "rounded-none border-border-subtle px-md py-2xs font-medium transition-colors";
// cmdk identifies rows by value; options use their id, which is never this.
const CREATE_VALUE = "create-option";

/**
 * Text field that filters `options` as the user types and offers the matches
 * in a list below it, plus an optional row creating the typed value.
 * cmdk provides the keyboard navigation and the combobox ARIA roles; the
 * Popover places the list. Filtering stays a substring match on the name.
 */
export function Combobox<T extends ComboboxOption>({
  id,
  label,
  placeholder = "Type to search...",
  options,
  searchTerm,
  onSearchChange,
  onSelect,
  allowCreate = false,
  onCreate,
  createLabel,
  isOpen,
  onOpenChange,
  className,
  disabled = false,
  emptyMessage = "No options found",
  inputClassName,
}: ComboboxProps<T>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const trimmedSearch = searchTerm.trim();
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const hasExactMatch = filteredOptions.some(
    (option) => option.name.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreate = allowCreate && !!trimmedSearch && !hasExactMatch;

  const close = () => onOpenChange(false);

  return (
    <div className={cn("w-full min-w-0 space-y-sm", className)}>
      {label && (
        <Label htmlFor={id} className="text-text-secondary font-medium">
          {label}
        </Label>
      )}
      <Command
        shouldFilter={false}
        vimBindings={false}
        className="overflow-visible rounded-none"
      >
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <CommandPrimitive.Input
              asChild
              value={searchTerm}
              onValueChange={(value) => {
                onSearchChange(value);
                onOpenChange(true);
              }}
            >
              {/* cmdk finds its input by the id it generates; `id` replaces that
                  id, so the marker that makes cmdk refocus it on each highlight
                  change is dropped, and the field is named by its own label. */}
              <Input
                ref={inputRef}
                id={id}
                cmdk-input={undefined}
                aria-labelledby={undefined}
                aria-expanded={isOpen}
                type="text"
                placeholder={placeholder}
                disabled={disabled}
                onFocus={() => onOpenChange(true)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && !isOpen) onOpenChange(true);
                  // Home and End move the caret in the text, not the highlight.
                  if (e.key === "Home" || e.key === "End") e.stopPropagation();
                }}
                className={cn("w-full py-2xs", inputClassName)}
              />
            </CommandPrimitive.Input>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            sideOffset={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            // The input anchors the list: clicking it must not close the list.
            onInteractOutside={(e) => {
              if (inputRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
            className="w-(--radix-popover-trigger-width) overflow-hidden p-0 shadow-none"
          >
            <CommandList className="max-h-64">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onSelect(option);
                      close();
                    }}
                    className={cn(ROW_CLASS, "border-b last:border-b-0")}
                  >
                    {option.name}
                  </CommandItem>
                ))
              ) : (
                <div className="px-md py-2xs text-sm text-text-secondary">{emptyMessage}</div>
              )}
              {showCreate && (
                <CommandItem
                  value={CREATE_VALUE}
                  onSelect={() => {
                    onCreate?.(trimmedSearch);
                    close();
                  }}
                  className={cn(ROW_CLASS, "border-t")}
                >
                  {createLabel ? createLabel(trimmedSearch) : `Create product: ${trimmedSearch}`}
                </CommandItem>
              )}
            </CommandList>
          </PopoverContent>
        </Popover>
      </Command>
    </div>
  );
}
