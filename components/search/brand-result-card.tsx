import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { pluralize } from "@/lib/utils/formatters"
import type { SearchBrandResult } from "@/types/search"

// Brand card for the /search results page: initial avatar (or logo), name,
// product count. Links to the brand page.
export function BrandResultCard({ brand }: { brand: SearchBrandResult }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex items-center gap-md rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
    >
      <Avatar className="size-2xl">
        {brand.logo_url ? (
          <AvatarImage src={brand.logo_url} alt={brand.name} />
        ) : (
          <AvatarFallback className="bg-bg-subtle font-heading text-heading-sm font-semibold text-text-secondary">
            {brand.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-heading text-sm font-semibold text-text-primary">
          {brand.name}
        </div>
        <div className="truncate text-caption text-text-secondary">
          {pluralize(brand.product_count, "product")}
        </div>
      </div>
    </Link>
  )
}
