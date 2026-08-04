'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownInput } from '@/components/ui/dropdown-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { COLOR_MAX_LENGTH, MATERIAL_MAX_LENGTH } from '@/lib/utils/model-metadata'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface DetailsStepProps {
  form: ModelUploadFormState
  /** Namespaces the DOM ids so both tracks can mount their own instance. */
  idPrefix: string
  /**
   * Field names whose current value still matches what was extracted from the
   * source, so a "Pre-filled" marker is shown. Empty on the original track.
   */
  prefilledFields?: ReadonlySet<string>
  /**
   * Publication-license control. Rendered here on the elsewhere track only —
   * the original track chose its license at Origin, where it gates draft
   * creation.
   */
  licenseControl?: React.ReactNode
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
  return (
    <div className="flex items-center gap-2xs">
      <Label htmlFor={htmlFor}>{children}</Label>
      {prefilled && <Badge variant="outline">Pre-filled</Badge>}
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
  licenseControl,
  flags,
}: DetailsStepProps) {
  const { formData, setFormData } = form
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
          <CardTitle className="text-base">Part details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2xs">
            <FieldLabel htmlFor={`${idPrefix}-description`} prefilled={isPrefilled('description')}>
              Short description
            </FieldLabel>
            <Textarea
              id={`${idPrefix}-description`}
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What the part is and what it fixes"
              maxLength={VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>
                {formData.description.length}/{VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2xs">
            <FieldLabel htmlFor={`${idPrefix}-instructions`} prefilled={isPrefilled('instructions')}>
              Instructions
            </FieldLabel>
            <Textarea
              id={`${idPrefix}-instructions`}
              rows={6}
              value={formData.instructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
              placeholder="How to print it, and how to fit it to the product"
              maxLength={VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>
                {formData.instructions.length}/{VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-tags`}>Tags</Label>
            <div className="flex gap-sm">
              <Input
                id={`${idPrefix}-tags`}
                value={form.tagInput}
                onChange={(e) => form.setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Enter a tag and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => form.addTag(form.tagInput)}
                disabled={!form.tagInput.trim()}
              >
                Add
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
                      className="ml-2xs rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {licenseControl}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Print metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <FieldLabel htmlFor={`${idPrefix}-material`} prefilled={isPrefilled('material')}>
                Material
              </FieldLabel>
              <Input
                id={`${idPrefix}-material`}
                value={formData.material}
                onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                placeholder="e.g. PLA, PETG, ABS"
                maxLength={MATERIAL_MAX_LENGTH}
              />
            </div>
            <div className="space-y-2xs">
              <Label htmlFor={`${idPrefix}-color`}>Color</Label>
              <Input
                id={`${idPrefix}-color`}
                value={formData.color}
                onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                placeholder="e.g. Black, White, Any"
                maxLength={COLOR_MAX_LENGTH}
              />
            </div>
          </div>

          <fieldset className="space-y-2xs">
            <legend className="text-sm font-medium text-text-primary">Dimensions</legend>
            <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-length`}>Length</Label>
                <Input
                  id={`${idPrefix}-dim-length`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensionsLength}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsLength: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-width`}>Width</Label>
                <Input
                  id={`${idPrefix}-dim-width`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensionsWidth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsWidth: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-height`}>Height</Label>
                <Input
                  id={`${idPrefix}-dim-height`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensionsHeight}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsHeight: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-dim-unit`}>Unit</Label>
                <DropdownInput
                  as="select"
                  id={`${idPrefix}-dim-unit`}
                  value={formData.dimensionsUnit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsUnit: e.target.value }))}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </DropdownInput>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2xs">
            <legend className="text-sm font-medium text-text-primary">Print settings</legend>
            <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
              <div className="space-y-2xs">
                <FieldLabel htmlFor={`${idPrefix}-layer-height`} prefilled={isPrefilled('layerHeight')}>
                  Layer height (mm)
                </FieldLabel>
                <Input
                  id={`${idPrefix}-layer-height`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.layerHeight}
                  onChange={(e) => setFormData((prev) => ({ ...prev, layerHeight: e.target.value }))}
                  placeholder="e.g. 0.2"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-infill`}>Infill (%)</Label>
                <Input
                  id={`${idPrefix}-infill`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.infill}
                  onChange={(e) => setFormData((prev) => ({ ...prev, infill: e.target.value }))}
                  placeholder="e.g. 20"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor={`${idPrefix}-supports`}>Supports</Label>
                <DropdownInput
                  as="select"
                  id={`${idPrefix}-supports`}
                  value={formData.supports}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supports: e.target.value }))}
                >
                  <option value="">Not specified</option>
                  <option value="none">None</option>
                  <option value="buildplate_only">Build plate only</option>
                  <option value="everywhere">Everywhere</option>
                </DropdownInput>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-2xs">
              <FieldLabel htmlFor={`${idPrefix}-print-time`} prefilled={isPrefilled('estimatedPrintTime')}>
                Estimated print time (minutes)
              </FieldLabel>
              <Input
                id={`${idPrefix}-print-time`}
                type="number"
                min="0"
                step="1"
                value={formData.estimatedPrintTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, estimatedPrintTime: e.target.value }))}
                placeholder="e.g. 120"
              />
            </div>
            <div className="space-y-2xs">
              <FieldLabel
                htmlFor={`${idPrefix}-material-usage`}
                prefilled={isPrefilled('estimatedMaterialUsage')}
              >
                Estimated material usage (grams)
              </FieldLabel>
              <Input
                id={`${idPrefix}-material-usage`}
                type="number"
                min="0"
                step="0.1"
                value={formData.estimatedMaterialUsage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, estimatedMaterialUsage: e.target.value }))
                }
                placeholder="e.g. 45"
              />
            </div>
          </div>

          {flags}
        </CardContent>
      </Card>
    </>
  )
}
