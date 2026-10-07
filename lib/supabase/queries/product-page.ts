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

// Upper bound on parts fetched for a product page in one call.
const MAX_PRODUCT_PARTS = 500

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
  download_count: number
  created_at: string | null
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
  download_count: number | null
  created_at: string | null
  product_link: { evidence_level: string }[] | null
}

/**
 * Fetches the published parts shown on a product page, one row per part,
 * built from the shared part card select and mapper (issue #380) so they carry
 * the same card body as everywhere else. Sorting is left to the caller.
 * RLS: "Anyone can view published parts" on parts and "Public or owner read"
 * on part_products; the card embeds are covered by the public read policies of
 * products, brands, licenses and source_platforms.
 */
export async function fetchProductPageParts(input: { productId: string }): Promise<ProductPart[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parts')
    .select(`${PART_CARD_SELECT}, download_count, created_at, ${PRODUCT_LINK_JOIN}`)
    .eq('product_link.product_id', input.productId)
    .eq('status', 'published')
    .order(CARD_PRODUCT_ORDER, { referencedTable: 'fits' })
    .limit(CARD_PRODUCT_PREVIEW_COUNT, { referencedTable: 'fits' })
    .limit(MAX_PRODUCT_PARTS)

  if (error) throw error

  // Cast through unknown, as in fetchPartCards: the client's select parser
  // gives up on the card select once a filter join is appended to it.
  return ((data ?? []) as unknown as ProductPartRow[]).map((row) => ({
    card: mapPartRowToCard(row),
    evidence_level: toEvidenceLevel(row.product_link?.[0]?.evidence_level),
    download_count: row.download_count ?? 0,
    created_at: row.created_at,
  }))
}
