'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import type { ModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface CompatibilityStepProps {
  form: ModelUploadFormState
  idPrefix: string
  /** True when the publish gate requires a brand, not only a product. */
  brandRequired?: boolean
  /**
   * Adopts the product's category when one is picked. Kept to the elsewhere
   * track, where the category is often a best guess — on the original track
   * the contributor chose it deliberately at Origin and should keep it.
   */
  syncCategoryFromProduct?: boolean
  /** Aggregate demand context, elsewhere track only. */
  demandPanel?: React.ReactNode
  /** Inline judgements owned by this step. */
  judgements?: React.ReactNode
}

/**
 * The Compatibility step, shared by both tracks (issue #302).
 *
 * Brand comes first and gates the product picker on both tracks: products are
 * scoped to the brand and changing the brand clears the selection, so offering
 * the picker earlier would only invite choices the next click throws away.
 */
export function CompatibilityStep({
  form,
  idPrefix,
  brandRequired = false,
  syncCategoryFromProduct = false,
  demandPanel,
  judgements,
}: CompatibilityStepProps) {
  const { formData, setFormData } = form

  const productNames = React.useMemo(
    () => Object.fromEntries(form.products.map((p) => [p.id, p.name])),
    [form.products],
  )

  const atProductLimit = formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What does it fit?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <p className="text-sm text-text-secondary">
          A spare part is found by the device it repairs: visitors browse brand, then product, then
          parts. At least one product is required to publish.
        </p>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-brand`}>Brand{brandRequired ? ' *' : ''}</Label>
            <Combobox
              id={`${idPrefix}-brand`}
              placeholder={form.loadingMeta ? 'Loading brands…' : 'Search brands'}
              options={form.brands.map((b) => ({ id: b.id, name: b.name }))}
              searchTerm={form.brandSearch}
              onSearchChange={form.setBrandSearch}
              onSelect={(option) => {
                setFormData((prev) => ({ ...prev, brandId: option.id, productIds: [] }))
                form.setBrandSearch(option.name)
              }}
              isOpen={form.brandOpen}
              onOpenChange={form.setBrandOpen}
              disabled={form.loadingMeta}
              emptyMessage={form.brandSearch ? 'No matching brands' : 'No brands found'}
            />
            <p className="text-sm text-text-secondary">
              Brands are maintained by Common Parts. If yours is missing, send feedback.
            </p>
          </div>

          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-product`}>Compatible products *</Label>
            <Combobox
              id={`${idPrefix}-product`}
              placeholder={
                form.loadingProducts
                  ? 'Loading products…'
                  : !formData.brandId
                    ? 'Select a brand first'
                    : atProductLimit
                      ? `Maximum ${VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT} products reached`
                      : 'Search and add a product'
              }
              options={form.products
                .filter((p) => !formData.productIds.includes(p.id))
                .map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id ?? '' }))}
              searchTerm={form.productSearch}
              onSearchChange={form.setProductSearch}
              onSelect={(option) => {
                form.addProduct(option.id)
                if (syncCategoryFromProduct) {
                  form.setCategoryPathFromCategoryId((option as { categoryId?: string }).categoryId)
                }
              }}
              allowCreate={true}
              onCreate={form.handleOpenCreateProduct}
              createLabel={(value) => `Create product: ${value}`}
              isOpen={form.productOpen}
              onOpenChange={form.setProductOpen}
              disabled={form.loadingProducts || !formData.brandId || atProductLimit}
              emptyMessage={form.productSearch ? 'No matching products' : 'No products found'}
            />
            {formData.productIds.length > 0 && (
              <div className="mt-2xs flex flex-wrap gap-2xs">
                {formData.productIds.map((pid) => (
                  <Badge key={pid} variant="secondary">
                    {productNames[pid] ?? 'Product'}
                    <button
                      type="button"
                      onClick={() => form.removeProduct(pid)}
                      className="ml-2xs rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      aria-label={`Remove ${productNames[pid] ?? 'product'}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {demandPanel}

        {judgements && (
          <div className="space-y-sm border-t border-border-subtle pt-md">{judgements}</div>
        )}
      </CardContent>
    </Card>
  )
}
