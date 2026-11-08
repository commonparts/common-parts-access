import { describe, expect, it } from 'vitest'
import { createFormControl } from 'react-hook-form'
import { draftFormValues } from './hydration'
import { EMPTY_PUBLISH_FORM } from './form'
import type { UploadDraft } from '@/lib/supabase/queries/upload'
import type { CurationDraft } from '@/lib/supabase/queries/curation'

const original: UploadDraft = {
  id: 'draft', user_id: 'owner', name: 'Hinge', slug: 'hinge', description: 'Description', instructions: null,
  status: 'draft', origin_type: 'original', category_id: 'category', license_id: 'license', tags: ['hinge'],
  thumbnail_url: null, images: [], verification_status: 'unverified', file_hosting_type: 'hosted',
  material: 'PLA', color: null, dimensions: { length: 0, width: 15, unit: 'cm' },
  print_settings: { layer_height: 0.2, infill: 0, supports: 'none' }, estimated_print_time: 120,
  estimated_material_usage: 0, originality_attested: true, originality_attested_at: '2026-11-08T00:00:00Z',
  created_at: null, updated_at: null, product_ids: ['product-a', 'product-b'], model_file_count: 1, image_file_count: 0,
}

describe('draft form hydration', () => {
  it('restores original draft fields, including zero-valued metadata and products from several brands', () => {
    expect(draftFormValues(original)).toMatchObject({ title: 'Hinge', categoryId: 'category', licenseId: 'license',
      productIds: ['product-a', 'product-b'], tags: ['hinge'], attested: true, instructions: '',
      dimensionsLength: '0', dimensionsWidth: '15', dimensionsHeight: '', dimensionsUnit: 'cm',
      infill: '0', layerHeight: '0.2', estimatedMaterialUsage: '0', files: [], thumbnails: [] })
  })

  it('resets all values and judgements together when resuming an elsewhere draft', () => {
    const curated: CurationDraft = { ...original, origin_type: 'curated', file_hosting_type: 'link_out',
      source_url: 'https://printables.com/model/1', source_platform: 'printables', original_author: 'Designer', original_author_url: null,
      needs_category: false, needs_photo: true, needs_print_settings: false, needs_instructions: true, needs_verification: true,
      needs_legal_review: true, legal_review_justification: 'Review this source', curation_checklist: { eligibility: true, file: true } }
    const control = createFormControl({ defaultValues: EMPTY_PUBLISH_FORM })
    const unsubscribe = control.subscribe({ formState: { values: true }, callback: () => {} })
    control.reset(draftFormValues(curated))
    expect(control.getValues()).toMatchObject({ sourcePlatform: 'printables', originalAuthor: 'Designer',
      checklist: { eligibility: true, file: true }, confirmedFlags: { needs_category: true, needs_photo: false,
        needs_print_settings: true, needs_instructions: false, needs_verification: false },
      needsLegalReview: true, legalJustification: 'Review this source', attested: false })
    unsubscribe()
  })
})
