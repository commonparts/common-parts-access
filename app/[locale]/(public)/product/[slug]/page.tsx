import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { PaginationLinks } from "@/components/browse/pagination-links"
import { ProductPartsGrid } from "@/components/product/product-parts-grid"
import { DemandBadge, RequestedPartsList } from "@/components/product/requested-parts-demand"
import { ProductReferences } from "@/components/product/product-references"
import { RequestPartForm } from "@/components/part-requests/request-part-form"
import { fetchProductPageBySlug, fetchProductPageParts } from "@/lib/supabase/queries/product-page"
import { fetchPartRequestCounts } from "@/lib/supabase/queries/part-requests"
import { APP_NAME } from "@/lib/utils/constants"
import { parseAcceptLanguage } from "@/lib/utils/locale"
import { pickRegionalName, type ProductReference } from "@/lib/utils/product-references"
import { parsePageParam } from "@/lib/utils/validation"
import {
  buildBreadcrumbJsonLd,
  buildProductBreadcrumbTrail,
  localizedPageMetadata,
  productCanonicalPath,
  productFullName,
  seoDescription,
  serializeJsonLd,
  toBreadcrumbLinks,
} from "@/lib/utils/seo"

// The name a visitor knows the product by: the commercial name of their region
// (read from Accept-Language) when one is recorded, else products.name.
async function resolveDisplayName(name: string, references: ProductReference[]): Promise<string> {
  const locale = parseAcceptLanguage((await headers()).get("accept-language"))
  return pickRegionalName(references, locale) ?? name
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [data, t, locale] = await Promise.all([
    fetchProductPageBySlug(slug),
    getTranslations("Seo"),
    getLocale(),
  ])
  if (!data) return { title: t("productNotFoundTitle") }

  const { product } = data
  const displayName = await resolveDisplayName(product.name, data.references)
  // The brand folded into the product name for query matching: "Bosch MUM5".
  const fullName = productFullName(product.brand?.name ?? null, displayName)
  const title = t("productTitle", { product: fullName })
  // No count: the page covers parts and open requests alike, and an empty
  // product invites a request rather than showing "0 parts" in a snippet.
  const description = seoDescription(
    product.category
      ? t("productDescriptionCategory", { product: fullName, category: product.category.name, app: APP_NAME })
      : t("productDescription", { product: fullName, app: APP_NAME }),
  )
  return {
    title,
    description,
    ...localizedPageMetadata(productCanonicalPath(product.slug), locale, {
      title,
      description,
      siteName: APP_NAME,
      type: "website",
      images: product.image_url ? [{ url: product.image_url, alt: displayName }] : undefined,
    }),
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const data = await fetchProductPageBySlug(slug)
  if (!data) notFound()

  const { product, references } = data
  const [displayName, t, locale] = await Promise.all([
    resolveDisplayName(product.name, references),
    getTranslations("ProductPage"),
    getLocale(),
  ])

  // One page of parts, cut in the database (#373). An invalid or out-of-range
  // ?page= falls back to page 1.
  const listing = await fetchProductPageParts({
    productId: product.id,
    page: parsePageParam(rawPage),
  })
  // The empty state depends on the product having no part at all, not on the
  // length of the current page.
  const hasParts = listing.total > 0

  // Request counts are only rendered in the empty state — skip the RPC entirely
  // when the product already has parts.
  const requestCounts = hasParts ? [] : await fetchPartRequestCounts(product.id)

  // "Since 2015" / "2015 · Discontinued" / "Discontinued" — omitted when unknown.
  const productionYears = product.release_year
    ? t(product.discontinued ? "releasedDiscontinued" : "since", { year: product.release_year })
    : product.discontinued
      ? t("discontinued")
      : null

  // Brand › Category › Product (Flow P2), shared with part pages.
  const breadcrumbTrail = buildProductBreadcrumbTrail({ ...product, name: displayName })
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(productCanonicalPath(product.slug), breadcrumbTrail, locale)

  return (
    <Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Container size="lg" className="space-y-xl">
        <Breadcrumbs items={toBreadcrumbLinks(breadcrumbTrail)} />

        {/* Identification header */}
        <div className="grid grid-cols-1 gap-lg md:grid-cols-[minmax(0,16rem)_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-bg-subtle">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-disabled">
                <svg aria-hidden="true" className="size-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {displayName}
              </h1>
              {productionYears && (
                <div className="flex flex-wrap items-center gap-md text-body text-text-secondary">
                  <span>{productionYears}</span>
                </div>
              )}
            </div>
            <ProductReferences references={references} displayedName={displayName} />
          </div>
        </div>

        {hasParts ? (
          <>
            <div className="space-y-md">
              <ProductPartsGrid parts={listing.parts} />
              {/* Page 1 stays the bare canonical URL. */}
              <PaginationLinks
                basePath={productCanonicalPath(product.slug)}
                page={listing.page}
                totalPages={listing.totalPages}
              />
            </div>

            {/* Request capture — always available below the grid */}
            <div className="space-y-sm rounded-lg border border-border-subtle bg-bg-subtle p-lg">
              <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
                {t("missingTitle")}
              </h2>
              <p className="text-body text-text-secondary">{t("missingDescription")}</p>
              <RequestPartForm productId={product.id} submitLabel={t("requestPart")} />
            </div>
          </>
        ) : (
          <EmptyState productId={product.id} counts={requestCounts} />
        )}
      </Container>
    </Section>
  )
}

async function EmptyState({
  productId,
  counts,
}: {
  productId: string
  counts: Awaited<ReturnType<typeof fetchPartRequestCounts>>
}) {
  const t = await getTranslations("ProductPage")
  return (
    <div className="space-y-lg">
      <div className="space-y-sm">
        <div className="flex flex-wrap items-center gap-md">
          <h2 className="font-heading text-heading-md font-semibold text-text-primary">
            {t("emptyTitle")}
          </h2>
          <DemandBadge counts={counts} />
        </div>
        <p className="max-w-container-md text-body text-text-secondary">{t("emptyDescription")}</p>
      </div>

      <div className="max-w-container-md">
        <RequestPartForm productId={productId} submitLabel={t("requestPart")} />
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <Button asChild variant="outline">
          {/* The product is picked on the Compatibility step, not carried in
              the URL — the old ?product= param was never read (#260). */}
          <Link href="/publish">{t("publish")}</Link>
        </Button>
      </div>

      <RequestedPartsList counts={counts} />
    </div>
  )
}
