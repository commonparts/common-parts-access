"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { pluralize } from "@/lib/utils/formatters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SEARCH_MIN_QUERY_LENGTH, useSearchAutocomplete } from "@/hooks/use-search-autocomplete"
import type {
  SearchBrandResult,
  SearchModelResult,
  SearchProductResult,
} from "@/types/search"

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  showFilters?: boolean
  value?: string
  /** Uncontrolled initial query (e.g. pre-filling the input on /search). */
  defaultValue?: string
  onChange?: (query: string) => void
  onClear?: () => void
  /**
   * Grouped autocomplete against /api/search (default). Set to false for a
   * plain filter input that keeps the legacy suggestion dropdown — used by
   * /browse, whose behavior must stay unchanged.
   */
  autocomplete?: boolean
}

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

// Square thumbnail with a neutral placeholder when no image is available.
function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="size-xl shrink-0 rounded object-cover" />
  }
  return (
    <div className="flex size-xl shrink-0 items-center justify-center rounded bg-bg-subtle text-text-disabled">
      <SearchIcon className="size-sm" />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-md pb-xs pt-sm text-caption font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </div>
  )
}

// Shared row wrapper: consistent height, hover/active states, keyboard focus.
function Row({
  id,
  isActive,
  onSelect,
  onHover,
  children,
}: {
  id: string
  isActive: boolean
  onSelect: () => void
  onHover: () => void
  children: React.ReactNode
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={isActive}
      // aria-activedescendant combobox: DOM focus stays on the input, so
      // options must not be tab stops and hover only marks the active option.
      tabIndex={-1}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-sm px-md py-sm text-left transition-colors",
        isActive ? "bg-bg-hover" : "hover:bg-bg-hover",
      )}
    >
      {children}
    </button>
  )
}

export function SearchBar({
  placeholder = "Search models...",
  className,
  onSearch,
  showFilters = false,
  value,
  onChange,
  onClear,
  defaultValue,
  autocomplete = true,
}: SearchBarProps) {
  const router = useRouter()
  const [internalQuery, setInternalQuery] = React.useState(value ?? defaultValue ?? "")
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalQuery(value)
    }
  }, [value])

  const currentQuery = value ?? internalQuery
  const trimmedQuery = currentQuery.trim()

  const { results, isLoading, error } = useSearchAutocomplete(currentQuery, autocomplete && isExpanded)

  // Flat list of navigation targets in render order (products, parts, brands),
  // with the "see all results" footer as the final entry — drives arrow keys.
  const searchHref = `/search?q=${encodeURIComponent(trimmedQuery)}`
  const navTargets = React.useMemo(() => {
    const targets = [
      ...results.products.map((p) => `/product/${p.slug}`),
      ...results.models.map((m) => `/model/${m.slug}`),
      ...results.brands.map((b) => `/brand/${b.slug}`),
      searchHref,
    ]
    return targets
  }, [results, searchHref])

  const productOffset = 0
  const modelOffset = results.products.length
  const brandOffset = modelOffset + results.models.length
  const footerIndex = navTargets.length - 1

  // Unique per instance (there can be two SearchBars on a page) so listbox and
  // option ids don't collide; drives aria-controls / aria-activedescendant.
  const listboxId = React.useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const hasResults =
    results.products.length > 0 || results.models.length > 0 || results.brands.length > 0
  const showDropdown =
    autocomplete && isExpanded && trimmedQuery.length >= SEARCH_MIN_QUERY_LENGTH

  const updateQuery = (nextValue: string) => {
    if (onChange) {
      onChange(nextValue)
    } else {
      setInternalQuery(nextValue)
    }
    setActiveIndex(-1)
  }

  const clearQuery = () => {
    if (onClear) {
      onClear()
    } else {
      updateQuery("")
    }
    setActiveIndex(-1)
  }

  const close = () => {
    setIsExpanded(false)
    setActiveIndex(-1)
  }

  const goToSearch = () => {
    if (!trimmedQuery) return
    close()
    router.push(searchHref)
  }

  const navigateTo = (href: string) => {
    close()
    router.push(href)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmedQuery) return

    if (autocomplete) {
      goToSearch()
      return
    }
    // Legacy filter mode (e.g. /browse).
    if (onSearch) {
      onSearch(trimmedQuery)
    } else {
      router.push(`/browse?search=${encodeURIComponent(trimmedQuery)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Combobox convention: first Escape dismisses the popup but keeps the
      // query; only clear once the popup is already closed (or in legacy mode).
      if (autocomplete && isExpanded) {
        close()
      } else {
        clearQuery()
        close()
      }
      return
    }

    if (!autocomplete) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!isExpanded) {
        setIsExpanded(true)
        return
      }
      setActiveIndex((prev) => (prev < navTargets.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : navTargets.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < navTargets.length) {
        navigateTo(navTargets[activeIndex])
      } else {
        goToSearch()
      }
    }
  }

  // Close when focus or a click leaves the whole search area — covers both an
  // outside mouse click and tabbing away (focus moving out without a click).
  React.useEffect(() => {
    if (!isExpanded) return
    const isOutside = (target: EventTarget | null) =>
      !!containerRef.current && !containerRef.current.contains(target as Node)
    const handleClickOutside = (event: MouseEvent) => {
      if (isOutside(event.target)) close()
    }
    const handleFocusOutside = (event: FocusEvent) => {
      if (isOutside(event.target)) close()
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("focusin", handleFocusOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("focusin", handleFocusOutside)
    }
  }, [isExpanded])

  const renderProductRow = (product: SearchProductResult, index: number) => (
    <Row
      key={product.id}
      id={optionId(productOffset + index)}
      isActive={activeIndex === productOffset + index}
      onSelect={() => navigateTo(`/product/${product.slug}`)}
      onHover={() => setActiveIndex(productOffset + index)}
    >
      <Thumbnail src={product.image_url} alt={product.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{product.name}</div>
        <div className="truncate text-caption text-text-secondary">
          {product.category ? `${product.category} · ` : ""}
          {pluralize(product.parts_count, "part")}
        </div>
      </div>
    </Row>
  )

  const renderModelRow = (model: SearchModelResult, index: number) => (
    <Row
      key={model.id}
      id={optionId(modelOffset + index)}
      isActive={activeIndex === modelOffset + index}
      onSelect={() => navigateTo(`/model/${model.slug}`)}
      onHover={() => setActiveIndex(modelOffset + index)}
    >
      <Thumbnail src={model.thumbnail_url} alt={model.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{model.name}</div>
        <div className="truncate text-caption text-text-secondary">
          {model.product_name ?? "Generic part"}
          {model.author_username ? ` · @${model.author_username}` : ""}
        </div>
      </div>
      {model.license && (
        <Badge variant="secondary" className="shrink-0">
          {model.license}
        </Badge>
      )}
    </Row>
  )

  const renderBrandRow = (brand: SearchBrandResult, index: number) => (
    <Row
      key={brand.id}
      id={optionId(brandOffset + index)}
      isActive={activeIndex === brandOffset + index}
      onSelect={() => navigateTo(`/brand/${brand.slug}`)}
      onHover={() => setActiveIndex(brandOffset + index)}
    >
      <Avatar className="size-xl">
        <AvatarFallback className="bg-bg-subtle text-sm font-semibold text-text-secondary">
          {brand.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{brand.name}</div>
        <div className="truncate text-caption text-text-secondary">
          {pluralize(brand.product_count, "product")}
        </div>
      </div>
    </Row>
  )

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-sm pointer-events-none">
            <SearchIcon className="size-md text-text-secondary" />
          </div>
          <Input
            type="search"
            role={autocomplete ? "combobox" : undefined}
            aria-expanded={autocomplete ? showDropdown : undefined}
            aria-haspopup={autocomplete ? "listbox" : undefined}
            aria-controls={showDropdown ? listboxId : undefined}
            aria-activedescendant={
              // Only reference an option that is actually rendered: not while
              // loading (options are replaced by the spinner) and within range.
              showDropdown && !isLoading && activeIndex >= 0 && activeIndex < navTargets.length
                ? optionId(activeIndex)
                : undefined
            }
            aria-autocomplete={autocomplete ? "list" : undefined}
            placeholder={placeholder}
            value={currentQuery}
            onChange={(e) => updateQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            className="pl-xl pr-2xl"
          />
          {currentQuery && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
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

      {/* Grouped autocomplete dropdown (absolute — never shifts page layout). */}
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-xs max-h-96 overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface shadow-overlay"
        >
          {isLoading ? (
            <div className="flex items-center gap-sm px-md py-md text-sm text-text-secondary">
              <svg className="size-sm animate-spin text-text-secondary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Searching…
            </div>
          ) : error ? (
            <div className="px-md py-md text-sm text-text-secondary">
              Something went wrong. <span className="text-text-primary">Try again.</span>
            </div>
          ) : hasResults ? (
            <>
              {results.products.length > 0 && (
                <div>
                  <SectionLabel>Products</SectionLabel>
                  {results.products.map(renderProductRow)}
                </div>
              )}
              {results.models.length > 0 && (
                <div>
                  <SectionLabel>Parts</SectionLabel>
                  {results.models.map(renderModelRow)}
                </div>
              )}
              {results.brands.length > 0 && (
                <div>
                  <SectionLabel>Brands</SectionLabel>
                  {results.brands.map(renderBrandRow)}
                </div>
              )}
            </>
          ) : (
            <div className="px-md py-md text-sm text-text-secondary">
              No results for &ldquo;{trimmedQuery}&rdquo;.
            </div>
          )}

          {/* Footer: always available to reach the full results page. */}
          {!isLoading && (
            <button
              type="button"
              role="option"
              id={optionId(footerIndex)}
              aria-selected={activeIndex === footerIndex}
              tabIndex={-1}
              onClick={goToSearch}
              onMouseEnter={() => setActiveIndex(footerIndex)}
              className={cn(
                "flex w-full items-center gap-sm border-t border-border-subtle px-md py-sm text-left text-sm font-medium transition-colors",
                activeIndex === footerIndex ? "bg-bg-hover" : "hover:bg-bg-hover",
              )}
            >
              <SearchIcon className="size-sm text-text-secondary" />
              <span className="truncate text-text-primary">
                See all results for &ldquo;{trimmedQuery}&rdquo;
              </span>
            </button>
          )}
        </div>
      )}

      {/* Legacy filter-mode dropdown (autocomplete disabled, e.g. /browse). */}
      {!autocomplete && isExpanded && currentQuery.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-xs rounded-lg border border-border-subtle bg-bg-surface shadow-none">
          <div className="p-sm">
            <div className="mb-xs text-caption text-text-secondary">Suggestions</div>
            <div className="space-y-xs">
              <button
                type="button"
                className="flex w-full items-center gap-sm rounded text-left px-md py-sm text-sm text-text-primary transition-colors hover:bg-bg-hover"
                onClick={() => {
                  updateQuery("car parts")
                  setIsExpanded(true)
                }}
              >
                <SearchIcon className="size-sm text-text-secondary" />
                car parts
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-sm rounded text-left px-md py-sm text-sm text-text-primary transition-colors hover:bg-bg-hover"
                onClick={() => {
                  updateQuery("mechanical components")
                  setIsExpanded(true)
                }}
              >
                <SearchIcon className="size-sm text-text-secondary" />
                mechanical components
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-border-subtle px-sm py-xs">
              <div className="mb-xs text-caption text-text-secondary">Quick Filters</div>
              <div className="flex flex-wrap gap-xs">
                <button className="rounded bg-bg-subtle px-md py-sm text-sm text-text-primary transition-colors hover:bg-bg-hover">
                  Automotive
                </button>
                <button className="rounded bg-bg-subtle px-md py-sm text-sm text-text-primary transition-colors hover:bg-bg-hover">
                  Mechanical
                </button>
                <button className="rounded bg-bg-subtle px-md py-sm text-sm text-text-primary transition-colors hover:bg-bg-hover">
                  Electronics
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
