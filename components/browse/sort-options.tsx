'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type SortOption = {
  key: string
  label: string
  description?: string
}

interface SortOptionsProps {
  value: string
  onChange: (sortBy: string) => void
  className?: string
}

const sortOptions: SortOption[] = [
  {
    key: 'popularity',
    label: 'Most popular',
    description: 'Most downloaded models'
  },
  {
    key: 'newest',
    label: 'Newest first',
    description: 'Recently uploaded'
  },
  {
    key: 'likes',
    label: 'Most liked',
    description: 'Community favorites'
  },
  {
    key: 'views',
    label: 'Most viewed',
    description: 'Trending models'
  }
]

export function SortOptions({ value, onChange, className }: SortOptionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground self-center mr-2">
        Sort by:
      </span>
      {sortOptions.map((option) => (
        <Button
          key={option.key}
          variant={value === option.key ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.key)}
          className={cn(
            "text-sm transition-colors",
            value === option.key 
              ? "border border-border-default"
              : "hover:bg-bg-hover"
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export function SortOptionsDropdown({ value, onChange, className }: SortOptionsProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const currentOption = sortOptions.find(option => option.key === value) || sortOptions[0]

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span className="text-sm">Sort: {currentOption.label}</span>
        <svg 
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          <div className="absolute top-full left-0 mt-1 bg-bg-surface border border-border-subtle rounded-lg shadow-none z-50 min-w-56">
            <div className="py-xs">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    onChange(option.key)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full px-md py-sm text-left text-sm text-text-primary transition-colors hover:bg-bg-hover",
                    value === option.key && "bg-bg-subtle"
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-text-secondary">{option.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  )
}
