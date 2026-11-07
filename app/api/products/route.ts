import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProducts, createProduct, findProductByNormalizedName } from '@/lib/supabase/queries/products'
import { parseJsonBody, parseSearchParams } from '@/lib/api/parse'
import { createProductSchema, productListQuerySchema } from '@/lib/schemas/products'
import { STORAGE_BUCKETS } from '@/constants/app'
import { isOwnStorageReference } from '@/lib/storage/path-utils'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/products - List products with optional brand/category filters
export async function GET(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    // `ids` is an exact lookup, taken whole or refused: see productListQuerySchema.
    const query = await parseSearchParams(request, productListQuerySchema)
    if (!query.ok) return query.response

    const products = await fetchProducts(query.data)
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    // Writes require an authenticated session (RLS also enforces this, but a
    // clean 401 beats a policy-violation 500). getUser() verifies server-side.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const body = await parseJsonBody(request, createProductSchema)
    if (!body.ok) return body.response
    const input = body.data

    // `imageUrl` is the storage reference of an image the user uploaded to
    // their own folder of the product thumbnails bucket (#56). Anything else
    // (a URL, another user's object) is refused rather than stored.
    if (input.imageUrl && !isOwnStorageReference(input.imageUrl, STORAGE_BUCKETS.PRODUCT_THUMBNAILS, user.id)) {
      return NextResponse.json(
        { error: t('invalidProductImage') },
        { status: 400 },
      )
    }

    // Duplicate guard: a case/spacing variant of an existing product must link
    // to that product, not create a sibling. 409 carries the existing record
    // so the client can select it instead.
    const existing = await findProductByNormalizedName(input.brandId, input.name)
    if (existing) {
      return NextResponse.json(
        { error: t('productExists'), product: existing },
        { status: 409 }
      )
    }

    const product = await createProduct(input)

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Failed to create product', error)
    return NextResponse.json({ error: t('productCreateFailed') }, { status: 500 })
  }
}