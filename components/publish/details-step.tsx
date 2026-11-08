'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { COLOR_MAX_LENGTH, DIMENSION_UNITS, MATERIAL_MAX_LENGTH, SUPPORT_TYPES } from '@/lib/utils/part-metadata'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface DetailsStepProps {
  form: PartUploadFormState
  /** Namespaces the DOM ids so both tracks can mount their own instance. */
  idPrefix: string
  /**
   * Field names whose current value still matches what was extracted from the
   * source, so a "Pre-filled" marker is shown. Empty on the original track.
   */
  prefilledFields?: ReadonlySet<string>
  /** Inline completeness confirmations owned by this step. */
  flags?: React.ReactNode
}

/** Small helper so each labelled field can carry its pre-fill marker. */
function FieldLabel({
  htmlFor,
  children,
  prefilled,
}: {
  htmlFor: string
  children: React.ReactNode
  prefilled?: boolean
}) {
  const t = useTranslations('PublishFlow')
  return (
    <div className="flex items-center gap-2xs">
      <Label htmlFor={htmlFor}>{children}</Label>
      {prefilled && <Badge variant="outline">{t('prefilled')}</Badge>}
    </div>
  )
}

/**
 * The Details step, identical on both tracks (issue #302): what the part is,
 * how to fit it, and how to print it.
 *
 * The two tracks converged on the same field set — tags included, which the
 * elsewhere track's PATCH endpoint already accepted — so this is one component
 * rather than two that drift.
 */
export function DetailsStep({
  form,
  idPrefix,
  prefilledFields,
  flags,
}: DetailsStepProps) {
  const t = useTranslations('DetailsStep')
  const { formData } = form
  const isPrefilled = (field: string) => prefilledFields?.has(field) === true

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      form.addTag(form.tagInput)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2xs">
            <FieldLabel htmlFor={`${idPrefix}-description`} prefilled={isPrefilled('description')}>
              {t('description')}
            </FieldLabel>
            <Textarea
              id={`${idPrefix}-description`}
              rows={3}
              {...form.register('description')}
              placeholder={t('descriptionPlaceholder')}
              maxLength={VALIDATION_LIMITS.PART.DESCRIPTION_MAX_LENGTH}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>
                {formData.description.length}/{VALIDATION_LIMITS.PART.DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2xs">
            <FieldLabel htmlFor={`${idPrefix}-instructions`} prefilled={isPrefilled('instructions')}>
              {t('instructions')}
            </FieldLabel>
            <Textarea
              id={`${idPrefix}-instructions`}
              rows={6}
              {...form.register('instructions')}
              placeholder={t('instructionsPlaceholder')}
              maxLength={VALIDATION_LIMITS.PART.INSTRUCTIONS_MAX_LENGTH}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>
                {formData.instructions.length}/{VALIDATION_LIMITS.PART.INSTRUCTIONS_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-tags`}>{t('tags')}</Label>
            <div className="flex gap-sm">
              <Input
                id={`${idPrefix}-tags`}
                value={form.tagInput}
                onChange={(e) => form.setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={t('tagPlaceholder')}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => form.addTag(form.tagInput)}
                disabled={!form.tagInput.trim()}
              >
                {t('addTag')}
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2xs flex flex-wrap gap-2xs">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="soft">
                    {tag}
                    <button
                      type="button"
                      onClick={() => form.removeTag(tag)}
                      className="ml-2xs rounded-full hover:text-status-errorText focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      aria-label={t('removeTag', { tag })}
                    >
                      {'×'}
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('printMetadata')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <FieldLabel htmlFor={`${idPrefix}-material`} prefilled={isPrefilled('material')}>
                {t('material')}
              </FieldLabel>
              <Input
                id={`${idPrefix}-material`}
                {...form.register('material')}
                placeholder={t('materialPlaceholder')}
                maxLength={MATERIAL_MAX_LENGTH}
              />
            </div>
            <div className="space-y-2xs">
              <Label htmlFor={`${idPrefix}-color`}>{t('color')}</Label>
              <Input
                id={`${idPrefix}-color`}
                {...form.register('color')}
                placeholder={t('colorPlaceholder')}
                maxLength={COLOR_MAX_LENGTH}
              />
            </div>
          </div>

          <fieldset className="space-y-2xs">
            <legend className="text-sm font-medium text-text-primary">{t('dimensions')}</legend>
            <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-length`}>{t('length')}</Label>
                <Input
                  id={`${idPrefix}-dim-length`}
                  type="number"
                  min="0"
                  step="0.1"
                  {...form.register('dimensionsLength')}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-width`}>{t('width')}</Label>
                <Input
                  id={`${idPrefix}-dim-width`}
                  type="number"
                  min="0"
                  step="0.1"
                  {...form.register('dimensionsWidth')}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-height`}>{t('height')}</Label>
                <Input
                  id={`${idPrefix}-dim-height`}
                  type="number"
                  min="0"
                  step="0.1"
                  {...form.register('dimensionsHeight')}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-unit`}>{t('unit')}</Label>
                <NativeSelect
                  id={`${idPrefix}-dim-unit`}
                  {...form.register('dimensionsUnit')}
                >
                  {DIMENSION_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {t(`units.${unit}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2xs">
            <legend className="text-sm font-medium text-text-primary">{t('printSettings')}</legend>
            <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
              <div className="space-y-2xs">
                <FieldLabel htmlFor={`${idPrefix}-layer-height`} prefilled={isPrefilled('layerHeight')}>
                  {t('layerHeight')}
                </FieldLabel>
                <Input
                  id={`${idPrefix}-layer-height`}
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('layerHeight')}
                  placeholder={t('layerHeightPlaceholder')}
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-infill`}>{t('infill')}</Label>
                <Input
                  id={`${idPrefix}-infill`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  {...form.register('infill')}
                  placeholder={t('infillPlaceholder')}
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-supports`}>{t('supports')}</Label>
                <NativeSelect
                  id={`${idPrefix}-supports`}
                  {...form.register('supports')}
                >
                  <option value="">{t('supportsUnset')}</option>
                  {SUPPORT_TYPES.map((support) => (
                    <option key={support} value={support}>
                      {t(`supportTypes.${support}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <FieldLabel htmlFor={`${idPrefix}-print-time`} prefilled={isPrefilled('estimatedPrintTime')}>
                {t('printTime')}
              </FieldLabel>
              <Input
                id={`${idPrefix}-print-time`}
                type="number"
                min="0"
                step="1"
                {...form.register('estimatedPrintTime')}
                placeholder={t('printTimePlaceholder')}
              />
            </div>
            <div className="space-y-2xs">
              <FieldLabel
                htmlFor={`${idPrefix}-material-usage`}
                prefilled={isPrefilled('estimatedMaterialUsage')}
              >
                {t('materialUsage')}
              </FieldLabel>
              <Input
                id={`${idPrefix}-material-usage`}
                type="number"
                min="0"
                step="0.1"
                {...form.register('estimatedMaterialUsage')}
                placeholder={t('materialUsagePlaceholder')}
              />
            </div>
          </div>

          {flags}
        </CardContent>
      </Card>
    </>
  )
}
