'use client'

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { pluralize } from "@/lib/utils/formatters"
import { categoryCanonicalPath } from "@/lib/utils/seo"
import {
  COLLAPSED_COMPATIBLE_PRODUCTS_COUNT,
  filterCompatibleProducts,
  groupProductsByBrand,
  isActiveFilterQuery,
  limitProductGroups,
} from "@/lib/utils/compatible-products"
import type { PrintReportStats } from "@/lib/utils/print-reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EvidenceLevelBadge } from "./evidence-level-badge"
import { PrintReportControls, type PrintReportReference } from "./print-report-controls"

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"

export interface CompatibleProduct {
  id: string
  name: string
  slug: string
  brand?: {
    name: string
    slug: string
    verified: boolean
  } | null
  /** The product's category, shown beside it rather than as a property of the part (#372). */
  category?: {
    name: string
    slug: string
  } | null
  /** Print report counters and the evidence level they derive (issues #317, #318). */
  reportStats: PrintReportStats
  /** The product's references, offered as optional detail on a print report and searched by the filter. */
  references: PrintReportReference[]
}

interface CompatibleProductsProps {
  partId: string
  products: CompatibleProduct[]
  /** Print reports are only offered on a published part, not on a draft preview. */
  canReport: boolean
  onReportStatsChange: (productId: string, stats: PrintReportStats) => void
  className?: string
}

/**
 * The "Compatible with" section of a part page (issue #355). It sits full
 * width so a long list never stretches the cards beside it. Products are
 * grouped by brand in a multi-column grid of compact rows; past
 * COLLAPSED_COMPATIBLE_PRODUCTS_COUNT the list is collapsed behind a
 * "Show all" control and a filter field helps a visitor find their device.
 */
export function CompatibleProducts({
  partId,
  products,
  canReport,
  onReportStatsChange,
  className,
}: CompatibleProductsProps) {
  const [query, setQuery] = React.useState("")
  const [showAll, setShowAll] = React.useState(false)
  const filterId = React.useId()
  const listId = React.useId()

  const collapsible = products.length > COLLAPSED_COMPATIBLE_PRODUCTS_COUNT
  const filtering = isActiveFilterQuery(query)

  const matches = React.useMemo(() => filterCompatibleProducts(products, query), [products, query])
  const groups = React.useMemo(() => {
    const grouped = groupProductsByBrand(matches)
    // A filtered list is already short and the visitor is looking for one
    // product, so the collapsed view never hides a match.
    return collapsible && !showAll && !filtering
      ? limitProductGroups(grouped, COLLAPSED_COMPATIBLE_PRODUCTS_COUNT)
      : grouped
  }, [matches, collapsible, showAll, filtering])

  return (
    <Card className={cn("border-border-subtle", className)}>
      <CardHeader className="pb-xs">
        {/* A heading, so the brand groups (h3) below sit in a correct outline */}
        <CardTitle role="heading" aria-level={2} className="text-lg flex flex-wrap items-center gap-x-2xs gap-y-3xs">
          <svg className="size-md text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Compatible with
          <span className="text-sm font-regular text-text-secondary">{pluralize(products.length, "product")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        {collapsible && (
          <div className="max-w-md space-y-2xs">
            <Label htmlFor={filterId}>Find your product</Label>
            <Input
              id={filterId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Product, brand or reference"
              aria-controls={listId}
              autoComplete="off"
            />
            <p role="status" className="text-caption text-text-secondary">
              {filtering ? `${matches.length} of ${pluralize(products.length, "product")}` : ""}
            </p>
          </div>
        )}

        <div id={listId} className="space-y-md">
          {groups.map((group) => (
            <section key={group.brand?.slug ?? ""} className="space-y-xs">
              <h3 className="flex flex-wrap items-center gap-2xs text-sm font-semibold text-text-primary">
                {group.brand ? (
                  <>
                    <Link href={`/brands/${group.brand.slug}`} className={cn("hover:underline", FOCUS_RING)}>
                      {group.brand.name}
                    </Link>
                    {group.brand.verified && <Badge variant="soft">✓ Verified</Badge>}
                  </>
                ) : (
                  "Other products"
                )}
              </h3>
              <ul className="grid grid-cols-1 gap-xs sm:grid-cols-2 xl:grid-cols-3">
                {group.products.map((product) => (
                  <CompatibleProductRow
                    key={product.id}
                    partId={partId}
                    product={product}
                    canReport={canReport}
                    onReportStatsChange={onReportStatsChange}
                  />
                ))}
              </ul>
            </section>
          ))}

          {filtering && matches.length === 0 && (
            <p className="text-sm text-text-secondary">
              No compatible product matches “{query.trim()}”.
            </p>
          )}
        </div>

        {collapsible && !filtering && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showAll}
            aria-controls={listId}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Show fewer products" : `Show all ${products.length} products`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface CompatibleProductRowProps {
  partId: string
  product: CompatibleProduct
  canReport: boolean
  onReportStatsChange: (productId: string, stats: PrintReportStats) => void
}

/**
 * One compatible product: its name, linked to its product page, its evidence
 * level, its category and, on a published part, a "Report a print" toggle. The print report
 * controls mount on first open and stay mounted while hidden, so closing the
 * row does not lose the result the visitor just filed.
 */
const CompatibleProductRow = React.memo(function CompatibleProductRow({
  partId,
  product,
  canReport,
  onReportStatsChange,
}: CompatibleProductRowProps) {
  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportMounted, setReportMounted] = React.useState(false)
  const controlsId = React.useId()

  const handleStatsChange = React.useCallback(
    (stats: PrintReportStats) => onReportStatsChange(product.id, stats),
    [onReportStatsChange, product.id],
  )

  const toggleReport = () => {
    setReportMounted(true)
    setReportOpen((open) => !open)
  }

  return (
    <li className="min-w-0 space-y-2xs rounded-lg border border-border-subtle bg-bg-surface px-sm py-xs">
      <div className="flex flex-wrap items-center gap-x-xs gap-y-2xs">
        <Link
          href={`/product/${product.slug}`}
          className={cn("min-w-0 flex-1 break-words text-sm font-medium text-text-primary hover:underline", FOCUS_RING)}
        >
          {product.name}
        </Link>
        <EvidenceLevelBadge level={product.reportStats.evidenceLevel} className="shrink-0" />
      </div>

      {(product.category || canReport) && (
        <div className="flex flex-wrap items-center gap-x-xs gap-y-3xs">
          {product.category && (
            <Link
              href={categoryCanonicalPath(product.category.slug)}
              className={cn("min-w-0 text-caption text-text-secondary hover:underline", FOCUS_RING)}
            >
              {product.category.name}
            </Link>
          )}
          {canReport && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className={cn("px-0 py-0", product.category && "ml-auto")}
              aria-expanded={reportOpen}
              aria-controls={controlsId}
              onClick={toggleReport}
            >
              {reportOpen ? "Hide print report" : "Report a print"}
              <span className="sr-only"> on {product.name}</span>
            </Button>
          )}
        </div>
      )}

      {/* The wrapper is always present so the toggle's aria-controls resolves
          before the first open; the controls themselves mount on demand. */}
      {canReport && (
        <div id={controlsId} hidden={!reportOpen}>
          {reportMounted && (
            <PrintReportControls
              partId={partId}
              productId={product.id}
              productName={product.name}
              stats={product.reportStats}
              references={product.references}
              onStatsChange={handleStatsChange}
            />
          )}
        </div>
      )}
    </li>
  )
})
