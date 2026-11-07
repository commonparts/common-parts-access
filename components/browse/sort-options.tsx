'use client'

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SOCIAL_FEATURES_ENABLED } from "@/lib/utils/feature-flags"

/** The sorts of /api/parts; each has a label and a description in the `SortOptions` messages. */
type SortKey = "newest" | "likes" | "views"

interface SortOptionsProps {
  value: string
  onChange: (sortBy: string) => void
  className?: string
}

const allSortKeys: SortKey[] = ['newest', 'likes', 'views']

/** "Most liked" is a social feature (issue #322) and is hidden along with likes. */
const sortKeys: SortKey[] = SOCIAL_FEATURES_ENABLED
  ? allSortKeys
  : allSortKeys.filter((key) => key !== 'likes')

const DEFAULT_SORT_KEY: SortKey = 'newest'

/**
 * Resolves the sortBy URL param to an offered sort, so a stale link to a
 * hidden sort (e.g. ?sortBy=likes) falls back to the default instead of
 * sorting by something the controls cannot show.
 */
export function resolveSortKey(raw: string | null): SortKey {
  return sortKeys.find((key) => key === raw) ?? DEFAULT_SORT_KEY
}

export function SortOptions({ value, onChange, className }: SortOptionsProps) {
  const t = useTranslations("SortOptions")
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <span className="text-sm font-medium text-text-secondary self-center mr-2">
        {t("label")}
      </span>
      {sortKeys.map((key) => (
        <Button
          key={key}
          variant={value === key ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(key)}
          className={cn(
            "text-sm transition-colors",
            value === key 
              ? "border border-border-default"
              : "hover:bg-bg-hover"
          )}
        >
          {t(`${key}.label`)}
        </Button>
      ))}
    </div>
  )
}

export function SortOptionsDropdown({ value, onChange, className }: SortOptionsProps) {
  const t = useTranslations("SortOptions")
  const [isOpen, setIsOpen] = React.useState(false)
  const currentKey = resolveSortKey(value)

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span className="text-sm">{t("current", { sort: t(`${currentKey}.label`) })}</span>
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
              {sortKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    onChange(key)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full px-md py-sm text-left text-sm text-text-primary transition-colors hover:bg-bg-hover",
                    value === key && "bg-bg-subtle"
                  )}
                >
                  <div className="font-medium">{t(`${key}.label`)}</div>
                  <div className="text-xs text-text-secondary">{t(`${key}.description`)}</div>
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
