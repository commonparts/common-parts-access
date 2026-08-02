import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrintTime } from "@/lib/utils/formatters"
import type { ModelCardData, ModelCardProductFit } from "@/types/models"

interface ModelCardProps {
  model: ModelCardData
  className?: string
  variant?: "default" | "compact" | "detailed"
  // Optional overlay on the thumbnail (e.g. compatibility badge on a product
  // page). Rendered top-left so it never collides with the Premium badge.
  badge?: React.ReactNode
  // Render the part-meta row (material · print time) + license badge. Used
  // where the compatibility line is redundant, such as a product page.
  showPartMeta?: boolean
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"

// tailwind-merge does not know this project's typography scale, so it reads a
// size token (text-micro) and a color token (text-text-secondary) as the same
// utility and drops the first. Classes that pair the two are concatenated
// rather than passed through cn().
const BRAND_LINE_CLASS =
  "block truncate text-micro font-medium uppercase tracking-caps text-text-secondary transition-colors hover:text-text-primary " +
  FOCUS_RING

/**
 * Brand attribution above the part name. The brand — not the contributor who
 * uploaded the file — is what identifies a spare part, so it leads the card.
 */
function BrandLine({ brand }: { brand: NonNullable<ModelCardData["brand"]> }) {
  return (
    <Link href={`/brands/${brand.slug}`} className={BRAND_LINE_CLASS}>
      {brand.name}
    </Link>
  )
}

/**
 * "Fits <product>, <product> +N more" — the products the part is mounted on.
 * Names link to their product page when the source exposes a slug; search
 * results carry the name only, so those render as plain text.
 */
function ProductFitLine({
  products,
  total,
}: {
  products: ModelCardProductFit[]
  total: number
}) {
  const overflow = Math.max(0, total - products.length)

  return (
    <p className="line-clamp-2 text-caption text-text-secondary">
      <span className="text-text-tertiary">Fits </span>
      {products.map((product, index) => (
        <React.Fragment key={product.slug ?? `${product.name}-${index}`}>
          {index > 0 && ", "}
          {product.slug ? (
            <Link
              href={`/product/${product.slug}`}
              className={cn("text-text-primary hover:underline", FOCUS_RING)}
            >
              {product.name}
            </Link>
          ) : (
            <span className="text-text-primary">{product.name}</span>
          )}
        </React.Fragment>
      ))}
      {overflow > 0 && <span className="text-text-tertiary"> +{overflow} more</span>}
    </p>
  )
}

export function ModelCard({
  model,
  className,
  variant = "default",
  badge,
  showPartMeta = false,
}: ModelCardProps) {
  const partHref = `/parts/${model.slug}`
  const printTime = formatPrintTime(model.estimatedPrintTime)
  const isCompact = variant === "compact"

  return (
    <Card
      className={cn(
        "group transition-colors duration-200 hover:border-border-default",
        className,
      )}
    >
      <Link href={partHref} className={cn("block", FOCUS_RING)}>
        <div
          className={cn(
            "relative overflow-hidden rounded-t-lg",
            isCompact ? "aspect-square" : "aspect-video",
          )}
        >
          {model.thumbnailUrl ? (
            <Image
              src={model.thumbnailUrl}
              alt={model.title}
              fill
              sizes={
                isCompact
                  ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
              }
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <svg
                aria-hidden="true"
                className={cn("text-text-secondary", isCompact ? "h-12 w-12" : "h-16 w-16")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
          {model.isPremium && (
            <Badge className="absolute right-2 top-2 bg-yellow-500">Premium</Badge>
          )}
          {badge && <div className="absolute left-sm top-sm z-10">{badge}</div>}
          <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
        </div>
      </Link>

      {/* Padded directly rather than through CardContent: that primitive hard-sets
          `pt-0` for footer-style stacking, which no className can override here. */}
      <div className={cn("space-y-2xs", isCompact ? "p-md" : "p-lg")}>
        {model.brand && <BrandLine brand={model.brand} />}

        <Link href={partHref} className={cn("block", FOCUS_RING)}>
          {/* Colour is inherited from the Card (text-text-primary) — setting it
              here would make cn() drop the size token. */}
          <h3
            className={cn(
              "line-clamp-2 min-h-[2lh] font-heading font-semibold transition-colors hover:text-primary",
              isCompact ? "text-body" : "text-subtitle",
            )}
          >
            {model.title}
          </h3>
        </Link>

        {model.description && variant === "detailed" && (
          <p className="line-clamp-2 text-body text-text-secondary">{model.description}</p>
        )}

        {model.products.length > 0 && (
          <ProductFitLine products={model.products} total={model.productCount} />
        )}

        {/* Part metadata (material, print time) + license badge */}
        {showPartMeta && (
          <div className="space-y-xs pt-2xs">
            {(model.material || printTime) && (
              <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-text-secondary">
                {model.material && <span>{model.material}</span>}
                {printTime && <span>{printTime}</span>}
              </div>
            )}
            {model.license && <Badge variant="outline">{model.license}</Badge>}
          </div>
        )}
      </div>
    </Card>
  )
}
