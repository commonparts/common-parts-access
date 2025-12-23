"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  showFilters?: boolean
}

export function SearchBar({ 
  placeholder = "Search 3D models...", 
  className,
  onSearch,
  showFilters = false 
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [isExpanded, setIsExpanded] = React.useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim())
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery("")
      setIsExpanded(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-sm pointer-events-none">
            <svg className="size-md text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            className="pl-xl pr-2xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-xl flex items-center pr-sm"
            >
              <svg className="size-sm text-text-secondary hover:text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button type="submit" className="h-full rounded-l-none">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Search Suggestions/Results Dropdown */}
      {isExpanded && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-xs rounded-lg border border-border-subtle bg-bg-surface shadow-overlay">
          <div className="p-sm">
            <div className="mb-xs text-caption text-text-secondary">Suggestions</div>
            <div className="space-y-xs">
              <button 
                className="flex w-full items-center gap-xs rounded text-left px-sm py-xs text-caption hover:bg-bg-hover"
                onClick={() => setQuery("car parts")}
              >
                <svg className="size-sm text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                car parts
              </button>
              <button 
                className="flex w-full items-center gap-xs rounded text-left px-sm py-xs text-caption hover:bg-bg-hover"
                onClick={() => setQuery("mechanical components")}
              >
                <svg className="size-sm text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                mechanical components
              </button>
            </div>
          </div>

          {showFilters && (
            <>
              <div className="border-t border-border-subtle px-sm py-xs">
                <div className="mb-xs text-caption text-text-secondary">Quick Filters</div>
                <div className="flex flex-wrap gap-xs">
                  <button className="rounded bg-bg-subtle px-sm py-xs text-caption hover:bg-bg-hover">
                    Automotive
                  </button>
                  <button className="rounded bg-bg-subtle px-sm py-xs text-caption hover:bg-bg-hover">
                    Mechanical
                  </button>
                  <button className="rounded bg-bg-subtle px-sm py-xs text-caption hover:bg-bg-hover">
                    Electronics
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  )
}