"use client";

import * as React from "react";
import { Input } from "./input";
import { Label } from "./label";
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
  value?: string;
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

export function Combobox<T extends ComboboxOption>({
  id,
  label,
  placeholder = "Type to search...",
  options,
  value,
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
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const trimmedSearch = searchTerm.trim();

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasExactMatch = filteredOptions.some(
    (option) => option.name.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreate = allowCreate && !!trimmedSearch && !hasExactMatch;
  const totalRows = filteredOptions.length + (showCreate ? 1 : 0);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onOpenChange(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onOpenChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalRows === 0) {
      if (e.key === "ArrowDown" && !isOpen) {
        onOpenChange(true);
        setSelectedIndex(totalRows > 0 ? 0 : -1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalRows - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : totalRows - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[selectedIndex]);
        } else if (showCreate && selectedIndex === filteredOptions.length) {
          handleCreate();
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle option selection
  const handleSelect = (option: T) => {
    onSelect(option);
    onOpenChange(false);
    setSelectedIndex(-1);
  };

  const handleCreate = () => {
    if (onCreate && trimmedSearch) {
      onCreate(trimmedSearch);
      onOpenChange(false);
      setSelectedIndex(-1);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSearchChange(newValue);
    onOpenChange(true);
    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    onOpenChange(true);
  };

  return (
    <div className={cn("space-y-sm", className)}>
      {label && (
        <Label htmlFor={id} className="text-text-secondary font-medium">
          {label}
        </Label>
      )}
      <div className="relative" ref={dropdownRef}>
        <Input
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("w-full", inputClassName)}
        />
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-sm max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface shadow-overlay">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "w-full cursor-pointer border-b border-border-subtle px-md py-sm text-left text-sm text-text-primary transition-colors last:border-b-0",
                    index === selectedIndex
                      ? "bg-action-primary/10"
                      : "hover:bg-bg-hover",
                  )}
                >
                  <div className="font-medium">{option.name}</div>
                </button>
              ))
            ) : (
              <div className="px-md py-sm text-sm text-text-secondary">
                {emptyMessage}
              </div>
            )}
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className={cn(
                  "w-full cursor-pointer border-t border-border-subtle px-md py-sm text-left text-sm text-text-primary transition-colors",
                  selectedIndex === filteredOptions.length
                    ? "bg-action-primary/10"
                    : "hover:bg-bg-hover",
                )}
              >
                <div className="font-medium">{createLabel ? createLabel(trimmedSearch) : `Create product: ${trimmedSearch}`}</div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}