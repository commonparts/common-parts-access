import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { HowToCheckReference } from "@/components/product/how-to-check-reference"
import { ProductPartsGrid } from "@/components/product/product-parts-grid"
import { DemandBadge, RequestedPartsList } from "@/components/product/requested-parts-demand"
import { RequestPartForm } from "@/components/part-requests/request-part-form"
import {
  fetchProductNameBySlug,
  fetchProductPageBySlug,
  fetchProductPageParts,
} from "@/lib/supabase/queries/product-page"
import { fetchPartRequestCounts } from "@/lib/supabase/queries/part-requests"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const name = await fetchProductNameBySlug(slug)
  return { title: name ?? "Product" }
}

// "Since 2015" / "2015 · Discontinued" / "Discontinued" — omitted when unknown.
function formatProductionYears(releaseYear: number | null, discontinued: boolean): string | null {
  if (!releaseYear) return discontinued ? "Discontinued" : null
  return discontinued ? `${releaseYear} · Discontinued` : `Since ${releaseYear}`
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await fetchProductPageBySlug(slug)
  if (!data) notFound()

  const { product, family, siblings } = data

  const parts = await fetchProductPageParts({
    productId: product.id,
    parentId: product.parent_id,
    productKind: product.product_kind,
  })

  // Request counts are only rendered in the empty state — skip the RPC entirely
  // when the product already has parts.
  const requestCounts = parts.length === 0 ? await fetchPartRequestCounts(product.id) : []

  const referenceLabel = product.model_number ?? product.name
  const fitsLabel = family?.name ?? product.name
  const productionYears = formatProductionYears(product.release_year, product.discontinued)

  const breadcrumbItems = [
    product.brand && { label: product.brand.name, href: `/brand/${product.brand.slug}` },
    product.category && {
      label: product.category.name,
      href: `/browse?category=${product.category.slug}`,
    },
    { label: product.name },
  ].filter((item): item is { label: string; href?: string } => Boolean(item))

  return (
    <Section>
      <Container size="lg" className="space-y-xl">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Identification header */}
        <div className="grid gap-lg md:grid-cols-[minmax(0,16rem)_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-bg-subtle">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-disabled">
                <svg className="size-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
          </div>

          <div className="space-y-md">
            <div className="space-y-xs">
              {product.category && (
                <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
                  {product.category.name}
                </p>
              )}
              <h1 className="font-heading text-heading-lg font-semibold text-text-primary">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-md text-body text-text-secondary">
                {product.model_number && (
                  <span className="font-mono text-sm text-text-primary">{product.model_number}</span>
                )}
                {productionYears && <span>{productionYears}</span>}
              </div>
            </div>

            {siblings.length > 0 && (
              <div className="space-y-xs">
                <p className="text-caption font-medium text-text-secondary">
                  {product.product_kind === "family" ? "References in this family" : "Other references"}
                </p>
                <div className="flex flex-wrap gap-sm">
                  {siblings.map((sibling) => (
                    <Link
                      key={sibling.id}
                      href={`/product/${sibling.slug}`}
                      className="rounded-full border border-border-subtle bg-bg-surface px-md py-xs font-mono text-caption text-text-primary transition-colors hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                    >
                      {sibling.model_number ?? sibling.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <HowToCheckReference />
          </div>
        </div>

        {parts.length > 0 ? (
          <>
            <ProductPartsGrid parts={parts} referenceLabel={referenceLabel} fitsLabel={fitsLabel} />

            {/* Request capture — always available below the grid */}
            <div className="space-y-sm rounded-lg border border-border-subtle bg-bg-subtle p-lg">
              <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
                Missing a part for this product?
              </h2>
              <p className="text-body text-text-secondary">
                Tell us what you need — requests with the most demand get sourced first.
              </p>
              <RequestPartForm productId={product.id} submitLabel="Request a part" />
            </div>
          </>
        ) : (
          <EmptyState productId={product.id} counts={requestCounts} />
        )}
      </Container>
    </Section>
  )
}

function EmptyState({
  productId,
  counts,
}: {
  productId: string
  counts: Awaited<ReturnType<typeof fetchPartRequestCounts>>
}) {
  return (
    <div className="space-y-lg">
      <div className="space-y-sm">
        <div className="flex flex-wrap items-center gap-md">
          <h2 className="font-heading text-heading-md font-semibold text-text-primary">
            No parts here yet
          </h2>
          <DemandBadge counts={counts} />
        </div>
        <p className="max-w-container-md text-body text-text-secondary">
          This product is indexed and ready — the catalog grows with demand. Request the part you
          need, or contribute a model if you have one.
        </p>
      </div>

      <div className="max-w-container-md">
        <RequestPartForm productId={productId} submitLabel="Request a part" />
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <Button asChild variant="outline">
          <Link href={`/upload?product=${productId}`}>Contribute a model</Link>
        </Button>
      </div>

      <RequestedPartsList counts={counts} />
    </div>
  )
}
