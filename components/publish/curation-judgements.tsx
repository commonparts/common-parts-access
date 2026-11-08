'use client'

import type * as React from 'react'
import { useTranslations } from 'next-intl'
import { JudgementCheckbox } from '@/components/publish/judgement-checkbox'
import { CURATION_FLAGS } from '@/lib/curation/checklist'
import { FLAG_STEP } from '@/lib/publish/placement'
import type { PublishStepIndex } from '@/lib/publish/steps'
import type { CurationCriterionKey } from '@/types/database'
import type { PartUploadFormState } from '@/hooks/use-part-upload-form-state'

interface CurationCriterionProps {
  form: PartUploadFormState
  criterion: CurationCriterionKey
  hint?: React.ReactNode
}

/** A criterion stays next to the evidence it judges, across the existing steps. */
export function CurationCriterion({ form, criterion, hint }: CurationCriterionProps) {
  const t = useTranslations('CurationCriteria')
  return <JudgementCheckbox id={`criterion-${criterion}`} label={t(`${criterion}.label`)}
    description={t(`${criterion}.description`)} checked={form.formData.checklist[criterion] === true}
    onChange={(checked) => form.setValue(`checklist.${criterion}`, checked)} hint={hint} />
}

interface CompletenessFlagsProps {
  form: PartUploadFormState
  step: PublishStepIndex
}

/** Renders only the confirmations owned by this step's placement map. */
export function CompletenessFlags({ form, step }: CompletenessFlagsProps) {
  const t = useTranslations('CurationFlags')
  return CURATION_FLAGS.filter(column => FLAG_STEP[column] === step).map(column => (
    <JudgementCheckbox key={column} id={`flag-${column}`} label={t(`${column}.label`)}
      description={t(`${column}.description`)} checked={form.formData.confirmedFlags[column]}
      onChange={(checked) => form.setValue(`confirmedFlags.${column}`, checked)} />
  ))
}
