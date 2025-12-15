import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploader } from "@/components/ui/file-uploader"
import { Combobox } from "@/components/ui/combobox"

interface CategoryOption {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  level?: number | null
}

interface BrandOption {
  id: string
  name: string
  slug: string
}

interface ProductOption {
  id: string
  name: string
  slug: string
  model_number?: string | null
  brand_id?: string | null
  category_id?: string | null
}

interface CreateProductFormData {
  name: string
  brandId: string
  categoryId: string
  modelNumber?: string
  description?: string
  releaseYear?: string
  imageUrl?: string
  discontinued?: boolean
}

interface ModelFormData {
  title: string
  description: string
  categoryId: string
  tags: string[]
  brandId?: string
  productId?: string
  files: File[]
  thumbnails: File[]
  isPublic: boolean
  license: string
}

interface ModelUploadFormProps {
  onSubmit: (data: ModelFormData) => void
  loading?: boolean
  className?: string
}

export function ModelUploadForm({ onSubmit, loading = false, className }: ModelUploadFormProps) {
  const [formData, setFormData] = React.useState<ModelFormData>({
    title: "",
    description: "",
    categoryId: "",
    tags: [],
    brandId: "",
    productId: "",
    files: [],
    thumbnails: [],
    isPublic: true,
    license: "cc-by-4.0"
  })
  const [tagInput, setTagInput] = React.useState("")
  const [categories, setCategories] = React.useState<CategoryOption[]>([])
  const [brands, setBrands] = React.useState<BrandOption[]>([])
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [loadingProducts, setLoadingProducts] = React.useState(false)
  const [loadingMeta, setLoadingMeta] = React.useState(true)
  const [categoryPath, setCategoryPath] = React.useState<string[]>([])
  const [brandSearch, setBrandSearch] = React.useState("")
  const [productSearch, setProductSearch] = React.useState("")
  const [brandOpen, setBrandOpen] = React.useState(false)
  const [productOpen, setProductOpen] = React.useState(false)
  const [showCreateProduct, setShowCreateProduct] = React.useState(false)
  const [pendingProductName, setPendingProductName] = React.useState("")
  const [createProductData, setCreateProductData] = React.useState<CreateProductFormData>({
    name: "",
    brandId: "",
    categoryId: "",
    modelNumber: "",
    description: "",
    releaseYear: "",
    imageUrl: "",
    discontinued: false
  })
  const [createProductError, setCreateProductError] = React.useState<string | null>(null)
  const [creatingProduct, setCreatingProduct] = React.useState(false)

  const categoryParentMap = React.useMemo(() => {
    const map = new Map<string, string | null>()
    categories.forEach(cat => {
      if (cat.id) {
        map.set(cat.id, cat.parent_id ?? null)
      }
    })
    return map
  }, [categories])

  const categoryTreeByParent = React.useMemo(() => {
    const map = new Map<string | null, CategoryOption[]>()
    categories.forEach(cat => {
      const parentKey = cat.parent_id ?? null
      const siblings = map.get(parentKey) ?? []
      siblings.push(cat)
      map.set(parentKey, siblings)
    })
    return map
  }, [categories])

  const categoryLevels = React.useMemo(() => {
    const levels: { parentId: string | null; options: CategoryOption[] }[] = []
    let currentParent: string | null = null
    let depth = 0

    while (true) {
      const options = categoryTreeByParent.get(currentParent) ?? []
      if (options.length === 0 && depth > 0) break
      levels.push({ parentId: currentParent, options })

      const selectedAtLevel = categoryPath[depth]
      if (!selectedAtLevel) break

      const hasChildren = (categoryTreeByParent.get(selectedAtLevel) ?? []).length > 0
      if (!hasChildren) break

      currentParent = selectedAtLevel
      depth += 1
      if (depth > 5) break // safety guard for unexpected deep trees
    }

    return levels
  }, [categoryPath, categoryTreeByParent])

  const flatCategories = React.useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: `${" ".repeat(Math.max(0, (cat.level ?? 0) * 2))}${cat.name}`
    }))
  }, [categories])

  const effectiveCategoryId = React.useMemo(() => {
    for (let i = categoryPath.length - 1; i >= 0; i -= 1) {
      if (categoryPath[i]) return categoryPath[i]
    }
    return ''
  }, [categoryPath])

  React.useEffect(() => {
    let cancelled = false

    async function loadMetadata() {
      setLoadingMeta(true)
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/brands')
        ])

        const catJson = await catRes.json().catch(() => ({ categories: [] }))
        const brandJson = await brandRes.json().catch(() => ({ brands: [] }))

        if (!cancelled) {
          setCategories(Array.isArray(catJson.categories) ? catJson.categories : [])
          setBrands(Array.isArray(brandJson.brands) ? brandJson.brands : [])
        }
      } catch (error) {
        console.error('Failed to load categories/brands', error)
        if (!cancelled) {
          setCategories([])
          setBrands([])
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }

    loadMetadata()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      if (!formData.brandId && !formData.categoryId) {
        setProducts([])
        return
      }

      setLoadingProducts(true)
      try {
        const params = new URLSearchParams()
        if (formData.brandId) params.append('brandId', formData.brandId)
        if (formData.categoryId) params.append('categoryId', formData.categoryId)
        params.append('includeDescendants', 'true')
        const res = await fetch(`/api/products?${params.toString()}`)
        const json = await res.json().catch(() => ({ products: [] }))
        if (!cancelled) {
          setProducts(Array.isArray(json.products) ? json.products : [])
        }
      } catch (error) {
        console.error('Failed to load products', error)
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [formData.brandId, formData.categoryId])

  React.useEffect(() => {
    setFormData(prev => {
      if (prev.categoryId === effectiveCategoryId) return prev
      return { ...prev, categoryId: effectiveCategoryId, productId: '' }
    })
  }, [effectiveCategoryId])

  React.useEffect(() => {
    if (showCreateProduct) {
      setCreateProductData(prev => ({
        ...prev,
        name: pendingProductName || prev.name,
        brandId: formData.brandId || prev.brandId,
        categoryId: effectiveCategoryId || prev.categoryId,
      }))
      setCreateProductError(null)
      setCreatingProduct(false)
    }
  }, [showCreateProduct, pendingProductName, formData.brandId, effectiveCategoryId])

  React.useEffect(() => {
    if (!formData.brandId) {
      setBrandSearch("")
      return
    }
    const match = brands.find(b => b.id === formData.brandId)
    if (match) setBrandSearch(match.name)
  }, [formData.brandId, brands])

  React.useEffect(() => {
    if (!formData.productId) {
      setProductSearch("")
      return
    }
    const match = products.find(p => p.id === formData.productId)
    if (match) setProductSearch(match.model_number ? `${match.name} (${match.model_number})` : match.name)
  }, [formData.productId, products])

  React.useEffect(() => {
    if (showCreateProduct) {
      setProductOpen(false)
    }
  }, [showCreateProduct])

  const handleCategorySelect = (level: number, value: string) => {
    setCategoryPath(prev => {
      const next = [...prev]
      next[level] = value
      return next.slice(0, level + 1)
    })
    setFormData(prev => ({ ...prev, productId: '' }))
  }

  const handleOpenCreateProduct = (name: string) => {
    setPendingProductName(name)
    setShowCreateProduct(true)
  }

  const closeCreateProduct = () => {
    setShowCreateProduct(false)
    setCreateProductError(null)
  }

  const setCategoryPathFromCategoryId = (categoryId?: string | null) => {
    if (!categoryId) return
    const path: string[] = []
    let current: string | null | undefined = categoryId
    let safety = 0
    while (current) {
      path.push(current)
      current = categoryParentMap.get(current) ?? null
      safety += 1
      if (safety > 50) break
    }
    setCategoryPath(path.reverse())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleCreateProductSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    // API integration will be added in the next step.
    setCreatingProduct(true)
    setCreateProductError('Product creation will be wired next.')
    setTimeout(() => setCreatingProduct(false), 300)
  }

  const updateCreateField = (field: keyof CreateProductFormData, value: any) => {
    setCreateProductData(prev => ({ ...prev, [field]: value }))
  }

  const handleFilesSelect = (files: File[]) => {
    setFormData(prev => ({ ...prev, files }))
  }

  const handleThumbnailsSelect = (thumbnails: File[]) => {
    setFormData(prev => ({ ...prev, thumbnails }))
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {showCreateProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 backdrop-blur-sm">
          <div className="mt-10 w-full max-w-3xl px-4">
            <Card className="shadow-2xl border-muted">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle>Create new product</CardTitle>
                  <p className="text-sm text-muted-foreground">Prefilled from your current brand and category selections.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeCreateProduct}>
                  Cancel
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {createProductError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {createProductError}
                  </div>
                )}

                <div className="space-y-4" role="form" aria-label="Create product">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-name">Product name *</Label>
                      <Input
                        id="create-name"
                        value={createProductData.name}
                        onChange={(e) => updateCreateField('name', e.target.value)}
                        placeholder="Enter product name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-model">Model number</Label>
                      <Input
                        id="create-model"
                        value={createProductData.modelNumber || ''}
                        onChange={(e) => updateCreateField('modelNumber', e.target.value)}
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
                        value={createProductData.brandId}
                        onChange={(e) => updateCreateField('brandId', e.target.value)}
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
                        value={createProductData.categoryId}
                        onChange={(e) => updateCreateField('categoryId', e.target.value)}
                        required
                      >
                        <option value="">Select category</option>
                        {flatCategories.map((cat) => (
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
                      value={createProductData.description || ''}
                      onChange={(e) => updateCreateField('description', e.target.value)}
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
                        value={createProductData.releaseYear || ''}
                        onChange={(e) => updateCreateField('releaseYear', e.target.value)}
                        placeholder="e.g., 2023"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-image">Image URL</Label>
                      <Input
                        id="create-image"
                        type="url"
                        value={createProductData.imageUrl || ''}
                        onChange={(e) => updateCreateField('imageUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        id="create-discontinued"
                        type="checkbox"
                        checked={Boolean(createProductData.discontinued)}
                        onChange={(e) => updateCreateField('discontinued', e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor="create-discontinued">Discontinued</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={closeCreateProduct}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleCreateProductSubmit()}
                      disabled={creatingProduct || !createProductData.name || !createProductData.brandId || !createProductData.categoryId}
                    >
                      {creatingProduct ? 'Creating...' : 'Create product'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Model Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter model title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe your 3D model..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="category">Category *</Label>
              <div className="flex flex-col gap-3">
                {categoryLevels.map((level, idx) => {
                  const placeholder = idx === 0 ? 'Select a category' : 'Keep parent category'
                  const value = categoryPath[idx] ?? ''
                  const disabled = loadingMeta || (idx > 0 && !categoryPath[idx - 1])

                  return (
                    <select
                      key={level.parentId ?? `root-${idx}`}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={value}
                      onChange={(e) => handleCategorySelect(idx, e.target.value)}
                      required={idx === 0}
                      disabled={disabled}
                    >
                      <option value="">{loadingMeta ? 'Loading categories...' : placeholder}</option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <select
                id="license"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.license}
                onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
              >
                <option value="cc-by-4.0">CC BY 4.0</option>
                <option value="cc-by-sa-4.0">CC BY-SA 4.0</option>
                <option value="cc-by-nc-4.0">CC BY-NC 4.0</option>
                <option value="mit">MIT License</option>
                <option value="proprietary">Proprietary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand (Optional)</Label>
              <Combobox
                id="brand"
                placeholder={loadingMeta ? 'Loading brands...' : 'Search or select a brand'}
                options={brands.map((b) => ({ id: b.id, name: b.name }))}
                value={formData.brandId}
                searchTerm={brandSearch}
                onSearchChange={setBrandSearch}
                onSelect={(option) => {
                  setFormData(prev => ({ ...prev, brandId: option.id, productId: '' }))
                  setBrandSearch(option.name)
                }}
                isOpen={brandOpen}
                onOpenChange={setBrandOpen}
                disabled={loadingMeta}
                emptyMessage={brandSearch ? 'No matching brands' : 'No brands found'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Product (Optional)</Label>
              <Combobox
                id="product"
                placeholder={loadingProducts
                  ? 'Loading products...'
                  : (!formData.brandId && !formData.categoryId)
                    ? 'Select brand/category to filter products'
                    : 'Search or select a product'}
                options={products.map((p) => ({
                  id: p.id,
                  name: p.model_number ? `${p.name} (${p.model_number})` : p.name,
                  categoryId: p.category_id ?? ''
                }))}
                value={formData.productId}
                searchTerm={productSearch}
                onSearchChange={setProductSearch}
                onSelect={(option) => {
                  setFormData(prev => ({ ...prev, productId: option.id }))
                  setProductSearch(option.name)
                  setCategoryPathFromCategoryId((option as { categoryId?: string }).categoryId)
                }}
                allowCreate={true}
                onCreate={handleOpenCreateProduct}
                createLabel={(value) => `Create product: ${value}`}
                isOpen={productOpen}
                onOpenChange={setProductOpen}
                disabled={loadingProducts || (!formData.brandId && !formData.categoryId)}
                emptyMessage={productSearch ? 'No matching products' : 'No products found'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tags">Add tags to help others find your model</Label>
            <div className="flex space-x-2">
              <Input
                id="tags"
                type="text"
                placeholder="Enter a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent text-accent-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Model Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>3D Model Files *</Label>
            <p className="text-sm text-muted-foreground">Accepted: STL, OBJ, STP, STEP (max 50MB each)</p>
            <FileUploader
              accept=".stl,.obj,.stp,.step"
              onFilesSelect={handleFilesSelect}
              multiple={true}
              maxSize={50 * 1024 * 1024} // 50MB
            />
            {formData.files.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {formData.files.map(f => f.name).join(', ')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Thumbnail Images (Optional)</Label>
            <p className="text-sm text-muted-foreground">Accepted: JPG, JPEG, PNG, WEBP (max 5MB each)</p>
            <FileUploader
              accept=".jpg,.jpeg,.png,.webp"
              onFilesSelect={handleThumbnailsSelect}
              multiple={true}
              maxSize={5 * 1024 * 1024} // 5MB
            />
            {formData.thumbnails.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {formData.thumbnails.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Publishing */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Publishing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <input
              id="isPublic"
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="isPublic">Make this model publicly visible</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Save as Draft
        </Button>
        <Button type="submit" disabled={loading || !formData.title || !formData.categoryId || formData.files.length === 0}>
          {loading ? "Uploading..." : "Upload Model"}
        </Button>
      </div>
    </form>
  )
}