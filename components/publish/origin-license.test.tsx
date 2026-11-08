// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { NextIntlClientProvider } from 'next-intl'
import { OriginalOriginStep } from './original-origin-step'
import { ElsewhereOriginStep } from './elsewhere-origin-step'
import { usePartUploadFormState, type PartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { EMPTY_PUBLISH_FORM, type PublishFormContext } from '@/lib/publish/form'
import { PUBLISH_STEPS } from '@/lib/publish/steps'
import en from '@/messages/en.json'

const save = vi.hoisted(() => vi.fn())
vi.mock('@/lib/actions/publish', () => ({ savePublication: save }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

const firstId = '11111111-1111-4111-8111-111111111111'
const secondId = '22222222-2222-4222-8222-222222222222'
const licenses = [firstId, secondId].map((id, index) => ({
  id, spdx_id: index === 0 ? 'CC-BY-4.0' : 'CC0-1.0',
  short_name: index === 0 ? 'CC BY' : 'CC0', name: `License ${index + 1}`,
  url: 'https://creativecommons.org/', requires_attribution: index === 0,
  allows_commercial: true, allows_redistribution: true, is_copyleft: false,
}))
const capture = vi.fn<(form: PartUploadFormState) => void>()
let container: HTMLDivElement
let root: Root
let resolveLicenses: (response: Response) => void

/** Exercises the real form hook and selects while catalog requests are pending. */
function Harness({ track, visible = true }: { track: PublishFormContext['track']; visible?: boolean }) {
  const form = usePartUploadFormState({ track, step: PUBLISH_STEPS.ORIGIN, draftId: null,
    preselectFirstLicense: track === 'original' })
  capture(form)
  if (!visible) return null
  return track === 'original'
    ? <OriginalOriginStep form={form} draftId={null} attestedAt={null} />
    : <ElsewhereOriginStep form={form} draftId={null} duplicate={null}
        checkingSource={false} prefilledFields={new Set()} />
}

async function render(track: PublishFormContext['track'], visible = true) {
  await act(async () => {
    root.render(<NextIntlClientProvider locale="en" messages={en}>
      <Harness track={track} visible={visible} />
    </NextIntlClientProvider>)
  })
}

function form() {
  const current = capture.mock.lastCall?.[0]
  if (!current) throw new Error('The form did not render')
  return current
}

function select() {
  const element = container.querySelector<HTMLSelectElement>('select[name="licenseId"]')
  if (!element) throw new Error('The license select did not render')
  return element
}

async function loadLicenses() {
  await act(async () => { resolveLicenses(Response.json({ licenses })) })
}

beforeEach(() => {
  capture.mockClear()
  save.mockReset().mockResolvedValue({ ok: true, data: null })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const pendingLicenses = new Promise<Response>((resolve) => { resolveLicenses = resolve })
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    url === '/api/licenses' ? pendingLicenses : Response.json({})))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.unstubAllGlobals()
})

describe('license selection with asynchronous options', () => {
  it('shows the original default and submits a subsequent manual selection', async () => {
    await render('original')
    expect(select().value).toBe('')
    expect(select().disabled).toBe(true)
    await loadLicenses()
    expect(form().getValues('licenseId')).toBe(firstId)
    expect(select().value).toBe(firstId)

    await act(async () => {
      select().value = secondId
      select().dispatchEvent(new Event('change', { bubbles: true }))
      form().setValue('title', 'Hinge')
      form().setValue('categoryId', firstId)
      form().setValue('attested', true)
    })
    expect(select().value).toBe(secondId)
    await act(async () => { await form().submit(vi.fn()) })
    expect(save).toHaveBeenCalledWith({ operation: 'createOriginal', fields: {
      title: 'Hinge', categoryId: firstId, licenseId: secondId, attested: true,
    } })

    await render('original', false)
    await render('original')
    expect(select().value).toBe(secondId)
  })

  it.each(['original', 'elsewhere'] as const)('shows the restored %s license when options arrive later', async (track) => {
    await render(track)
    await act(async () => {
      form().reset({ ...EMPTY_PUBLISH_FORM, licenseId: secondId })
    })
    await loadLicenses()
    expect(form().getValues('licenseId')).toBe(secondId)
    expect(select().value).toBe(secondId)
  })

  it('keeps the elsewhere license blank until explicitly selected', async () => {
    await render('elsewhere')
    await loadLicenses()
    expect(form().getValues('licenseId')).toBe('')
    expect(select().value).toBe('')
  })
})
