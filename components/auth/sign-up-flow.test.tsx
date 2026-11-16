// @vitest-environment jsdom
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NextIntlClientProvider } from 'next-intl'
import { NextRequest } from 'next/server'
import { AuthWeakPasswordError } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { GET } from '@/app/(auth)/confirm/route'
import fr from '@/messages/fr.json'

const { push, signUp, exchangeConfirmationCode, verifyOtp, redirect } = vi.hoisted(() => ({
  push: vi.fn(),
  signUp: vi.fn(),
  exchangeConfirmationCode: vi.fn(),
  verifyOtp: vi.fn(),
  redirect: vi.fn((destination: string): never => { throw new Error(destination) }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('redirect=%2Ffr%2Fpublish'),
  redirect,
}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push }),
}))
vi.mock('@/lib/supabase/queries/auth.client', () => ({ signUp }))
vi.mock('@/lib/supabase/queries/auth.server', () => ({ exchangeConfirmationCode, verifyOtp }))

describe('signup password requirements', () => {
  let container: HTMLElement
  let root: Root

  async function type(id: string, value: string): Promise<void> {
    const input = container.querySelector<HTMLInputElement>(`#${id}`)
    if (!input) throw new Error(`Missing ${id}`)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  beforeEach(async () => {
    signUp.mockReset().mockResolvedValue({ error: null })
    push.mockClear()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<NextIntlClientProvider locale="fr" messages={fr}><SignUpForm /></NextIntlClientProvider>)
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('shows the missing digit before confirmation and blocks submission until corrected', async () => {
    const list = container.querySelector('#password-requirements')
    expect(list?.querySelectorAll('li')).toHaveLength(5)
    await type('password', 'UnSecret!')
    expect(list?.textContent).toContain('Critère à respecter Un chiffre')
    expect(list?.textContent).toContain('Critère respecté Au moins 8 caractères')
    await type('email', 'qa@example.test')
    await type('username', 'qa-541')
    await type('repeat-password', 'UnSecret!')
    await act(async () => container.querySelector('form')?.requestSubmit())
    expect(signUp).not.toHaveBeenCalled()
    expect(container.querySelector('[role=alert]')?.textContent).toBe(fr.SignUpForm.passwordRequirementsUnmet)

    await type('password', 'UnSecret1!')
    expect(list?.textContent).toContain('Critère respecté Un chiffre')
    expect(container.querySelector('[role=alert]')).toBeNull()
    await type('repeat-password', 'UnSecret1!')
    await act(async () => container.querySelector('form')?.requestSubmit())
    expect(signUp).toHaveBeenCalledWith(
      'qa@example.test', 'UnSecret1!', 'qa-541', 'fr',
      `${window.location.origin}/confirm?next=%2Ffr%2Fpublish`,
    )
    expect(push).toHaveBeenCalledWith('/sign-up-success')
  })

  it('reports a breached password using the structured server reason', async () => {
    signUp.mockResolvedValue({ error: new AuthWeakPasswordError('Weak', 422, ['pwned']) })
    await type('email', 'qa@example.test')
    await type('username', 'qa-541')
    await type('password', 'UnSecret1!')
    await type('repeat-password', 'UnSecret1!')
    await act(async () => container.querySelector('form')?.requestSubmit())
    expect(container.querySelector('[role=alert]')?.textContent).toBe(fr.SignUpForm.passwordCompromised)
    expect(push).not.toHaveBeenCalled()
  })
})

describe('signup confirmation callback', () => {
  beforeEach(() => {
    exchangeConfirmationCode.mockReset().mockResolvedValue({ data: { session: {} }, error: null })
    verifyOtp.mockReset().mockResolvedValue({ error: null })
    redirect.mockClear()
  })

  it('exchanges a code and returns to the requested same-site page', async () => {
    await expect(GET(new NextRequest('https://staging.example.test/confirm?next=%2Ffr%2Fpublish&code=auth-code'))).rejects.toThrow('/fr/publish')
    expect(exchangeConfirmationCode).toHaveBeenCalledExactlyOnceWith('auth-code')
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('rejects external destinations after a successful exchange', async () => {
    await expect(GET(new NextRequest('https://staging.example.test/confirm?code=auth-code&next=%2F%2Fexample.test'))).rejects.toThrow(/^\/$/)
  })

  it('goes to the confirmation error page if the exchange fails', async () => {
    exchangeConfirmationCode.mockResolvedValue({ data: { session: null }, error: new Error('Missing verifier') })
    await expect(GET(new NextRequest('https://staging.example.test/confirm?code=auth-code'))).rejects.toThrow('/error?error=confirmation')
  })

  it('still verifies a token-hash link', async () => {
    await expect(GET(new NextRequest('https://staging.example.test/confirm?token_hash=hash&type=email&next=%2Ffr%2Fpublish'))).rejects.toThrow('/fr/publish')
    expect(verifyOtp).toHaveBeenCalledExactlyOnceWith('email', 'hash')
    expect(exchangeConfirmationCode).not.toHaveBeenCalled()
  })
})
