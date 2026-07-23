import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownInput } from "@/components/ui/dropdown-input"
import { FileUploader } from "@/components/ui/file-uploader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  // Rendered as null on the server (closed by default); the portal target
  // only exists in the browser.
  if (!open || typeof document === "undefined") return null

  // Portaled to <body> so the backdrop blur spans the whole viewport,
  // including the sticky navbar once it is "stuck" on its own compositing
  // layer (which a page-nested backdrop-filter cannot sample).
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/70 px-sm py-sm backdrop-blur-sm">
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-brand">Brand *</Label>
                  <DropdownInput
                    as="select"
                    id="create-brand"
                    value={data.brandId}
                    onChange={(e) => onChange("brandId", e.target.value)}
                    required
                  >
                    <option value="">Select brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </DropdownInput>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-category">Category *</Label>
                  <DropdownInput
                    as="select"
                    id="create-category"
                    value={data.categoryId}
                    onChange={(e) => onChange("categoryId", e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </DropdownInput>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  rows={3}
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
    </div>,
    document.body,
  )
}
