import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BrandFormData {
  name: string
  description: string
  website: string
  logo?: File
  founded?: string
  headquarters?: string
  industry: string
}

interface BrandFormProps {
  initialData?: Partial<BrandFormData>
  onSubmit: (data: BrandFormData) => void
  loading?: boolean
  className?: string
}

export function BrandForm({ initialData, onSubmit, loading = false, className }: BrandFormProps) {
  const [formData, setFormData] = React.useState<BrandFormData>({
    name: "",
    description: "",
    website: "",
    industry: "",
    ...initialData
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const updateField = (field: keyof BrandFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Brand Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter brand name"
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
              placeholder="Describe the brand..."
              className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface placeholder:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://brand-website.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
                required
              >
                <option value="">Select industry</option>
                <option value="automotive">Automotive</option>
                <option value="aerospace">Aerospace</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="technology">Technology</option>
                <option value="consumer-goods">Consumer Goods</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="founded">Founded</Label>
              <Input
                id="founded"
                type="text"
                value={formData.founded || ''}
                onChange={(e) => updateField('founded', e.target.value)}
                placeholder="e.g., 1995"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headquarters">Headquarters</Label>
              <Input
                id="headquarters"
                type="text"
                value={formData.headquarters || ''}
                onChange={(e) => updateField('headquarters', e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Brand Logo</Label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors file:border-0 file:bg-transparent file:text-[var(--typography-size-body)] file:font-medium file:text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name || !formData.industry}>
          {loading ? "Saving..." : "Save Brand"}
        </Button>
      </div>
    </form>
  )
}