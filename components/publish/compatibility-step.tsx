'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import type { PartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface CompatibilityStepProps {
  form: PartUploadFormState
  idPrefix: string
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
 * Brand comes first and gates the product picker on both tracks: the picker
 * lists one brand's catalog at a time, so offering it before a brand is
 * chosen would only invite choices with nothing to choose from.
 *
 * The brand itself is not stored on the part (issue #315). It is a filter over
 * the product catalog, and the part is filed under whichever brands its linked
 * products belong to — which is why switching brands keeps the products
 * already picked instead of clearing them: that is how one part is linked to a
 * Bosch machine and a Siemens one.
 */
export function CompatibilityStep({
  form,
  idPrefix,
  syncCategoryFromProduct = false,
  demandPanel,
  judgements,
}: CompatibilityStepProps) {
  const t = useTranslations('CompatibilityStep')
  const { formData } = form

  const atProductLimit = formData.productIds.length >= VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <p className="text-sm text-text-secondary">{t('intro')}</p>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-brand`}>{t('brand')}</Label>
            <Combobox
              id={`${idPrefix}-brand`}
              placeholder={form.loadingMeta ? t('loadingBrands') : t('searchBrands')}
              options={form.brands.map((b) => ({ id: b.id, name: b.name }))}
              searchTerm={form.brandSearch}
              onSearchChange={form.setBrandSearch}
              onSelect={(option) => {
                form.setValue('brandId', option.id)
                form.setBrandSearch(option.name)
              }}
              isOpen={form.brandOpen}
              onOpenChange={form.setBrandOpen}
              disabled={form.loadingMeta}
              emptyMessage={form.brandSearch ? t('noMatchingBrands') : t('noBrands')}
            />
            <p className="text-sm text-text-secondary">{t('brandHint')}</p>
          </div>

          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-product`}>{t('products')}</Label>
            <Combobox
              id={`${idPrefix}-product`}
              placeholder={
                form.loadingProducts
                  ? t('loadingProducts')
                  : !formData.brandId
                    ? t('brandFirst')
                    : atProductLimit
                      ? t('productLimit', { max: VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT })
                      : t('searchProducts')
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
              createLabel={(value) => t('createProduct', { name: value })}
              isOpen={form.productOpen}
              onOpenChange={form.setProductOpen}
              disabled={form.loadingProducts || !formData.brandId || atProductLimit}
              emptyMessage={form.productSearch ? t('noMatchingProducts') : t('noProducts')}
            />
            {formData.productIds.length > 0 && (
              <div className="mt-2xs flex flex-wrap gap-2xs">
                {formData.productIds.map((pid) => (
                  <Badge key={pid} variant="soft">
                    {form.productNames[pid] ?? t('product')}
                    <button
                      type="button"
                      onClick={() => form.removeProduct(pid)}
                      className="ml-2xs rounded-full hover:text-status-errorText focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      aria-label={t('removeProduct', { name: form.productNames[pid] ?? t('product') })}
                    >
                      {'×'}
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
