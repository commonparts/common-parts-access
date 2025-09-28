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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="pl-10 pr-12"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-10 flex items-center pr-3"
            >
              <svg className="h-4 w-4 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button type="submit" size="sm" className="rounded-l-none">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Search Suggestions/Results Dropdown */}
      {isExpanded && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="text-sm text-muted-foreground mb-2">Suggestions</div>
            <div className="space-y-2">
              <button 
                className="flex items-center w-full p-2 text-sm hover:bg-accent rounded text-left"
                onClick={() => setQuery("car parts")}
              >
                <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                car parts
              </button>
              <button 
                className="flex items-center w-full p-2 text-sm hover:bg-accent rounded text-left"
                onClick={() => setQuery("mechanical components")}
              >
                <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                mechanical components
              </button>
            </div>
          </div>

          {showFilters && (
            <>
              <div className="border-t px-3 py-2">
                <div className="text-sm text-muted-foreground mb-2">Quick Filters</div>
                <div className="flex flex-wrap gap-2">
                  <button className="px-2 py-1 text-xs bg-accent rounded hover:bg-accent/80">
                    Automotive
                  </button>
                  <button className="px-2 py-1 text-xs bg-accent rounded hover:bg-accent/80">
                    Mechanical
                  </button>
                  <button className="px-2 py-1 text-xs bg-accent rounded hover:bg-accent/80">
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