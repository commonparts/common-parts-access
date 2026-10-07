import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ProductReference } from '@/lib/utils/product-references'
import { toEvidenceLevel, type EvidenceLevel } from '@/lib/utils/evidence-level'
import { firstEmbedded } from '@/lib/utils/supabase-embed'
import {
  CARD_PRODUCT_ORDER,
  CARD_PRODUCT_PREVIEW_COUNT,
  PART_CARD_SELECT,
  mapPartRowToCard,
} from '@/lib/supabase/queries/part'
import type { PartCardData, PartCardRow } from '@/types/parts'

/** Parts per page of a product page, as on /browse. */
const PRODUCT_PARTS_PAGE_SIZE = 20

/**
 * PostgREST answers 416 with this code when the requested range starts past
 * the last row, i.e. for a page number beyond the last page.
 */
const RANGE_NOT_SATISFIABLE = 'PGRST103'

// Upper bound on references embedded in a product page. A product groups tens
// of manufacturer references at most; this only guards against runaway data.
const MAX_PRODUCT_REFERENCES = 200

export interface ProductPageProduct {
  id: string
  name: string
  slug: string
  release_year: number | null
  discontinued: boolean
  image_url: string | null
  brand: { id: string; name: string; slug: string } | null
  category: { id: string; name: string; slug: string } | null
}

export interface ProductPageData {
  product: ProductPageProduct
  references: ProductReference[]
}

export interface ProductPart {
  card: PartCardData
  /** Evidence that this part fits this product — not the part in general (#317). */
  evidence_level: EvidenceLevel
}

/** One page of a product's parts, newest first, with the untruncated total. */
export interface ProductPartsPage {
  parts: ProductPart[]
  /** Published parts linked to the product, across every page. */
  total: number
  /** The page actually returned: 1 when the requested page was out of range. */
  page: number
  totalPages: number
}

interface ProductRow {
  id: string
  name: string
  slug: string
  release_year: number | null
  discontinued: boolean | null
  image_url: string | null
  brands: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  product_references: ProductReference[] | null
}

/**
 * Loads a product page by slug: the product with its brand, category and known
 * references (manufacturer refs, commercial names, barcodes). Returns null when
 * the slug does not resolve. Wrapped in React cache() so generateMetadata and
 * the page component share a single query per request. Covered by the public
 * read policies on products and product_references.
 */
export const fetchProductPageBySlug = cache(
  async (slug: string): Promise<ProductPageData | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id, name, slug, release_year, discontinued, image_url,
        brands(id, name, slug),
        categories(id, name, slug),
        product_references(id, value, type, region, language)
      `,
      )
      .eq('slug', slug)
      .order('type', { referencedTable: 'product_references' })
      .order('value', { referencedTable: 'product_references' })
      .limit(MAX_PRODUCT_REFERENCES, { referencedTable: 'product_references' })
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const row = data as ProductRow
    const product: ProductPageProduct = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      release_year: row.release_year,
      discontinued: Boolean(row.discontinued),
      image_url: row.image_url,
      brand: firstEmbedded(row.brands),
      category: firstEmbedded(row.categories),
    }

    return { product, references: row.product_references ?? [] }
  },
)

/**
 * Inner join restricting the parts to those linked to the product, aliased
 * apart from the card's own embeds of part_products. Filtered on the product,
 * it holds that one link (part_products is keyed on part and product), whose
 * evidence level is the context badge of the card.
 */
const PRODUCT_LINK_JOIN = 'product_link:part_products!inner(product_id, evidence_level)'

type ProductPartRow = PartCardRow & {
  product_link: { evidence_level: string }[] | null
}

/**
 * Queries one page of a product's published parts with the exact total.
 * Ordered by creation date, newest first, then by id so that parts created at
 * the same instant keep a stable position across pages. The product filter
 * goes through the inner join on part_products (idx_part_products_product).
 */
async function queryProductPartsPage(productId: string, page: number) {
  const supabase = await createClient()
  const from = (page - 1) * PRODUCT_PARTS_PAGE_SIZE

  return supabase
    .from('parts')
    .select(`${PART_CARD_SELECT}, ${PRODUCT_LINK_JOIN}`, { count: 'exact' })
    .eq('product_link.product_id', productId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .order(CARD_PRODUCT_ORDER, { referencedTable: 'fits' })
    .limit(CARD_PRODUCT_PREVIEW_COUNT, { referencedTable: 'fits' })
    .range(from, from + PRODUCT_PARTS_PAGE_SIZE - 1)
}

/**
 * Fetches one page of the published parts shown on a product page, newest
 * first, one row per part, built from the shared part card select and mapper
 * (issue #380) so they carry the same card body as everywhere else. The page
 * is cut in the database (#373): no query loads every part of a product.
 * A page past the last one falls back to page 1 rather than rendering an
 * empty grid under a product that has parts.
 * RLS: "Anyone can view published parts" on parts and "Public or owner read"
 * on part_products; the card embeds are covered by the public read policies of
 * products, brands, licenses and source_platforms.
 */
export async function fetchProductPageParts(input: {
  productId: string
  page: number
}): Promise<ProductPartsPage> {
  let page = Math.max(1, input.page)
  let result = await queryProductPartsPage(input.productId, page)

  const outOfRange =
    page > 1 &&
    (result.error?.code === RANGE_NOT_SATISFIABLE ||
      (!result.error && (result.data ?? []).length === 0))
  if (outOfRange) {
    page = 1
    result = await queryProductPartsPage(input.productId, page)
  }

  const { data, error, count } = result
  if (error) throw error

  const total = count ?? 0
  return {
    // Cast through unknown, as in fetchPartCards: the client's select parser
    // gives up on the card select once a filter join is appended to it.
    parts: ((data ?? []) as unknown as ProductPartRow[]).map((row) => ({
      card: mapPartRowToCard(row),
      evidence_level: toEvidenceLevel(row.product_link?.[0]?.evidence_level),
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PRODUCT_PARTS_PAGE_SIZE)),
  }
}
