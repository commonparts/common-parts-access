import 'server-only'

import type { z } from 'zod'
import { STORAGE_BUCKETS } from '@/constants/app'
import type { editPublishedPartSchema } from '@/lib/schemas/parts'
import { resolveStorageUrl } from '@/lib/storage/url'
import { getPartImageReferences } from '@/lib/utils/images'
import { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

/** The owner filter also excludes public rows visible through the read policy. */
export async function getPublishedPartForEdit(supabase: Client, slug: string, userId: string) {
  const { data, error } = await supabase.from('parts')
    .select('id, slug, name, description, instructions, thumbnail_url, images, updated_at')
    .eq('slug', slug)
    .eq('user_id', userId)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description ?? '',
    instructions: data.instructions ?? '',
    revision: data.updated_at ?? '',
    images: getPartImageReferences(data.thumbnail_url, data.images)
      .map((reference) => ({ reference, url: resolveStorageUrl(reference) })),
  }
}

/** The invoker RPC and the existing owner policies govern both table writes. */
export async function savePublishedPartEdit(supabase: Client, input: z.output<typeof editPublishedPartSchema>) {
  const { id, revision, removedImages, files, ...details } = input
  const { data, error } = await supabase.rpc('edit_published_part', {
    p_part_id: id,
    p_revision: revision,
    p_details: details,
    p_removed_images: removedImages,
    p_uploads: files.map(({ path, originalName }) => ({ path, original_name: originalName })),
  })

  if (error || data === null) return { saved: false as const, error }

  if (data.length > 0) {
    try {
      const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKETS.MODEL_THUMBNAILS).remove(data)
      if (cleanupError) console.error('Failed to clean up detached part images', cleanupError)
    } catch (error) {
      console.error('Failed to clean up detached part images', error)
    }
  }

  return { saved: true as const }
}
