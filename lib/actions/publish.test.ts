import { beforeEach, describe, expect, it, vi } from 'vitest'
import { savePublication, publishPublication } from './publish'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getUploadDraft: vi.fn(), getCurationDraft: vi.fn(),
  createUploadDraft: vi.fn(), createCurationDraft: vi.fn(), updateUploadDraft: vi.fn(), updateCurationDraft: vi.fn(),
  findPartBySourceUrl: vi.fn(), getLicenseById: vi.fn(), validateSourceUrlMatchesPlatform: vi.fn(),
  getSourcePlatformBySlug: vi.fn(), findProductLinkBlocker: vi.fn(), publishDraftPart: vi.fn(),
  isDraftCategoryValid: vi.fn(), areDraftProductsValid: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/supabase/queries/upload', () => ({ getUploadDraft: mocks.getUploadDraft,
  createUploadDraft: mocks.createUploadDraft, updateUploadDraft: mocks.updateUploadDraft }))
vi.mock('@/lib/supabase/queries/curation', () => ({ getCurationDraft: mocks.getCurationDraft,
  createCurationDraft: mocks.createCurationDraft, updateCurationDraft: mocks.updateCurationDraft,
  findPartBySourceUrl: mocks.findPartBySourceUrl }))
vi.mock('@/lib/supabase/queries/licenses', () => ({ getLicenseById: mocks.getLicenseById }))
vi.mock('@/lib/supabase/queries/platforms', () => ({ validateSourceUrlMatchesPlatform: mocks.validateSourceUrlMatchesPlatform,
  getSourcePlatformBySlug: mocks.getSourcePlatformBySlug }))
vi.mock('@/lib/supabase/queries/products', () => ({ findProductLinkBlocker: mocks.findProductLinkBlocker }))
vi.mock('@/lib/supabase/queries/publish', () => ({ publishDraftPart: mocks.publishDraftPart,
  isDraftCategoryValid: mocks.isDraftCategoryValid, areDraftProductsValid: mocks.areDraftProductsValid }))

const id = '11111111-1111-4111-8111-111111111111'
const owner = 'owner'
const draft = { id, user_id: owner, status: 'draft', slug: 'hinge', name: 'Hinge', category_id: id,
  license_id: id, originality_attested: true, model_file_count: 1, product_ids: [id] }
const curated = { ...draft, source_platform: 'printables', source_url: 'https://printables.com/model/1',
  file_hosting_type: 'link_out', model_file_count: 0, needs_legal_review: false,
  curation_checklist: { eligibility: true, product_target: true, license: true, file: true, attribution: true, duplicate: true } }
const originalCreate = { operation: 'createOriginal', fields: { title: 'Hinge', categoryId: id, licenseId: id, attested: true } } as const
const elsewhereCreate = { operation: 'createElsewhere', fields: { title: 'Hinge', sourceUrl: curated.source_url,
  sourcePlatform: 'printables', originalAuthor: 'Designer', licenseId: id } } as const

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: owner } } })
  mocks.getUploadDraft.mockResolvedValue(draft)
  mocks.getCurationDraft.mockResolvedValue(curated)
  mocks.getLicenseById.mockResolvedValue({ allows_commercial: true, allows_redistribution: true, spdx_id: 'CC-BY-4.0' })
  mocks.isDraftCategoryValid.mockResolvedValue(true)
  mocks.areDraftProductsValid.mockResolvedValue(true)
  mocks.validateSourceUrlMatchesPlatform.mockResolvedValue({ ok: true })
  mocks.findPartBySourceUrl.mockResolvedValue(null)
  mocks.findProductLinkBlocker.mockResolvedValue(null)
  mocks.publishDraftPart.mockResolvedValue(true)
  mocks.createUploadDraft.mockResolvedValue({ id, slug: 'hinge', user_id: owner })
  mocks.createCurationDraft.mockResolvedValue({ id, slug: 'hinge', user_id: owner })
})

describe('savePublication', () => {
  it('validates before authentication or database access', async () => {
    const result = await savePublication({ ...originalCreate, fields: { ...originalCreate.fields, title: 'x' } })
    expect(result.ok).toBe(false)
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.createUploadDraft).not.toHaveBeenCalled()
  })

  it.each([originalCreate, elsewhereCreate])('requires an authenticated user for $operation', async input => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(await savePublication(input)).toEqual({ ok: false, error: 'Sign in to continue' })
    expect(mocks.createUploadDraft).not.toHaveBeenCalled()
    expect(mocks.createCurationDraft).not.toHaveBeenCalled()
  })

  it('creates an original draft and exposes only its identity', async () => {
    expect(await savePublication(originalCreate)).toEqual({ ok: true, data: { id, slug: 'hinge' } })
    expect(mocks.createUploadDraft).toHaveBeenCalledWith(owner, { name: 'Hinge', categoryId: id, licenseId: id })
  })

  it('retains the original flow narrowing, even for fields a typed client cannot send', async () => {
    expect((await savePublication({ ...originalCreate, fields: { ...originalCreate.fields,
      // The upload schema checks forbidden fields before narrowing the record.
      originType: 'curated' } })).ok).toBe(false)
    expect(mocks.createUploadDraft).not.toHaveBeenCalled()
  })

  it('checks the hostable license before creating an original', async () => {
    mocks.getLicenseById.mockResolvedValue({ allows_commercial: false, allows_redistribution: true, spdx_id: 'CC-BY-NC-4.0' })
    expect((await savePublication(originalCreate)).ok).toBe(false)
    expect(mocks.createUploadDraft).not.toHaveBeenCalled()
  })

  it('allows a source license that cannot be hosted and detects visible duplicates', async () => {
    mocks.getLicenseById.mockResolvedValue({ allows_commercial: false, allows_redistribution: false, spdx_id: 'CC-BY-NC-ND-4.0' })
    expect(await savePublication(elsewhereCreate)).toEqual({ ok: true, data: { id, slug: 'hinge' } })
    mocks.findPartBySourceUrl.mockResolvedValue({ id, name: 'Existing', slug: 'existing', status: 'published' })
    expect(await savePublication(elsewhereCreate)).toMatchObject({ ok: false, duplicate: { slug: 'existing' } })
  })

  it('handles a source claimed by an invisible concurrent draft', async () => {
    mocks.createCurationDraft.mockRejectedValue({ code: '23505' })
    expect(await savePublication(elsewhereCreate)).toMatchObject({ ok: false, duplicate: null })
  })

  it('checks the source platform against the immutable source URL', async () => {
    mocks.validateSourceUrlMatchesPlatform.mockResolvedValue({ ok: false, error: 'sourcePlatformMismatch', status: 400 })
    expect((await savePublication(elsewhereCreate)).ok).toBe(false)
    expect(mocks.createCurationDraft).not.toHaveBeenCalled()
  })

  it.each(['updateOriginal', 'updateElsewhere'] as const)('checks ownership and track-scoped lookup for %s', async operation => {
    mocks.getUploadDraft.mockResolvedValue({ ...draft, user_id: 'someone-else' })
    mocks.getCurationDraft.mockResolvedValue(null)
    expect((await savePublication({ operation, id, fields: { title: 'Updated hinge' } })).ok).toBe(false)
    expect(mocks.updateUploadDraft).not.toHaveBeenCalled()
    expect(mocks.updateCurationDraft).not.toHaveBeenCalled()
  })

  it('persists only provided fields and clears empty metadata without dropping unrelated links', async () => {
    expect(await savePublication({ operation: 'updateOriginal', id, fields: { description: '', dimensions: '' } })).toEqual({ ok: true, data: null })
    expect(mocks.updateUploadDraft).toHaveBeenCalledWith(id, owner, { description: null, dimensions: null }, undefined)
  })

  it('refuses missing products and a legal review flag without a justification', async () => {
    mocks.areDraftProductsValid.mockResolvedValue(false)
    expect((await savePublication({ operation: 'updateOriginal', id, fields: { productIds: [id] } })).ok).toBe(false)
    expect((await savePublication({ operation: 'updateElsewhere', id, fields: { needs_legal_review: true } })).ok).toBe(false)
    expect(mocks.updateUploadDraft).not.toHaveBeenCalled()
    expect(mocks.updateCurationDraft).not.toHaveBeenCalled()
  })
})

describe('publishPublication', () => {
  it.each(['original', 'elsewhere'] as const)('authenticates before the %s gate', async track => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect((await publishPublication({ track, id })).ok).toBe(false)
    expect(mocks.publishDraftPart).not.toHaveBeenCalled()
  })

  it('rejects malformed ids before looking up a draft', async () => {
    expect((await publishPublication({ track: 'original', id: 'bad' })).ok).toBe(false)
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('returns original blockers without performing the privileged transition', async () => {
    mocks.getUploadDraft.mockResolvedValue({ ...draft, name: '', category_id: null, license_id: null,
      originality_attested: false, model_file_count: 0, product_ids: [] })
    const result = await publishPublication({ track: 'original', id })
    expect(result.ok).toBe(false)
    expect(result.blockers).toHaveLength(6)
    expect(mocks.publishDraftPart).not.toHaveBeenCalled()
  })

  it('keeps all curated checklist, hosting, legal and link conditions', async () => {
    mocks.getCurationDraft.mockResolvedValue({ ...curated, curation_checklist: {}, needs_legal_review: true,
      file_hosting_type: 'hosted', source_platform: null, license_id: null, model_file_count: 1, product_ids: [] })
    const result = await publishPublication({ track: 'elsewhere', id })
    expect(result.ok).toBe(false)
    expect(result.blockers).toHaveLength(7)
    expect(mocks.publishDraftPart).not.toHaveBeenCalled()
  })

  it.each(['original', 'elsewhere'] as const)('publishes a valid %s and handles a concurrent publication', async track => {
    expect(await publishPublication({ track, id })).toEqual({ ok: true, data: { slug: 'hinge' } })
    expect(mocks.publishDraftPart).toHaveBeenCalledWith(id, owner)
    mocks.publishDraftPart.mockResolvedValue(false)
    expect((await publishPublication({ track, id })).ok).toBe(false)
  })

  it('refuses a linked product without a brand', async () => {
    mocks.findProductLinkBlocker.mockResolvedValue('productWithoutBrand')
    const result = await publishPublication({ track: 'elsewhere', id })
    expect(result.ok).toBe(false)
    expect(result.blockers).toHaveLength(1)
    expect(mocks.publishDraftPart).not.toHaveBeenCalled()
  })
})
