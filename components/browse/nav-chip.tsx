import Link from 'next/link'

import { cn } from '@/lib/utils'

interface NavChipProps {
  href: string
  label: string
  /** Secondary text after the label, e.g. a parts count. */
  caption?: string
  className?: string
}

/**
 * Compact pill link shared by navigation pages (brand page → its categories,
 * category page → its covering brands): label plus an optional caption.
 */
export function NavChip({ href, label, caption, className }: NavChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-baseline gap-xs rounded-lg border border-border-subtle bg-bg-surface px-md py-xs text-body text-text-primary transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',
        className,
      )}
    >
      <span className="font-medium">{label}</span>
      {caption && <span className="text-caption text-text-secondary">{caption}</span>}
    </Link>
  )
}
