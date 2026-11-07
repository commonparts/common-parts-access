import * as React from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/native-select"
import { FileUploader } from "@/components/ui/file-uploader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BrandOption, CreateProductFormData } from "@/hooks/use-part-upload-form-state"

interface FlatCategoryOption {
  id: string
  label: string
}

interface CreateProductModalProps {
  open: boolean
  onClose: () => void
  brands: BrandOption[]
  categories: FlatCategoryOption[]
  data: CreateProductFormData
  error?: string | null
  loading?: boolean
  onChange: <K extends keyof CreateProductFormData>(field: K, value: CreateProductFormData[K]) => void
  onSubmit: () => void
}

export function CreateProductModal({
  open,
  onClose,
  brands,
  categories,
  data,
  error,
  loading = false,
  onChange,
  onSubmit,
}: CreateProductModalProps) {
  const t = useTranslations("CreateProductModal")
  // Rendered as null on the server (closed by default); the portal target
  // only exists in the browser.
  if (!open || typeof document === "undefined") return null

  // Portaled to <body> so the backdrop blur spans the whole viewport,
  // including the sticky navbar once it is "stuck" on its own compositing
  // layer (which a page-nested backdrop-filter cannot sample).
  return createPortal(
    <div className="fixed inset-0 z-60 overflow-y-auto bg-bg-overlay px-sm py-sm backdrop-blur-xs">
      <div className="flex min-h-full w-full items-start justify-center">
        <div className="w-full max-w-3xl">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-product-modal-title"
            className="flex max-h-dvh w-full flex-col border-muted shadow-2xl"
          >
            <CardHeader className="flex shrink-0 flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle id="create-product-modal-title">{t("title")}</CardTitle>
                <p className="text-sm text-text-secondary">{t("description")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t("cancel")}
              </Button>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {error && (
              <Alert>
                {error}
              </Alert>
            )}

            <div className="space-y-4" role="form" aria-label={t("submit")}>
              <div className="space-y-2">
                <Label htmlFor="create-name">{t("name")}</Label>
                <Input
                  id="create-name"
                  value={data.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder={t("namePlaceholder")}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-brand">{t("brand")}</Label>
                  <NativeSelect
                    id="create-brand"
                    value={data.brandId}
                    onChange={(e) => onChange("brandId", e.target.value)}
                    required
                  >
                    <option value="">{t("selectBrand")}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-category">{t("category")}</Label>
                  <NativeSelect
                    id="create-category"
                    value={data.categoryId}
                    onChange={(e) => onChange("categoryId", e.target.value)}
                    required
                  >
                    <option value="">{t("selectCategory")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">{t("productDescription")}</Label>
                <Textarea
                  id="create-description"
                  rows={3}
                  value={data.description || ""}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-year">{t("releaseYear")}</Label>
                  <Input
                    id="create-year"
                    type="number"
                    inputMode="numeric"
                    value={data.releaseYear || ""}
                    onChange={(e) => onChange("releaseYear", e.target.value)}
                    placeholder={t("releaseYearPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("image")}</Label>
                  <FileUploader
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple={false}
                    maxSize={5 * 1024 * 1024}
                    className="w-full"
                    onFilesSelect={(files) => onChange("imageFile", files[0] ?? null)}
                  />
                  {data.imageFile && (
                    <p className="text-sm text-text-secondary">{t("selected", { name: data.imageFile.name })}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={loading || !data.name || !data.brandId || !data.categoryId}
                >
                  {loading ? t("creating") : t("submit")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>,
    document.body,
  )
}
