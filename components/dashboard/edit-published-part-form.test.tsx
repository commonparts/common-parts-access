// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { NextIntlClientProvider } from 'next-intl'
import { expect, it, vi } from 'vitest'
import { EditPublishedPartForm } from './edit-published-part-form'
import fr from '@/messages/fr.json'

const { save, upload, replace } = vi.hoisted(() => ({ save: vi.fn(), upload: vi.fn(), replace: vi.fn() }))
vi.mock('@/lib/actions/part-edit', () => ({ editPublishedPart: save }))
vi.mock('@/lib/storage/client-upload', () => ({ uploadFilesFromClient: upload }))
vi.mock('@/components/part/part-thumbnail', () => ({ PartThumbnail: () => null }))
vi.mock('@/i18n/navigation', () => ({ Link: () => null, useRouter: () => ({ replace }) }))

it('submits removed and added photos together and reuses the upload on retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  const part = {
    id: 'part-id', slug: 'clip', name: 'Clip', description: '', instructions: '', revision: '',
    images: [{ reference: 'model-thumbnails/cover.png', url: '/cover.png' }],
  }
  const file = new File(['image'], 'added.png', { type: 'image/png' })
  const uploaded = { path: 'user-id/part-id/thumbnails/added.png', originalName: file.name }
  upload.mockResolvedValue({ thumbnails: [uploaded] })
  save.mockResolvedValueOnce({ ok: false, error: 'Réessayez.' }).mockResolvedValueOnce({ ok: true, data: null })

  try {
    await act(async () => root.render(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <EditPublishedPartForm part={part} userId="user-id" />
      </NextIntlClientProvider>,
    ))
    const remove = container.querySelector<HTMLButtonElement>('button[aria-label="Retirer Image 1"]')!
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const form = container.querySelector<HTMLFormElement>('form')!

    await act(async () => remove.click())
    Object.defineProperty(input, 'files', { value: [file] })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    expect(upload).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()

    const submit = () => act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    await submit()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Réessayez.')
    expect(replace).not.toHaveBeenCalled()

    await submit()
    expect(upload).toHaveBeenCalledExactlyOnceWith({ userId: 'user-id', partId: part.id, modelFiles: [], thumbnails: [file] })
    expect(save).toHaveBeenNthCalledWith(2, expect.objectContaining({
      id: part.id, removedImages: [part.images[0].reference], files: [uploaded],
    }))
    expect(replace).toHaveBeenCalledWith('/parts/clip')
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
