'use client'

import * as React from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { Checkbox } from '@/components/ui/checkbox'
import { ATTESTATION_CLAUSES } from '@/lib/upload/attestation'
import { isHostableLicense } from '@/lib/utils/licenses'

interface OriginalOriginStepProps {
  form: PartUploadFormState
  draftId: string | null
  attestedAt: string | null
}

/** The original track's existing Origin fields and declarations. */
export function OriginalOriginStep({ form, draftId, attestedAt }: OriginalOriginStepProps): React.JSX.Element {
  const t = useTranslations('OriginalTrack')
  const flow = useTranslations('PublishFlow')
  const steps = useTranslations('PublishSteps')
  const attestation = useTranslations('Attestation')
  const format = useFormatter()
  const { formData, setValue } = form
  const { attested } = formData
  const hostableLicenses = form.licenses.filter(isHostableLicense)
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{steps('origin')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2xs">
            <Label htmlFor="original-title">{flow('title')}</Label>
            <Input
              id="original-title"
              {...form.register('title')}
              placeholder={flow('titlePlaceholder')}
              maxLength={VALIDATION_LIMITS.PART.TITLE_MAX_LENGTH}
              required
            />
          </div>

          <div className="space-y-2xs">
            <Label>{flow('category')}</Label>
            <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
              {form.categoryLevels.map((level, idx) => (
                <NativeSelect
                  key={level.parentId ?? `root-${idx}`}
                  value={form.categoryPath[idx] ?? ''}
                  onChange={(e) => form.handleCategorySelect(idx, e.target.value)}
                  disabled={form.loadingMeta}
                  required={idx === 0}
                >
                  <option value="">
                    {form.loadingMeta
                      ? flow('loadingCategories')
                      : idx === 0
                        ? flow('selectCategory')
                        : flow('refineCategory')}
                  </option>
                  {level.options.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </NativeSelect>
              ))}
            </div>
          </div>

          <div className="space-y-2xs">
            <Label htmlFor="original-license">{flow('license')}</Label>
            <NativeSelect
              id="original-license"
              {...form.register('licenseId')}
              value={formData.licenseId}
              disabled={form.loadingMeta}
              required
            >
              <option value="">
                {form.loadingMeta ? flow('loadingLicenses') : t('selectLicense')}
              </option>
              {hostableLicenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {flow('licenseOption', { shortName: license.shortName, name: license.name })}
                </option>
              ))}
            </NativeSelect>
            <p className="text-sm text-text-secondary">{t('licenseHint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{attestation('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-sm">
          <ul className="space-y-2xs text-sm text-text-secondary">
            {ATTESTATION_CLAUSES.map((clause) => (
              <li key={clause} className="flex gap-2xs">
                <span aria-hidden="true">{'—'}</span>
                <span>{attestation(`clauses.${clause}`)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-sm">
            <Checkbox
              id="original-attested"
              checked={attested}
              onCheckedChange={(checked) => setValue('attested', Boolean(checked))}
              disabled={Boolean(draftId)}
              aria-label={attestation('summary')}
            />
            <Label htmlFor="original-attested" className="text-text-primary">
              {attestation('summary')}
            </Label>
          </div>
          {draftId && (
            <p className="text-sm text-text-secondary">
              {attestedAt
                ? attestation('recordedOn', { date: format.dateTime(new Date(attestedAt), { dateStyle: 'long' }) })
                : attestation('recorded')}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
