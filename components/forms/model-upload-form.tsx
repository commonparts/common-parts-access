import * as React from "react"
import { CreateProductModal } from "@/components/forms/create-product-modal"
import { useModelUploadFormState, type ModelFormData } from "@/hooks/use-model-upload-form-state"
import { cn } from "@/lib/utils"
import { VALIDATION_LIMITS } from "@/lib/utils/constants"
import { Badge } from "@/components/ui/badge"
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import type { ModelOriginType, ModelVerificationStatus } from "@/types/database"

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
    sourcePlatforms,
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
    addProduct,
    removeProduct,
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
            <Label htmlFor="title">Part Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter part title"
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
              placeholder="Describe your part..."
              maxLength={DESCRIPTION_MAX}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex justify-end text-caption text-text-secondary">
              <span>{formData.description.length}/{DESCRIPTION_MAX}</span>
            </div>
          </div>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm">
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
          </Grid>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="brand">Brand (Optional)</Label>
              <Combobox
                id="brand"
                placeholder={loadingMeta ? 'Loading brands...' : 'Search or select a brand'}
                options={brands.map((b) => ({ id: b.id, name: b.name }))}
                searchTerm={brandSearch}
                onSearchChange={setBrandSearch}
                onSelect={(option) => {
                  setFormData(prev => ({ ...prev, brandId: option.id, productIds: [] }))
                  setBrandSearch(option.name)
                }}
                isOpen={brandOpen}
                onOpenChange={setBrandOpen}
                disabled={loadingMeta}
                emptyMessage={brandSearch ? 'No matching brands' : 'No brands found'}
              />
            </div>

            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="product">Compatible products</Label>
              <Combobox
                id="product"
                placeholder={loadingProducts
                  ? 'Loading products...'
                  : formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT
                    ? `Maximum ${VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT} products reached`
                    : (!formData.brandId && !formData.categoryId)
                      ? 'Select brand/category to filter products'
                      : 'Search and add a product'}
                options={products
                  .filter((p) => !formData.productIds.includes(p.id))
                  .map((p) => ({
                    id: p.id,
                    name: p.model_number ? `${p.name} (${p.model_number})` : p.name,
                    categoryId: p.category_id ?? ''
                  }))}
                searchTerm={productSearch}
                onSearchChange={setProductSearch}
                onSelect={(option) => {
                  addProduct(option.id)
                  setCategoryPathFromCategoryId((option as { categoryId?: string }).categoryId)
                }}
                allowCreate={true}
                onCreate={handleOpenCreateProduct}
                createLabel={(value) => `Create product: ${value}`}
                isOpen={productOpen}
                onOpenChange={setProductOpen}
                disabled={
                  loadingProducts ||
                  formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT ||
                  (!formData.brandId && !formData.categoryId)
                }
                emptyMessage={productSearch ? 'No matching products' : 'No products found'}
              />
              <p className="text-caption text-text-secondary">At least one product is expected for the part to be discoverable.</p>
              {formData.productIds.length > 0 && (
                <div className="flex flex-wrap gap-sm mt-sm">
                  {formData.productIds.map((pid) => {
                    const p = products.find((x) => x.id === pid)
                    const label = p
                      ? (p.model_number ? `${p.name} (${p.model_number})` : p.name)
                      : pid
                    return (
                      <Badge key={pid} variant="secondary">
                        {label}
                        <button
                          type="button"
                          onClick={() => removeProduct(pid)}
                          className="hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface rounded-full"
                          aria-label={`Remove ${label}`}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
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
            <Label htmlFor="tags">Add tags to help others find your part</Label>
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

      {/* File upload */}
      <Card>
        <CardHeader>
          <CardTitle>Part files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="flex gap-md">
            <label className="flex items-center gap-xs cursor-pointer">
              <input
                type="radio"
                name="fileHostingType"
                value="hosted"
                checked={formData.fileHostingType === 'hosted'}
                onChange={() => setFormData(prev => ({ ...prev, fileHostingType: 'hosted' }))}
                className="accent-primary"
              />
              <span className="text-sm font-medium text-text-primary">Host file</span>
            </label>
            <label className="flex items-center gap-xs cursor-pointer">
              <input
                type="radio"
                name="fileHostingType"
                value="link_out"
                checked={formData.fileHostingType === 'link_out'}
                onChange={() => setFormData(prev => ({ ...prev, fileHostingType: 'link_out' }))}
                className="accent-primary"
              />
              <span className="text-sm font-medium text-text-primary">Link to source</span>
            </label>
          </div>

          {formData.fileHostingType === 'link_out' ? (
            <p className="text-sm text-text-secondary">
              No file upload needed. The download button on the model page will redirect visitors to the source URL you provide below.
            </p>
          ) : (
            <div className="space-y-sm">
              <Label>Part files *</Label>
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
          )}

          <div className="space-y-sm">
            <Label>Thumbnail images (optional)</Label>
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

      {/* Advanced — collapsed by default */}
      <Card>
        <Collapsible>
          <CardHeader>
            <CollapsibleTrigger>
              <span className="font-semibold leading-tight text-text-primary">Advanced</span>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-md">
              <Grid columns={12}>
                <div className="col-span-12 space-y-sm md:col-span-6">
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    type="text"
                    placeholder="e.g. PLA, PETG, ABS"
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 space-y-sm md:col-span-6">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="text"
                    placeholder="e.g. Black, White, Any"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </Grid>

              <fieldset className="space-y-sm">
                <legend className="text-sm font-medium text-text-primary">Dimensions</legend>
                <Grid columns={12}>
                  <div className="col-span-6 space-y-sm md:col-span-3">
                    <Label htmlFor="dimensionsLength">Length</Label>
                    <Input
                      id="dimensionsLength"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={formData.dimensionsLength}
                      onChange={(e) => setFormData(prev => ({ ...prev, dimensionsLength: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-6 space-y-sm md:col-span-3">
                    <Label htmlFor="dimensionsWidth">Width</Label>
                    <Input
                      id="dimensionsWidth"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={formData.dimensionsWidth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dimensionsWidth: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-6 space-y-sm md:col-span-3">
                    <Label htmlFor="dimensionsHeight">Height</Label>
                    <Input
                      id="dimensionsHeight"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={formData.dimensionsHeight}
                      onChange={(e) => setFormData(prev => ({ ...prev, dimensionsHeight: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-6 space-y-sm md:col-span-3">
                    <Label htmlFor="dimensionsUnit">Unit</Label>
                    <DropdownInput
                      as="select"
                      id="dimensionsUnit"
                      value={formData.dimensionsUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, dimensionsUnit: e.target.value }))}
                      className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                    </DropdownInput>
                  </div>
                </Grid>
              </fieldset>

              <fieldset className="space-y-sm">
                <legend className="text-sm font-medium text-text-primary">Print settings</legend>
                <Grid columns={12}>
                  <div className="col-span-6 space-y-sm md:col-span-4">
                    <Label htmlFor="layerHeight">Layer height (mm)</Label>
                    <Input
                      id="layerHeight"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 0.2"
                      value={formData.layerHeight}
                      onChange={(e) => setFormData(prev => ({ ...prev, layerHeight: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-6 space-y-sm md:col-span-4">
                    <Label htmlFor="infill">Infill (%)</Label>
                    <Input
                      id="infill"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="e.g. 20"
                      value={formData.infill}
                      onChange={(e) => setFormData(prev => ({ ...prev, infill: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12 space-y-sm md:col-span-4">
                    <Label htmlFor="supports">Supports</Label>
                    <DropdownInput
                      as="select"
                      id="supports"
                      value={formData.supports}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports: e.target.value }))}
                      className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                    >
                      <option value="">Not specified</option>
                      <option value="none">None</option>
                      <option value="buildplate_only">Build plate only</option>
                      <option value="everywhere">Everywhere</option>
                    </DropdownInput>
                  </div>
                </Grid>
              </fieldset>

              <Grid columns={12}>
                <div className="col-span-12 space-y-sm md:col-span-6">
                  <Label htmlFor="estimatedPrintTime">Estimated print time (minutes)</Label>
                  <Input
                    id="estimatedPrintTime"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 120"
                    value={formData.estimatedPrintTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrintTime: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 space-y-sm md:col-span-6">
                  <Label htmlFor="estimatedMaterialUsage">Estimated material usage (grams)</Label>
                  <Input
                    id="estimatedMaterialUsage"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 45"
                    value={formData.estimatedMaterialUsage}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedMaterialUsage: e.target.value }))}
                  />
                </div>
              </Grid>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Attribution & License */}
      <Card>
        <CardHeader>
          <CardTitle>Attribution & License</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="originType">Origin type</Label>
              <DropdownInput
                as="select"
                id="originType"
                value={formData.originType}
                onChange={(e) => {
                  const next = e.target.value as ModelOriginType
                  setFormData(prev => ({
                    ...prev,
                    originType: next,
                    fileHostingType: next === 'curated' ? prev.fileHostingType : 'hosted',
                  }))
                }}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
              >
                <option value="original">Original — I created this model</option>
                <option value="curated">Curated — imported from another source</option>
                <option value="manufacturer">Manufacturer — official brand upload</option>
              </DropdownInput>
            </div>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="verificationStatus">Verification status</Label>
              <DropdownInput
                as="select"
                id="verificationStatus"
                value={formData.verificationStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, verificationStatus: e.target.value as ModelVerificationStatus }))}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
              >
                <option value="unverified">Unverified</option>
                <option value="author_tested">Author tested</option>
                <option value="community_validated">Community validated</option>
                <option value="certified">Certified</option>
              </DropdownInput>
            </div>
          </Grid>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="sourceUrl">Source URL{formData.originType === 'curated' ? ' *' : ''}</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://www.printables.com/model/..."
                value={formData.sourceUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                required={formData.originType === 'curated'}
              />
            </div>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="sourcePlatform">Source platform{formData.fileHostingType === 'link_out' ? ' *' : ''}</Label>
              <DropdownInput
                as="select"
                id="sourcePlatform"
                value={formData.sourcePlatform}
                onChange={(e) => setFormData(prev => ({ ...prev, sourcePlatform: e.target.value }))}
                required={formData.fileHostingType === 'link_out'}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
              >
                <option value="">{loadingMeta ? 'Loading...' : 'Not specified'}</option>
                {sourcePlatforms.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </DropdownInput>
            </div>
          </Grid>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="originalAuthor">Original author{formData.originType === 'curated' ? ' *' : ''}</Label>
              <Input
                id="originalAuthor"
                type="text"
                placeholder="Author name or handle"
                value={formData.originalAuthor}
                onChange={(e) => setFormData(prev => ({ ...prev, originalAuthor: e.target.value }))}
                required={formData.originType === 'curated'}
              />
            </div>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="originalAuthorUrl">Original author profile URL</Label>
              <Input
                id="originalAuthorUrl"
                type="url"
                placeholder="https://www.printables.com/@author"
                value={formData.originalAuthorUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, originalAuthorUrl: e.target.value }))}
              />
            </div>
          </Grid>

          <Grid columns={12}>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="licenseId">License on Common Parts Access</Label>
              <DropdownInput
                as="select"
                id="licenseId"
                value={formData.licenseId}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseId: e.target.value }))}
                disabled={loadingMeta}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
              >
                <option value="">{loadingMeta ? 'Loading licenses...' : 'No license specified'}</option>
                {(formData.fileHostingType === 'link_out' ? licenses : licenses.filter(l => l.allowsCommercial && l.allowsRedistribution)).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.shortName}
                  </option>
                ))}
              </DropdownInput>
            </div>
            <div className="col-span-12 space-y-sm md:col-span-6">
              <Label htmlFor="sourceLicenseId">Source license{formData.originType === 'curated' ? ' *' : ''}</Label>
              <DropdownInput
                as="select"
                id="sourceLicenseId"
                value={formData.sourceLicenseId}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceLicenseId: e.target.value }))}
                disabled={loadingMeta}
                className="bg-bg-surface border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                required={formData.originType === 'curated'}
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
        <Button type="submit" disabled={loading || !formData.title || !formData.categoryId || (formData.fileHostingType !== 'link_out' && formData.files.length === 0)}>
          {loading ? "Uploading..." : "Upload Model"}
        </Button>
      </div>
    </form>
  )
}