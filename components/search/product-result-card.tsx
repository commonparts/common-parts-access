import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { pluralize } from "@/lib/utils/formatters"

// Structural shape so any caller with a product row can render the card —
// SearchProductResult satisfies it, and the /brands pages map their rows to it.
export interface ProductCardData {
  name: string
  slug: string
  image_url: string | null
  category: string | null
  parts_count: number
}

// Horizontal product card: image, name, category, parts-count badge. Links to
// the product page. Used on /search results and the /brands navigation pages.
export function ProductResultCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex items-center gap-md rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="size-2xl shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex size-2xl shrink-0 items-center justify-center rounded bg-bg-subtle text-text-disabled">
          <svg className="size-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-heading text-sm font-semibold text-text-primary">
          {product.name}
        </div>
        {product.category && (
          <div className="truncate text-caption text-text-secondary">{product.category}</div>
        )}
      </div>
      <Badge variant="secondary" className="shrink-0">
        {pluralize(product.parts_count, "part")}
      </Badge>
    </Link>
  )
}
