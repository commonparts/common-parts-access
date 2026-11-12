'use server'

import { isChunkLike, DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import type { z } from 'zod'
import { AccountDeletionError, deleteAccount } from '@/lib/account/deletion'
import { validate, type Result } from '@/lib/api/parse'
import { getPublicEnv } from '@/lib/public-env'
import { accountDeletionConfirmationSchema } from '@/lib/schemas/account'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAccountDeletionSteps } from '@/lib/supabase/queries/account-deletion'
import { createClient } from '@/lib/supabase/server'

/** Deletes the verified session's account after checking the localized confirmation. */
export async function deleteOwnAccount(input: z.input<typeof accountDeletionConfirmationSchema>): Promise<Result<null>> {
  const confirmation = await validate(accountDeletionConfirmationSchema, input)
  const form = await getTranslations('DeleteAccountForm')
  if (!confirmation.ok || confirmation.data !== form('confirmWord')) {
    return { ok: false, error: form('typeToConfirm', { word: form('confirmWord') }) }
  }

  const t = await getTranslations('Api')
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { ok: false, error: t('signInRequired') }

    const steps = accountDeletionSteps()
    if (!steps) return { ok: false, error: t('accountDeletionUnavailable') }

    await deleteAccount(user.id, steps)
    await clearDeletedAccountSession(supabase).catch(() => {
      console.error('Account deleted, but the browser session could not be cleared')
    })
    return { ok: true, data: null }
  } catch (error) {
    console.error('Account deletion failed', error instanceof AccountDeletionError ? error.stage : 'unknown')
    return { ok: false, error: t('accountDeletionFailed') }
  }
}

function accountDeletionSteps() {
  try {
    return createAccountDeletionSteps(createAdminClient())
  } catch {
    console.error('Account deletion: admin client unavailable')
    return null
  }
}

/** Clears the browser's session even if Auth no longer accepts the deleted user's token. */
async function clearDeletedAccountSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (!error) return
  } catch {
    // Auth has already deleted the account and its sessions. Expire the cookie locally.
  }

  const { NEXT_PUBLIC_SUPABASE_URL: url } = getPublicEnv()
  // Uses the default storage key of the Supabase client, including its chunked cookies.
  const cookieKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
  const cookieStore = await cookies()
  for (const { name } of cookieStore.getAll()) {
    if (isChunkLike(name, cookieKey)) {
      cookieStore.set(name, '', { ...DEFAULT_COOKIE_OPTIONS, maxAge: 0 })
    }
  }
}
