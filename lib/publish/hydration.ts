import { EMPTY_PUBLISH_FORM, type PublishFormValues } from '@/lib/publish/form'
import { CURATION_FLAGS } from '@/lib/curation/checklist'
import type { UploadDraft } from '@/lib/supabase/queries/upload'
import type { CurationDraft } from '@/lib/supabase/queries/curation'

/** Restores saved metadata, links and judgements as the form's new defaults. */
export function draftFormValues(draft: UploadDraft | CurationDraft): PublishFormValues {
  const curated = 'curation_checklist' in draft ? draft : null
  return {
    ...EMPTY_PUBLISH_FORM,
    title: draft.name ?? '', description: draft.description ?? '', instructions: draft.instructions ?? '',
    categoryId: draft.category_id ?? '', licenseId: draft.license_id ?? '',
    productIds: draft.product_ids, tags: draft.tags ?? [],
    material: draft.material ?? '', color: draft.color ?? '',
    dimensionsLength: draft.dimensions?.length?.toString() ?? '',
    dimensionsWidth: draft.dimensions?.width?.toString() ?? '',
    dimensionsHeight: draft.dimensions?.height?.toString() ?? '', dimensionsUnit: draft.dimensions?.unit ?? 'mm',
    layerHeight: draft.print_settings?.layer_height?.toString() ?? '',
    infill: draft.print_settings?.infill?.toString() ?? '', supports: draft.print_settings?.supports ?? '',
    estimatedPrintTime: draft.estimated_print_time?.toString() ?? '',
    estimatedMaterialUsage: draft.estimated_material_usage?.toString() ?? '',
    attested: !curated && 'originality_attested' in draft && draft.originality_attested === true,
    sourceUrl: curated?.source_url ?? '', sourcePlatform: curated?.source_platform ?? '',
    originalAuthor: curated?.original_author ?? '', originalAuthorUrl: curated?.original_author_url ?? '',
    checklist: curated?.curation_checklist ?? {},
    confirmedFlags: Object.fromEntries(CURATION_FLAGS.map(column => [column, curated?.[column] !== true])) as PublishFormValues['confirmedFlags'],
    needsLegalReview: curated?.needs_legal_review === true, legalJustification: curated?.legal_review_justification ?? '',
  }
}
