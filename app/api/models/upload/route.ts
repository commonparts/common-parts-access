import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slug'
import { uploadModelAssets } from '@/lib/storage/upload'
import { validateModelUpload } from '@/lib/storage/file-validation'

export const runtime = 'nodejs'

async function ensureUniqueSlug(name: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const base = slugify(name) || `model-${Date.now().toString(36)}`
  let candidate = base
  let counter = 1

  while (true) {
    const { data } = await supabase
      .from('models')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (!data) return candidate
    candidate = `${base}-${counter}`
    counter += 1
    if (counter > 50) {
      candidate = `${base}-${Date.now().toString(36)}`
      break
    }
  }

  return candidate
}

async function cleanupUploadedAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: { bucket: string; path: string }[],
) {
  const grouped = paths.reduce<Record<string, string[]>>((acc, asset) => {
    acc[asset.bucket] = acc[asset.bucket] || []
    acc[asset.bucket].push(asset.path)
    return acc
  }, {})

  await Promise.all(
    Object.entries(grouped).map(([bucket, bucketPaths]) =>
      supabase.storage.from(bucket).remove(bucketPaths),
    ),
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const name = (formData.get('title') || formData.get('name') || '').toString().trim()
    const description = (formData.get('description') || '').toString().trim() || null
    const categoryId = (formData.get('category') || '').toString().trim() || null
    const brandId = (formData.get('brand') || '').toString().trim() || null
    const productId = (formData.get('product') || '').toString().trim() || null
    const license = (formData.get('license') || '').toString().trim() || null
    const isPublic = String(formData.get('isPublic') ?? 'true') === 'true'

    const tags = formData.getAll('tags').map((tag) => tag.toString().trim()).filter(Boolean)
    const modelFiles = formData.getAll('files').filter((value): value is File => value instanceof File)
    const thumbnails = formData.getAll('thumbnails').filter((value): value is File => value instanceof File)

    const validation = validateModelUpload({
      name,
      category: categoryId,
      tags,
      modelFiles,
      thumbnails,
    })

    if (!validation.ok) {
      return NextResponse.json({ error: 'Validation failed', issues: validation.issues }, { status: 400 })
    }

    const slug = await ensureUniqueSlug(name, supabase)
    const status = isPublic ? 'published' : 'draft'

    const { data: model, error: modelError } = await supabase
      .from('models')
      .insert({
        name,
        slug,
        description,
        category_id: categoryId,
        brand_id: brandId || null,
        product_id: productId || null,
        tags,
        license,
        status,
        user_id: user.id,
      })
      .select('id, slug')
      .single()

    if (modelError || !model) {
      console.error('Failed to insert model row', modelError)
      return NextResponse.json({ error: 'Failed to create model' }, { status: 500 })
    }

    const uploads = await uploadModelAssets({
      supabase,
      userId: user.id,
      modelId: model.id,
      modelFiles: validation.modelFiles,
      thumbnails: validation.thumbnails,
    })

    const fileRows = [
      ...uploads.modelFiles.map((asset) => ({
        model_id: model.id,
        filename: asset.filename,
        original_filename: asset.originalName,
        file_type: asset.extension,
        file_size: asset.size,
        file_url: asset.publicUrl,
        file_category: 'model',
        upload_path: asset.path,
      })),
      ...uploads.thumbnails.map((asset) => ({
        model_id: model.id,
        filename: asset.filename,
        original_filename: asset.originalName,
        file_type: asset.extension,
        file_size: asset.size,
        file_url: asset.publicUrl,
        file_category: 'image',
        upload_path: asset.path,
      })),
    ]

    if (fileRows.length > 0) {
      const { error: filesError } = await supabase.from('model_files').insert(fileRows)
      if (filesError) {
        await cleanupUploadedAssets(supabase, [...uploads.modelFiles, ...uploads.thumbnails])
        console.error('Failed to insert model_files rows', filesError)
        return NextResponse.json({ error: 'Failed to persist uploaded files' }, { status: 500 })
      }
    }

    if (uploads.primaryThumbnailUrl || uploads.imageUrls.length) {
      const { error: updateError } = await supabase
        .from('models')
        .update({
          thumbnail_url: uploads.primaryThumbnailUrl,
          images: uploads.imageUrls,
        })
        .eq('id', model.id)
        .select('id')
        .single()

      if (updateError) {
        console.warn('Uploaded but failed to update thumbnail/images', updateError)
      }
    }

    return NextResponse.json({
      modelId: model.id,
      slug: model.slug,
      status,
      fileCount: uploads.modelFiles.length,
      thumbnailUrl: uploads.primaryThumbnailUrl,
      images: uploads.imageUrls,
    }, { status: 201 })
  } catch (error) {
    console.error('Model upload failed', error)
    return NextResponse.json({ error: 'Unexpected error while uploading model' }, { status: 500 })
  }
}