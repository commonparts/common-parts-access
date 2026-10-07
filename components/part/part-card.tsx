import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { formatPrintLine } from "@/lib/utils/formatters"
import { isGifUrl } from "@/lib/utils/images"
import { PartCardGifThumbnail } from "./part-card-gif-thumbnail"
import type { PartCardBrand, PartCardData, PartCardProductFit } from "@/types/parts"

interface PartCardProps {
  part: PartCardData
  className?: string
  /**
   * The context badge, the only badge a card carries (issue #380): rendered
   * on the right of the header row, never over the thumbnail. A product page
   * passes the evidence level of the part for that product; other contexts
   * pass nothing.
   */
  badge?: React.ReactNode
}

const THUMBNAIL_HOVER_CLASS = "transition-transform duration-200 group-hover:scale-105"

const THUMBNAIL_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"

// tailwind-merge does not know this project's typography scale, so it reads a
// size token (text-micro) and a color token (text-text-secondary) as the same
// utility and drops the first. Classes that pair the two are concatenated
// rather than passed through cn().
const BRAND_LINE_CLASS =
  "flex min-w-0 items-center gap-3xs overflow-hidden text-micro font-medium uppercase tracking-caps text-text-secondary"

// Secondary lines under the name. The fit line clamps to two lines; the print
// and provenance lines are one line each.
const FIT_LINE_CLASS = "line-clamp-2 text-caption text-text-secondary"
const PRINT_LINE_CLASS = "truncate text-caption text-text-secondary"

// `mt-auto` pins the line to the bottom of the card body, which stretches to
// the height of its grid row, so the provenance lines of a row align whatever
// the length of the names and fit lines above them.
const PROVENANCE_LINE_CLASS =
  "mt-auto flex min-w-0 items-center gap-3xs text-caption text-text-secondary"

// Truncation sits on each name, not on the row: the row is a flex container,
// where `truncate` would clip without ever showing an ellipsis.
const BRAND_NAME_CLASS =
  "truncate transition-colors hover:text-text-primary " + FOCUS_RING

/**
 * How many brands the eyebrow names before collapsing the rest into "+N".
 * Matches the product fit line below it, so the card header keeps the same
 * height whether a part fits one brand or six.
 */
const CARD_BRAND_PREVIEW_COUNT = 2

/**
 * Brand attribution above the part name. The brand — not the contributor who
 * uploaded the file — is what identifies a spare part, so it leads the card.
 *
 * A part is filed under every brand whose products it fits (issue #315): a
 * dishwasher wheel shared by Bosch, Siemens and Neff names all three, because
 * each is a place the visitor could have reached this card from.
 */
function BrandLine({ brands }: { brands: PartCardBrand[] }) {
  const shown = brands.slice(0, CARD_BRAND_PREVIEW_COUNT)
  const overflow = brands.length - shown.length

  return (
    <p className={BRAND_LINE_CLASS}>
      {shown.map((brand, index) => (
        <React.Fragment key={brand.slug}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <Link href={`/brands/${brand.slug}`} className={BRAND_NAME_CLASS}>
            {brand.name}
          </Link>
        </React.Fragment>
      ))}
      {overflow > 0 && (
        <span className="shrink-0 text-text-tertiary">
          +{overflow}
          <span className="sr-only"> more brands</span>
        </span>
      )}
    </p>
  )
}

/**
 * "Fits <product>, <product> +N more" — the products the part is mounted on,
 * each linking to its product page.
 */
function ProductFitLine({
  products,
  total,
}: {
  products: PartCardProductFit[]
  total: number
}) {
  const overflow = Math.max(0, total - products.length)

  return (
    <p className={FIT_LINE_CLASS}>
      Fits{" "}
      {products.map((product, index) => (
        <React.Fragment key={product.slug}>
          {index > 0 && ", "}
          <Link
            href={`/product/${product.slug}`}
            className={cn("text-text-primary hover:underline", FOCUS_RING)}
          >
            {product.name}
          </Link>
        </React.Fragment>
      ))}
      {overflow > 0 && <> +{overflow} more</>}
    </p>
  )
}

/**
 * Where the part comes from and under which licence: "{platform} · {licence}".
 * Plain text, not a link — the card leads to the part page, which carries the
 * link to the source. A part without a source platform shows its licence
 * alone, without the outbound icon. Platform logos are deliberately not shown:
 * a logo is a third-party trademark, displayed only with the platform's
 * consent.
 */
function ProvenanceLine({
  platformName,
  license,
}: {
  platformName: string | null
  license: string | null
}) {
  return (
    <p className={PROVENANCE_LINE_CLASS}>
      {platformName && (
        <>
          <ExternalLink aria-hidden="true" className="size-xs shrink-0" />
          <span className="truncate font-medium text-text-primary">
            <span className="sr-only">Source: </span>
            {platformName}
          </span>
        </>
      )}
      {platformName && license && <span aria-hidden="true">·</span>}
      {license && (
        <span className="shrink-0">
          <span className="sr-only">License: </span>
          {license}
        </span>
      )}
    </p>
  )
}

/**
 * The standard part card (issue #380), identical in every context: thumbnail,
 * header row (brand eyebrow, context badge), name, fit line, print line and
 * provenance line. Each line is omitted when it has nothing to show. Only the
 * `badge` changes with the context.
 */
export function PartCard({ part, className, badge }: PartCardProps) {
  const partHref = `/parts/${part.slug}`
  const printLine = formatPrintLine(part.material, part.estimatedPrintTime)
  const hasProvenance = Boolean(part.sourcePlatformName || part.license)
  const hasHeader = part.brands.length > 0 || Boolean(badge)

  return (
    <Card
      data-part-card=""
      className={cn(
        "group flex h-full flex-col transition-colors duration-200 hover:border-border-default",
        className,
      )}
    >
      <Link href={partHref} className={cn("block", FOCUS_RING)}>
        <div
          data-part-card-thumbnail=""
          className="relative aspect-video overflow-hidden rounded-t-lg"
        >
          {part.thumbnailUrl && isGifUrl(part.thumbnailUrl) ? (
            <PartCardGifThumbnail
              key={part.thumbnailUrl}
              src={part.thumbnailUrl}
              alt={part.title}
              sizes={THUMBNAIL_SIZES}
              className={THUMBNAIL_HOVER_CLASS}
            />
          ) : part.thumbnailUrl ? (
            <Image
              src={part.thumbnailUrl}
              alt={part.title}
              fill
              sizes={THUMBNAIL_SIZES}
              className={cn("object-cover", THUMBNAIL_HOVER_CLASS)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <svg
                aria-hidden="true"
                className="h-16 w-16 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Padded directly rather than through CardContent: that primitive hard-sets
          `pt-0` for footer-style stacking, which no className can override here.
          The body grows to the card's height so the provenance line can sit at
          its bottom. */}
      <div className="flex flex-1 flex-col gap-2xs p-md">
        {/* Header row and name are one unit, tighter than the gaps around them. */}
        <div className="space-y-3xs">
          {hasHeader && (
            <div className="flex items-center justify-between gap-xs">
              {part.brands.length > 0 && <BrandLine brands={part.brands} />}
              {badge && <div className="ml-auto shrink-0">{badge}</div>}
            </div>
          )}

          <Link href={partHref} className={cn("block", FOCUS_RING)}>
            {/* No reserved second line: a one-line name would otherwise leave an
                empty row above the fit line. Colour is inherited from the Card
                (text-text-primary) — setting it here would make cn() drop the
                size token. */}
            <h3 className="line-clamp-2 font-heading text-subtitle font-semibold leading-snug transition-colors hover:text-primary">
              {part.title}
            </h3>
          </Link>
        </div>

        {part.products.length > 0 && (
          <ProductFitLine products={part.products} total={part.productCount} />
        )}

        {printLine && <p className={PRINT_LINE_CLASS}>{printLine}</p>}

        {hasProvenance && (
          <ProvenanceLine platformName={part.sourcePlatformName} license={part.license} />
        )}
      </div>
    </Card>
  )
}
