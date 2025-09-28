import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductFormData {
  name: string
  description: string
  brandId: string
  category: string
  model: string
  year?: string
  specifications: Record<string, string>
  images: File[]
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  brands?: Array<{ id: string; name: string }>
  onSubmit: (data: ProductFormData) => void
  loading?: boolean
  className?: string
}

export function ProductForm({ 
  initialData, 
  brands = [], 
  onSubmit, 
  loading = false, 
  className 
}: ProductFormProps) {
  const [formData, setFormData] = React.useState<ProductFormData>({
    name: "",
    description: "",
    brandId: "",
    category: "",
    model: "",
    specifications: {},
    images: [],
    ...initialData
  })

  const [specKey, setSpecKey] = React.useState("")
  const [specValue, setSpecValue] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const updateField = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey.trim()]: specValue.trim()
        }
      }))
      setSpecKey("")
      setSpecValue("")
    }
  }

  const removeSpecification = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specifications }
      delete newSpecs[key]
      return { ...prev, specifications: newSpecs }
    })
  }

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({ ...prev, images: files }))
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the product..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand *</Label>
              <select
                id="brandId"
                value={formData.brandId}
                onChange={(e) => updateField('brandId', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select category</option>
                <option value="vehicle">Vehicle</option>
                <option value="component">Component</option>
                <option value="tool">Tool</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                type="text"
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="Model number/name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="text"
                value={formData.year || ''}
                onChange={(e) => updateField('year', e.target.value)}
                placeholder="e.g., 2023"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Specification name"
              value={specKey}
              onChange={(e) => setSpecKey(e.target.value)}
            />
            <Input
              placeholder="Value"
              value={specValue}
              onChange={(e) => setSpecValue(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addSpecification}
              disabled={!specKey.trim() || !specValue.trim()}
            >
              Add
            </Button>
          </div>

          {Object.entries(formData.specifications).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">
                    <strong>{key}:</strong> {value}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSpecification(key)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="images">Upload Images</Label>
            <input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesChange}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {formData.images.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Selected: {formData.images.map(f => f.name).join(', ')}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name || !formData.brandId || !formData.category}>
          {loading ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </form>
  )
}