'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { Link } from '@/i18n/navigation'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CurationCriterion, CompletenessFlags } from '@/components/publish/curation-judgements'
import { PUBLISH_STEPS } from '@/lib/publish/steps'
import type { SourceUrlMatch } from '@/lib/supabase/queries/curation'

interface ElsewhereOriginStepProps {
  form: PartUploadFormState
  draftId: string | null
  duplicate: SourceUrlMatch | null
  checkingSource: boolean
  prefilledFields: ReadonlySet<string>
  children?: React.ReactNode
}

/** The elsewhere track's existing Origin fields and declarations. */
export function ElsewhereOriginStep({ form, draftId, duplicate, checkingSource, prefilledFields, children }: ElsewhereOriginStepProps): React.JSX.Element {
  const t = useTranslations('ElsewhereTrack')
  const flow = useTranslations('PublishFlow')
  const steps = useTranslations('PublishSteps')
  const { formData } = form
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{steps('origin')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2xs">
            <Label htmlFor="elsewhere-source-url">{t('sourceUrl')}</Label>
            <Input
              id="elsewhere-source-url"
              type="url"
              {...form.register('sourceUrl')}
              placeholder={t('sourceUrlPlaceholder')}
              disabled={Boolean(draftId)}
              required
            />
            {checkingSource && <p className="text-sm text-text-secondary">{t('checkingSource')}</p>}
            {draftId && <p className="text-sm text-text-secondary">{t('sourceFixed')}</p>}
          </div>

          {duplicate && (
            <Alert>
              {t.rich(duplicate.status === 'published' ? 'duplicatePublished' : 'duplicateDraft', {
                name: duplicate.name,
                part: (chunks) =>
                  duplicate.status === 'published' ? (
                    <Link href={`/parts/${duplicate.slug}`} className="font-medium underline">
                      {chunks}
                    </Link>
                  ) : (
                    <span className="font-medium">{chunks}</span>
                  ),
              })}
            </Alert>
          )}

          <CurationCriterion
            form={form}
            criterion="duplicate"
            hint={!duplicate && formData.sourceUrl.trim() && !checkingSource ? t('noDuplicate') : undefined}
          />

          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <Label htmlFor="elsewhere-title">{flow('title')}</Label>
              <Input
                id="elsewhere-title"
                {...form.register('title')}
                placeholder={flow('titlePlaceholder')}
                maxLength={VALIDATION_LIMITS.PART.TITLE_MAX_LENGTH}
                required
              />
            </div>
            <div className="space-y-2xs">
              <div className="flex items-center gap-2xs">
                <Label htmlFor="elsewhere-platform">{t('platform')}</Label>
                {prefilledFields.has('sourcePlatform') && <Badge variant="outline">{flow('prefilled')}</Badge>}
              </div>
              <NativeSelect
                id="elsewhere-platform"
                {...form.register('sourcePlatform')}
                required
              >
                <option value="">{t('selectPlatform')}</option>
                {form.sourcePlatforms.map((platform) => (
                  <option key={platform.slug} value={platform.slug}>
                    {platform.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2xs">
            <Label>{t('category')}</Label>
            <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
              {form.categoryLevels.map((level, idx) => (
                <NativeSelect
                  key={level.parentId ?? `root-${idx}`}
                  value={form.categoryPath[idx] ?? ''}
                  onChange={(e) => form.handleCategorySelect(idx, e.target.value)}
                  disabled={form.loadingMeta}
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
            <CompletenessFlags form={form} step={PUBLISH_STEPS.ORIGIN} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('attribution')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <div className="flex items-center gap-2xs">
                <Label htmlFor="elsewhere-author">{t('author')}</Label>
                {prefilledFields.has('originalAuthor') && <Badge variant="outline">{flow('prefilled')}</Badge>}
              </div>
              <Input
                id="elsewhere-author"
                {...form.register('originalAuthor')}
                placeholder={t('authorPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2xs">
              <div className="flex items-center gap-2xs">
                <Label htmlFor="elsewhere-author-url">{t('authorUrl')}</Label>
                {prefilledFields.has('originalAuthorUrl') && <Badge variant="outline">{flow('prefilled')}</Badge>}
              </div>
              <Input
                id="elsewhere-author-url"
                type="url"
                {...form.register('originalAuthorUrl')}
                placeholder={t('authorUrlPlaceholder')}
              />
            </div>
          </div>
          <CurationCriterion form={form} criterion="attribution" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('licenseAndFiles')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2xs">
            <div className="flex items-center gap-2xs">
              <Label htmlFor="elsewhere-license">{t('license')}</Label>
              {prefilledFields.has('licenseId') && <Badge variant="outline">{flow('prefilled')}</Badge>}
            </div>
            <NativeSelect
              id="elsewhere-license"
              {...form.register('licenseId')}
              value={formData.licenseId}
              required
            >
              <option value="">
                {form.loadingMeta ? flow('loadingLicenses') : t('selectLicense')}
              </option>
              {form.licenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {flow('licenseOption', { shortName: license.shortName, name: license.name })}
                </option>
              ))}
            </NativeSelect>
            <p className="text-sm text-text-secondary">{t('licenseHint')}</p>
          </div>

          <div className="rounded-md border border-border-subtle bg-bg-subtle p-sm">
            <p className="text-sm text-text-primary">{t('linkOut')}</p>
          </div>

          <CurationCriterion form={form} criterion="license" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('scope')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurationCriterion form={form} criterion="eligibility" hint={t('eligibilityHint')} />
        </CardContent>
      </Card>

      {children}
    </>
  )
}
