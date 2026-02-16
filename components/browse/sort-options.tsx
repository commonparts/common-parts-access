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
    label: 'Most Popular',
    description: 'Most downloaded models'
  },
  {
    key: 'newest',
    label: 'Newest First',
    description: 'Recently uploaded'
  },
  {
    key: 'likes',
    label: 'Most Liked',
    description: 'Community favorites'
  },
  {
    key: 'views',
    label: 'Most Viewed',
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
            "text-sm transition-all",
            value === option.key 
              ? "shadow-md" 
              : "hover:bg-accent/50"
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
          <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[200px]">
            <div className="py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    onChange(option.key)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                    value === option.key && "bg-accent"
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground">{option.description}</div>
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
