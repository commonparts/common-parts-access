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
import { Grid } from "@/components/layout/grid"
import { DropdownInput } from "@/components/ui/dropdown-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface ModelUploadFormProps {
  onSubmit: (data: ModelFormData) => void
  loading?: boolean
  className?: string
}

const DESCRIPTION_MAX = 8000

export function ModelUploadForm({ onSubmit, loading = false, className }: ModelUploadFormProps) {
  const {
    formData,
    setFormData,
    tagInput,
    setTagInput,
    brands,
    licenses,
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
    <form onSubmit={handleSubmit} className={cn("space-y-lg", className)}>
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
        <CardContent className="space-y-md">
          <div className="space-y-sm">
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

          <div className="space-y-sm">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Describe your 3D model..."
              maxLength={DESCRIPTION_MAX}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>{formData.description.length}/{DESCRIPTION_MAX}</span>
            </div>
          </div>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="category">Category *</Label>
              <div className="flex flex-col gap-sm">
                {categoryLevels.map((level, idx) => {
                  const placeholder = idx === 0 ? 'Select a category' : 'Keep parent category'
                  const value = categoryPath[idx] ?? ''
                  const disabled = loadingMeta || (idx > 0 && !categoryPath[idx - 1])

                  return (
                    <DropdownInput
                      as="select"
                      key={level.parentId ?? `root-${idx}`}
                      value={value}
                      onChange={(e) => handleCategorySelect(idx, e.target.value)}
                      required={idx === 0}
                      disabled={disabled}
                      className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                    >
                      <option value="">{loadingMeta ? 'Loading categories...' : placeholder}</option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </DropdownInput>
                  )
                })}
              </div>
            </div>

            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="license">License</Label>
              <DropdownInput
                as="select"
                id="license"
                value={formData.licenseId}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseId: e.target.value }))}
                disabled={loadingMeta}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
              >
                <option value="">{loadingMeta ? 'Loading licenses...' : 'No license specified'}</option>
                {licenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.shortName}
                  </option>
                ))}
              </DropdownInput>
            </div>
          </Grid>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
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

            <div className="col-span-12 space-y-sm md:col-span-6">
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
          </Grid>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-sm">
            <Label htmlFor="tags">Add tags to help others find your model</Label>
            <div className="flex gap-sm">
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
            <div className="flex flex-wrap gap-sm">
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
        <CardContent className="space-y-md">
          <div className="space-y-sm">
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

          <div className="space-y-sm">
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
          <div className="flex items-center gap-sm">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, isPublic: Boolean(checked) }))
              }
              aria-label="Make this model publicly visible"
            />
            <Label htmlFor="isPublic">Make this model publicly visible</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-sm">
        <Button type="submit" disabled={loading || !formData.title || !formData.categoryId || formData.files.length === 0}>
          {loading ? "Uploading..." : "Upload Model"}
        </Button>
      </div>
    </form>
  )
}