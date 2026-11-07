import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const t = useTranslations("Breadcrumbs")
  return (
    <nav aria-label={t("label")} className={cn("flex", className)}>
      {/* Wraps whole crumbs onto a new line on narrow screens instead of
          squeezing each label into a column (4-level part trails, #257). */}
      <ol className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="mx-sm shrink-0 size-sm text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-caption font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-caption font-medium text-text-primary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
