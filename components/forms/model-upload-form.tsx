import * as React from "react"
import { CreateProductModal } from "@/components/forms/create-product-modal"
import { useModelUploadFormState, type ModelFormData } from "@/hooks/use-model-upload-form-state"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { FileUploader } from "@/components/ui/file-uploader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ModelUploadFormProps {
  onSubmit: (data: ModelFormData) => void
  loading?: boolean
  className?: string
}

export function ModelUploadForm({ onSubmit, loading = false, className }: ModelUploadFormProps) {
  const {
    formData,
    setFormData,
    tagInput,
    setTagInput,
    brands,
    products,
    loadingProducts,
    loadingMeta,
    categoryLevels,
    categoryPath,
    handleCategorySelect,
    flatCategories,
    brandSearch,
    setBrandSearch,
    productSearch,
    setProductSearch,
    brandOpen,
    setBrandOpen,
    productOpen,
    setProductOpen,
    showCreateProduct,
    handleOpenCreateProduct,
    closeCreateProduct,
    createProductData,
    updateCreateField,
    handleCreateProductSubmit,
    createProductError,
    creatingProduct,
    setCategoryPathFromCategoryId,
    handleFilesSelect,
    handleThumbnailsSelect,
    addTag,
    removeTag,
  } = useModelUploadFormState()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <CreateProductModal
        open={showCreateProduct}
        onClose={closeCreateProduct}
        brands={brands}
        categories={flatCategories}
        data={createProductData}
        error={createProductError}
        loading={creatingProduct}
        onChange={updateCreateField}
        onSubmit={handleCreateProductSubmit}
      />

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
              className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface placeholder:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
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
                      className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
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
                className="control w-full border border-border-subtle bg-bg-surface text-text-primary shadow-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
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