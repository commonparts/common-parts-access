'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { validate } from '@/lib/api/parse'
import { editPublishedPartSchema } from '@/lib/schemas/parts'
import { savePublishedPartEdit } from '@/lib/supabase/queries/part-edit'
import { createClient } from '@/lib/supabase/server'

type EditPublishedPartResult = { ok: true; data: null } | { ok: false; error: string; discardUploads?: true }

export async function editPublishedPart(input: unknown): Promise<EditPublishedPartResult> {
  const parsed = await validate(editPublishedPartSchema, input)
  if (!parsed.ok) return { ...parsed, discardUploads: true }

  const [t, api] = await Promise.all([getTranslations('EditPublishedPart'), getTranslations('Api')])
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: api('signInRequired'), discardUploads: true }

    const result = await savePublishedPartEdit(supabase, parsed.data)
    if (!result.saved) {
      if (!result.error) return { ok: false, error: t('conflict'), discardUploads: true }
      if (result.error.code === '22023') return { ok: false, error: t('invalidGallery'), discardUploads: true }
      throw result.error
    }

    revalidatePath('/[locale]/my-parts', 'page')
    revalidatePath('/[locale]/parts/[slug]', 'page')
    return { ok: true, data: null }
  } catch (error) {
    console.error('Failed to edit published part', error)
    return { ok: false, error: api('serverError') }
  }
}
