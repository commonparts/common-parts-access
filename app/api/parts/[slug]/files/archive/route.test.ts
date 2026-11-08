import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import licenseTexts from '@/assets/license-texts.json'
import { PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'

const { from, select, eq, order, limit, download, recordDownload } = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), download: vi.fn(), recordDownload: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from, storage: { from: () => ({ download }) } }),
}))
vi.mock('@/lib/supabase/queries/part-metrics', () => ({ recordPartDownloadForPart: recordDownload }))

const { GET } = await import('./route')
const license = { name: 'Creative Commons Attribution 4.0 International', spdx_id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }
const file = { id: 'file-1', original_filename: 'handle.stl', filename: 'handle.stl', upload_path: 'user/part-1/files/handle.stl' }
const part = {
  id: 'part-1', name: 'Replacement handle', original_author: 'Original maker',
  original_author_url: 'https://example.org/maker', source_url: 'https://example.org/part',
  user_profiles: { display_name: 'Contributor', username: 'contributor' }, licenses: license, part_files: [file],
}
type PartFixture = Omit<typeof part, 'licenses'> & { licenses: typeof license | null }
let partResult: { data: PartFixture | null; error: Error | null }

async function request(): Promise<Response> {
  return GET(new Request('https://example.org/api/parts/handle/files/archive'), { params: Promise.resolve({ slug: 'handle' }) })
}

/** Reads the actual response ZIP so assertions cover archive layout and serialized bytes. */
async function archive(): Promise<JSZip> {
  const response = await request()
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('application/zip')
  expect(response.headers.get('Content-Disposition')).toContain('Replacement-handle.zip')
  return JSZip.loadAsync(await response.arrayBuffer())
}

describe('part archive with license', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    vi.clearAllMocks()
    partResult = { data: { ...part }, error: null }
    const builder = { select, eq, order, limit, maybeSingle: async () => partResult }
    from.mockReturnValue(builder)
    for (const method of [select, eq, order, limit]) method.mockReturnValue(builder)
    download.mockResolvedValue({ data: new Blob(['model bytes']), error: null })
    recordDownload.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('includes the full license with attribution beside unchanged nested models and tracks once', async () => {
    const zip = await archive()
    const notice = await zip.file('Replacement-handle/LICENSE.txt')!.async('string')
    expect(notice).toContain('Author: Original maker\n')
    expect(notice).toContain('Author URL: https://example.org/maker\n')
    expect(notice).toContain('Source: https://example.org/part\n')
    expect(notice).toContain('SPDX-License-Identifier: CC-BY-4.0\n')
    expect(notice).toContain(`License URL: ${license.url}\n`)
    expect(notice).toContain(licenseTexts['CC-BY-4.0'])
    expect(notice).not.toContain('Contributor')
    expect(await zip.file('Replacement-handle/files/handle.stl')!.async('string')).toBe('model bytes')
    expect(from).toHaveBeenCalledExactlyOnceWith('parts')
    expect(select).toHaveBeenCalledWith(expect.stringContaining('part_files(id, original_filename, filename, upload_path)'))
    expect(eq.mock.calls).toEqual([['slug', 'handle'], ['status', 'published'], ['part_files.file_category', 'model']])
    expect(order).toHaveBeenCalledExactlyOnceWith('created_at', { referencedTable: 'part_files', ascending: true })
    expect(limit).toHaveBeenCalledExactlyOnceWith(PART_UPLOAD_LIMITS.maxModelFiles * 10 + 1, { referencedTable: 'part_files' })
    expect(recordDownload).toHaveBeenCalledExactlyOnceWith('part-1', null)
  })

  it.each(Object.keys(licenseTexts))('bundles the complete %s text offline', async (spdx_id) => {
    partResult.data = { ...part, licenses: { ...license, spdx_id } }
    const zip = await archive()
    const texts: Record<string, string> = licenseTexts
    expect(await zip.file('Replacement-handle/LICENSE.txt')!.async('string')).toContain(texts[spdx_id])
  })

  it.each([
    [{ display_name: 'Public maker', username: 'maker' }, 'Public maker'],
    [{ display_name: '', username: 'maker' }, 'maker'],
  ])('uses public uploader attribution when there is no original author: %j', async (user_profiles, author) => {
    partResult.data = { ...part, original_author: '', user_profiles }
    const zip = await archive()
    const notice = await zip.file('Replacement-handle/LICENSE.txt')!.async('string')
    expect(notice).toContain(`Author: ${author}\n`)
    expect(notice).not.toContain('Author URL:')
  })

  it.each(['LICENSE.txt', 'LICENSE.txt/notice.txt', 'license.TXT', 'license.TXT/notice.txt'])('preserves uploaded %s and chooses an unused notice path', async (path) => {
    partResult.data = { ...part, part_files: [
      { ...file, upload_path: `user/part-1/${path}` },
      { ...file, id: 'file-2', upload_path: 'user/part-1/_LICENSE.txt' },
    ] }
    const zip = await archive()
    expect(await zip.file(`Replacement-handle/${path}`)!.async('string')).toBe('model bytes')
    expect(await zip.file('Replacement-handle/_LICENSE.txt')!.async('string')).toBe('model bytes')
    expect(await zip.file('Replacement-handle/__LICENSE.txt')!.async('string')).toContain(licenseTexts['CC-BY-4.0'])
  })

  it('includes an explicit notice when license metadata is missing', async () => {
    partResult.data = { ...part, licenses: null }
    const zip = await archive()
    const notice = await zip.file('Replacement-handle/LICENSE.txt')!.async('string')
    expect(notice).toContain('No license information is available')
    expect(notice).not.toContain(license.url)
  })

  it('keeps unknown licenses and links to their terms without substituting another license', async () => {
    partResult.data = { ...part, licenses: { name: 'New license', spdx_id: 'NEW-1.0', url: 'https://example.org/license' } }
    const zip = await archive()
    const notice = await zip.file('Replacement-handle/LICENSE.txt')!.async('string')
    expect(notice).toContain('SPDX-License-Identifier: NEW-1.0')
    expect(notice).toContain('License URL: https://example.org/license')
    expect(notice).toContain('The full license text is not bundled')
  })

  it('returns 404 for an unpublished/missing part without downloading or logging', async () => {
    partResult.data = null
    expect((await request()).status).toBe(404)
    expect(from).toHaveBeenCalledExactlyOnceWith('parts')
    expect(download).not.toHaveBeenCalled()
    expect(recordDownload).not.toHaveBeenCalled()
  })

  it('returns 404 when no model files exist', async () => {
    partResult.data = { ...part, part_files: [] }
    expect((await request()).status).toBe(404)
    expect(recordDownload).not.toHaveBeenCalled()
  })

  it('refuses overflow instead of truncating the archive', async () => {
    partResult.data = { ...part, part_files: Array.from({ length: PART_UPLOAD_LIMITS.maxModelFiles * 10 + 1 }, () => file) }
    expect((await request()).status).toBe(422)
    expect(download).not.toHaveBeenCalled()
    expect(recordDownload).not.toHaveBeenCalled()
  })

  it('does not serve a license-only ZIP when all storage downloads fail', async () => {
    download.mockResolvedValue({ data: null, error: new Error('Storage unavailable') })
    expect((await request()).status).toBe(503)
    expect(recordDownload).not.toHaveBeenCalled()
  })

  it('returns 500 on database failures', async () => {
    partResult.error = new Error('Database unavailable')
    expect((await request()).status).toBe(500)
    expect(download).not.toHaveBeenCalled()
    expect(recordDownload).not.toHaveBeenCalled()
  })

  it('serves the archive even when anonymous tracking fails', async () => {
    recordDownload.mockRejectedValue(new Error('Tracking unavailable'))
    const zip = await archive()
    expect(zip.file('Replacement-handle/LICENSE.txt')).not.toBeNull()
  })
})
