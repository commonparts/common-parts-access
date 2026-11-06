import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'

import { cn } from '@/lib/utils'

interface CategoryTileProps {
  name: string
  href: string
  /** Subtree-aggregated counts; a tile listed through part requests alone reads zero. */
  partsCount: number
  productCount: number
  /** One-line microcopy under the counts, e.g. example leaf names. */
  hint?: string | null
  className?: string
}

/**
 * Navigation tile for one category of the drill-down (hub roots and
 * subcategory grids, issue #276). The parts count is the only highlighted
 * element on the tile. Only categories holding a listed product — a
 * published part or an open part request — are surfaced (issues #312, #321).
 */
export function CategoryTile({
  name,
  href,
  partsCount,
  productCount,
  hint,
  className,
}: CategoryTileProps) {
  const counts = useTranslations('Counts')
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-xs rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface transition-colors hover:border-border-default focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',
        className,
      )}
    >
      <span className="truncate font-heading text-sm font-semibold text-text-primary">
        {name}
      </span>
      <span className="text-caption text-text-secondary">
        <span className="font-semibold text-text-primary">
          {counts('parts', { count: partsCount })}
        </span>
        {' · '}
        {counts('products', { count: productCount })}
      </span>
      {hint && <span className="truncate text-caption text-text-secondary">{hint}</span>}
    </Link>
  )
}
