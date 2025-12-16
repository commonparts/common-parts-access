import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 backdrop-blur-sm">
      <div className="mt-10 w-full max-w-3xl px-4">
        <Card className="shadow-2xl border-muted">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Create new product</CardTitle>
              <p className="text-sm text-muted-foreground">Prefilled from your current brand and category selections.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={data.description || ""}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder="Briefly describe the product"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="create-image">Image URL</Label>
                  <Input
                    id="create-image"
                    type="url"
                    value={data.imageUrl || ""}
                    onChange={(e) => onChange("imageUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    id="create-discontinued"
                    type="checkbox"
                    checked={Boolean(data.discontinued)}
                    onChange={(e) => onChange("discontinued", e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="create-discontinued">Discontinued</Label>
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
  )
}
