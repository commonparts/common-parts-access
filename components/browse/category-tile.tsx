import Link from 'next/link'

import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatters'

interface CategoryTileProps {
  name: string
  href: string
  /** Subtree-aggregated counts, displayed as-is — including zeros. */
  partsCount: number
  productCount: number
  /** One-line microcopy under the counts, e.g. example leaf names. */
  hint?: string | null
  className?: string
}

/**
 * Navigation tile for one category of the drill-down (hub roots and
 * subcategory grids, issue #276). Availability is the emphasis system: a
 * non-zero parts count is the only highlighted element on the tile, and
 * zero-count tiles stay visible but muted — never hidden (P-3, status
 * honesty).
 */
export function CategoryTile({
  name,
  href,
  partsCount,
  productCount,
  hint,
  className,
}: CategoryTileProps) {
  const hasParts = partsCount > 0

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-xs rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',
        className,
      )}
    >
      <span
        className={cn(
          'truncate font-heading text-sm font-semibold',
          hasParts ? 'text-text-primary' : 'text-text-secondary',
        )}
      >
        {name}
      </span>
      <span className="text-caption text-text-secondary">
        <span className={cn(hasParts && 'font-semibold text-text-primary')}>
          {pluralize(partsCount, 'part')}
        </span>
        {' · '}
        {pluralize(productCount, 'product')}
      </span>
      {hint && <span className="truncate text-caption text-text-secondary">{hint}</span>}
    </Link>
  )
}
