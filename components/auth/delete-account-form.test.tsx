// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTranslator, NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import { deleteOwnAccount } from '@/lib/actions/account'
import { DeleteAccountForm } from './delete-account-form'

const mocks = vi.hoisted(() => ({
  locale: 'en' as 'en' | 'fr',
  getUser: vi.fn(),
  createAdminClient: vi.fn(),
  deleteAuthUser: vi.fn(),
  signOut: vi.fn(),
  getCookies: vi.fn(),
  setCookie: vi.fn(),
  replace: vi.fn(),
}))

const messages = { en, fr }
const user = { id: '11111111-1111-4111-8111-111111111111' }

vi.mock('next-intl/server', () => ({
  getLocale: async () => mocks.locale,
  getTranslations: async (options?: string | { locale?: keyof typeof messages; namespace?: string }) => {
    const { locale = mocks.locale, namespace } = typeof options === 'string' ? { namespace: options } : (options ?? {})
    return createTranslator({ locale, messages: messages[locale], namespace: namespace as never })
  },
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: mocks.getCookies, set: mocks.setCookie }),
}))
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser, signOut: mocks.signOut } }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/supabase/queries/account-deletion', () => ({
  createAccountDeletionSteps: () => ({
    listUnpublishedPartIds: async () => [],
    listStorageObjects: async () => [],
    releaseStorageOwnership: async () => 0,
    deleteAuthUser: mocks.deleteAuthUser,
  }),
}))

let container: HTMLDivElement
let root: Root

/** Submits the rendered form in the same locale as the server action. */
async function submitConfirmation(locale: keyof typeof messages, text: string) {
  mocks.locale = locale
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        <DeleteAccountForm />
      </NextIntlClientProvider>,
    )
  })
  const input = container.querySelector('input')!
  expect(input.placeholder).toBe(messages[locale].DeleteAccountForm.confirmWord)
  await act(async () => {
    // Simulate typing without updating React's internal value tracker.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.locale = 'en'
  mocks.getUser.mockResolvedValue({ data: { user }, error: null })
  mocks.deleteAuthUser.mockResolvedValue(undefined)
  mocks.signOut.mockResolvedValue({ error: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('account deletion', () => {
  it.each([
    ['en', '  delete  '],
    ['fr', 'supprimer'],
  ] as const)('deletes the signed-in account and signs out from the %s form', async (locale, word) => {
    await submitConfirmation(locale, word)

    expect(mocks.deleteAuthUser).toHaveBeenCalledExactlyOnceWith(user.id)
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' })
    expect(mocks.signOut).toHaveBeenCalledAfter(mocks.deleteAuthUser)
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith('/delete-account/success')
  })

  it('rejects the English word on the French page before looking up a session', async () => {
    await submitConfirmation('fr', 'delete')

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('SUPPRIMER')
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a direct request supplying another account ID', async () => {
    const forged = { confirmation: 'DELETE', userId: 'another-user' }
    expect(await deleteOwnAccount(forged as unknown as string)).toMatchObject({ ok: false })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('refuses a direct request without a verified session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    expect(await deleteOwnAccount('DELETE')).toEqual({ ok: false, error: en.Api.signInRequired })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('shows an error and keeps the form usable if deletion fails', async () => {
    mocks.deleteAuthUser.mockRejectedValueOnce(new Error('Test failure'))

    await submitConfirmation('en', 'delete')

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(en.Api.accountDeletionFailed)
    expect(container.querySelector('button')?.disabled).toBe(false)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('clears only the account cookies if Auth returns a sign-out error after deletion', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: new Error('Session unavailable') })
    mocks.getCookies.mockReturnValue([
      { name: 'sb-project-auth-token.0' },
      { name: 'sb-project-auth-token.1' },
      { name: 'NEXT_LOCALE' },
    ])

    expect(await deleteOwnAccount('DELETE')).toEqual({ ok: true, data: null })
    expect(mocks.setCookie).toHaveBeenCalledTimes(2)
    expect(mocks.setCookie).toHaveBeenCalledWith('sb-project-auth-token.0', '', expect.objectContaining({ path: '/', maxAge: 0 }))
    expect(mocks.setCookie).toHaveBeenCalledWith('sb-project-auth-token.1', '', expect.objectContaining({ path: '/', maxAge: 0 }))
  })
})
