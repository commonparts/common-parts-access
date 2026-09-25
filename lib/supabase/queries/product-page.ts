import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ProductReference } from '@/lib/utils/product-references'
import { toEvidenceLevel, type EvidenceLevel } from '@/lib/utils/evidence-level'

// Upper bound on part links fetched for a product page in one call.
const MAX_PART_LINKS = 500

// Upper bound on references embedded in a product page. A product groups tens
// of manufacturer references at most; this only guards against runaway data.
const MAX_PRODUCT_REFERENCES = 200

// Supabase embeds a to-one relation as an object, but the generated-less client
// types it as a possibly-array — normalize to the first row (or null).
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

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
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  part_name: string | null
  part_number: string | null
  material: string | null
  download_count: number
  estimated_print_time: number | null // minutes
  created_at: string | null
  license_short_name: string | null
  /** Evidence that this part fits this product — not the part in general (#317). */
  evidence_level: EvidenceLevel
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
      brand: firstOf(row.brands),
      category: firstOf(row.categories),
    }

    return { product, references: row.product_references ?? [] }
  },
)

interface PartRow {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  part_name: string | null
  part_number: string | null
  material: string | null
  download_count: number | null
  estimated_print_time: number | null
  created_at: string | null
  licenses: { short_name: string } | { short_name: string }[] | null
}

interface PartLinkRow {
  product_id: string
  evidence_level: string
  parts: PartRow | PartRow[] | null
}

/**
 * Fetches the published parts shown on a product page, deduplicated per part.
 * The part_products "Public or owner read" RLS policy restricts rows to
 * published parts (or the caller's own). Sorting/ranking is left to the caller.
 */
export async function fetchProductPageParts(input: { productId: string }): Promise<ProductPart[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('part_products')
    .select(
      `
      product_id,
      evidence_level,
      parts!inner(
        id, name, slug, thumbnail_url, part_name, part_number, material,
        download_count, estimated_print_time, created_at, status,
        licenses!parts_license_id_fkey(short_name)
      )
    `,
    )
    .eq('product_id', input.productId)
    .eq('parts.status', 'published')
    .limit(MAX_PART_LINKS)

  if (error) throw error

  const byPart = new Map<string, ProductPart>()

  for (const link of (data ?? []) as PartLinkRow[]) {
    const part = firstOf(link.parts)
    if (!part) continue
    if (byPart.has(part.id)) continue

    byPart.set(part.id, {
      id: part.id,
      name: part.name,
      slug: part.slug,
      thumbnail_url: part.thumbnail_url,
      part_name: part.part_name,
      part_number: part.part_number,
      material: part.material,
      download_count: part.download_count ?? 0,
      estimated_print_time: part.estimated_print_time,
      created_at: part.created_at,
      license_short_name: firstOf(part.licenses)?.short_name ?? null,
      evidence_level: toEvidenceLevel(link.evidence_level),
    })
  }

  return Array.from(byPart.values())
}
