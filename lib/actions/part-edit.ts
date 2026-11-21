'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { validate, type Result } from '@/lib/api/parse'
import { editPublishedPartSchema } from '@/lib/schemas/parts'
import { savePublishedPartEdit } from '@/lib/supabase/queries/part-edit'
import { createClient } from '@/lib/supabase/server'

export async function editPublishedPart(input: unknown): Promise<Result<null>> {
  const [t, api] = await Promise.all([getTranslations('EditPublishedPart'), getTranslations('Api')])
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: api('signInRequired') }

    const parsed = await validate(editPublishedPartSchema, input)
    if (!parsed.ok) return parsed

    const result = await savePublishedPartEdit(supabase, parsed.data)
    if (!result.saved) {
      if (!result.error) return { ok: false, error: t('conflict') }
      if (result.error.code === '22023') return { ok: false, error: t('invalidGallery') }
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
