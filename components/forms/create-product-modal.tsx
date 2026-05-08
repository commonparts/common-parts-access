import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploader } from "@/components/ui/file-uploader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BrandOption, CreateProductFormData } from "@/hooks/use-model-upload-form-state"

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
  onChange: (field: keyof CreateProductFormData, value: any) => void
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/70 px-sm py-sm backdrop-blur-sm">
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
                <CardTitle id="create-product-modal-title">Create new product</CardTitle>
                <p className="text-sm text-muted-foreground">Prefilled from your current brand and category selections.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4" role="form" aria-label="Create product">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Product name *</Label>
                  <Input
                    id="create-name"
                    value={data.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-model">Model number</Label>
                  <Input
                    id="create-model"
                    value={data.modelNumber || ""}
                    onChange={(e) => onChange("modelNumber", e.target.value)}
                    placeholder="e.g., XR-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-brand">Brand *</Label>
                  <select
                    id="create-brand"
                    className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
                    value={data.brandId}
                    onChange={(e) => onChange("brandId", e.target.value)}
                    required
                  >
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-category">Category *</Label>
                  <select
                    id="create-category"
                    className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
                    value={data.categoryId}
                    onChange={(e) => onChange("categoryId", e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <textarea
                  id="create-description"
                  rows={3}
                  className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface placeholder:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
                  value={data.description || ""}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder="Briefly describe the product"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-year">Release year</Label>
                  <Input
                    id="create-year"
                    type="number"
                    inputMode="numeric"
                    value={data.releaseYear || ""}
                    onChange={(e) => onChange("releaseYear", e.target.value)}
                    placeholder="e.g., 2023"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product image (optional)</Label>
                  <FileUploader
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple={false}
                    maxSize={5 * 1024 * 1024}
                    className="w-full"
                    onFilesSelect={(files) => onChange("imageFile", files[0] ?? null)}
                  />
                  {data.imageFile && (
                    <p className="text-sm text-muted-foreground">Selected: {data.imageFile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={loading || !data.name || !data.brandId || !data.categoryId}
                >
                  {loading ? "Creating..." : "Create product"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
