import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { usePublishForm } from './use-publish-form'
import { EMPTY_PUBLISH_FORM, type PublishFormContext } from '@/lib/publish/form'
import { PUBLISH_STEPS } from '@/lib/publish/steps'
import en from '@/messages/en.json'

const save = vi.hoisted(() => vi.fn())
vi.mock('@/lib/actions/publish', () => ({ savePublication: save }))

const id = '11111111-1111-4111-8111-111111111111'
const initial = { ...EMPTY_PUBLISH_FORM, title: 'Hinge', categoryId: id, licenseId: id, attested: true,
  sourceUrl: 'https://printables.com/model/1', sourcePlatform: 'printables', originalAuthor: 'Designer',
  checklist: { eligibility: true } }

/** Instantiates the real hook without a DOM or another test dependency. */
function formFor(track: PublishFormContext['track']) {
  const captured = vi.fn<(form: ReturnType<typeof usePublishForm>) => void>()
  function Form() {
    captured(usePublishForm({ track, step: PUBLISH_STEPS.ORIGIN, draftId: null }))
    return null
  }
  renderToString(<NextIntlClientProvider locale="en" messages={en}><Form /></NextIntlClientProvider>)
  const form = captured.mock.calls[0]?.[0]
  if (!form) throw new Error('The form did not render')
  form.reset(initial)
  return form
}

beforeEach(() => { save.mockReset() })

describe('publication submission', () => {
  it('creates an original using the validated step payload and reports its identity', async () => {
    const form = formFor('original')
    save.mockResolvedValue({ ok: true, data: { id, slug: 'hinge' } })
    const created = vi.fn()
    expect(await form.submit(created)).toEqual({ ok: true, data: { id, slug: 'hinge' } })
    expect(created).toHaveBeenCalledWith({ id, slug: 'hinge' })
    expect(save).toHaveBeenCalledWith({ operation: 'createOriginal', fields: {
      title: 'Hinge', categoryId: id, licenseId: id, attested: true } })
  })

  it('does not call an action for an invalid attestation', async () => {
    const form = formFor('original')
    form.setValue('attested', false)
    expect((await form.submit(vi.fn())).ok).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps the created elsewhere identity when flushing its initial judgements fails', async () => {
    const form = formFor('elsewhere')
    save.mockResolvedValueOnce({ ok: true, data: { id, slug: 'hinge' } })
      .mockResolvedValueOnce({ ok: false, error: 'Save failed' })
    const created = vi.fn()
    expect(await form.submit(created)).toEqual({ ok: false, error: 'Save failed' })
    expect(created).toHaveBeenCalledWith({ id, slug: 'hinge' })
    expect(save).toHaveBeenNthCalledWith(2, expect.objectContaining({ operation: 'updateElsewhere', id,
      fields: expect.objectContaining({ categoryId: id, checklist: { eligibility: true }, needs_category: true }) }))
    expect(created.mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder[1])
  })

  it('returns transport failures through the form error instead of losing the session', async () => {
    const form = formFor('original')
    save.mockRejectedValue(new Error('Offline'))
    const created = vi.fn()
    expect(await form.submit(created)).toMatchObject({ ok: false, error: expect.any(String) })
    expect(created).not.toHaveBeenCalled()
  })
})
