import * as React from "react"
import { STORAGE_BUCKETS } from "@/constants/app"
import { VALIDATION_LIMITS } from "@/lib/utils/constants"
import { createClient } from "@/lib/supabase/client"
import type { ModelFileHostingType, ModelOriginType, ModelVerificationStatus } from "@/types/database"
import type { SourcePlatform } from "@/types/database"

export interface CategoryOption {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  level?: number | null
}

export interface BrandOption {
  id: string
  name: string
  slug: string
}

export interface LicenseOption {
  id: string
  spdxId: string
  shortName: string
  name: string
  url: string
  requiresAttribution: boolean
  allowsCommercial: boolean
  allowsRedistribution: boolean
  isCopyleft: boolean
}

interface RawLicenseRow {
  id: string
  spdx_id: string
  short_name: string
  name: string
  url: string
  requires_attribution: boolean
  allows_commercial: boolean
  allows_redistribution: boolean
  is_copyleft: boolean
}

export interface ProductOption {
  id: string
  name: string
  slug: string
  brand_id?: string | null
  category_id?: string | null
}

export interface CreateProductFormData {
  name: string
  brandId: string
  categoryId: string
  description?: string
  releaseYear?: string
  imageFile?: File | null
}

export interface ModelFormData {
  title: string
  description: string
  instructions: string
  categoryId: string
  tags: string[]
  brandId?: string
  productIds: string[]
  files: File[]
  thumbnails: File[]
  isPublic: boolean
  licenseId: string
  // Attribution & License
  originType: ModelOriginType
  sourceUrl: string
  sourcePlatform: string
  originalAuthor: string
  originalAuthorUrl: string
  sourceLicenseId: string
  verificationStatus: ModelVerificationStatus
  fileHostingType: ModelFileHostingType
  // Advanced — print metadata
  material: string
  color: string
  dimensionsLength: string
  dimensionsWidth: string
  dimensionsHeight: string
  dimensionsUnit: string
  layerHeight: string
  infill: string
  supports: string
  estimatedPrintTime: string
  estimatedMaterialUsage: string
}

const emptyCreateProduct: CreateProductFormData = {
  name: "",
  brandId: "",
  categoryId: "",
  description: "",
  releaseYear: "",
  imageFile: null,
}

export function useModelUploadFormState() {
  const [formData, setFormData] = React.useState<ModelFormData>({
    title: "",
    description: "",
    instructions: "",
    categoryId: "",
    tags: [],
    brandId: "",
    productIds: [],
    files: [],
    thumbnails: [],
    isPublic: true,
    licenseId: "",
    // Attribution & License
    originType: "original",
    sourceUrl: "",
    sourcePlatform: "",
    originalAuthor: "",
    originalAuthorUrl: "",
    sourceLicenseId: "",
    verificationStatus: "unverified",
    fileHostingType: "hosted",
    // Advanced — print metadata
    material: "",
    color: "",
    dimensionsLength: "",
    dimensionsWidth: "",
    dimensionsHeight: "",
    dimensionsUnit: "mm",
    layerHeight: "",
    infill: "",
    supports: "",
    estimatedPrintTime: "",
    estimatedMaterialUsage: "",
  })
  const [tagInput, setTagInput] = React.useState("")
  const [categories, setCategories] = React.useState<CategoryOption[]>([])
  const [brands, setBrands] = React.useState<BrandOption[]>([])
  const [licenses, setLicenses] = React.useState<LicenseOption[]>([])
  const [sourcePlatforms, setSourcePlatforms] = React.useState<SourcePlatform[]>([])
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
  const [createProductData, setCreateProductData] = React.useState<CreateProductFormData>(emptyCreateProduct)
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
      if (depth > 5) break
    }

    return levels
  }, [categoryPath, categoryTreeByParent])

  const flatCategories = React.useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: `${" ".repeat(Math.max(0, (cat.level ?? 0) * 2))}${cat.name}`,
    }))
  }, [categories])

  const effectiveCategoryId = React.useMemo(() => {
    for (let i = categoryPath.length - 1; i >= 0; i -= 1) {
      if (categoryPath[i]) return categoryPath[i]
    }
    return ""
  }, [categoryPath])

  React.useEffect(() => {
    let cancelled = false

    async function loadMetadata() {
      setLoadingMeta(true)
      try {
        const [catRes, brandRes, licenseRes, platformRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
          fetch("/api/licenses"),
          fetch("/api/source-platforms"),
        ])

        const catJson = await catRes.json().catch(() => ({ categories: [] }))
        const brandJson = await brandRes.json().catch(() => ({ brands: [] }))
        const licenseJson = await licenseRes.json().catch(() => ({ licenses: [] }))
        const platformJson = await platformRes.json().catch(() => ({ platforms: [] }))

        if (!cancelled) {
          setCategories(Array.isArray(catJson.categories) ? catJson.categories : [])
          setBrands(Array.isArray(brandJson.brands) ? brandJson.brands : [])
          setSourcePlatforms(Array.isArray(platformJson.platforms) ? platformJson.platforms : [])
          const rawLicenses: LicenseOption[] = Array.isArray(licenseJson.licenses)
            ? licenseJson.licenses.map((l: RawLicenseRow) => ({
                id: l.id,
                spdxId: l.spdx_id,
                shortName: l.short_name,
                name: l.name,
                url: l.url,
                requiresAttribution: l.requires_attribution,
                allowsCommercial: l.allows_commercial,
                allowsRedistribution: l.allows_redistribution,
                isCopyleft: l.is_copyleft,
              }))
            : []
          setLicenses(rawLicenses)
          if (rawLicenses.length > 0) {
            setFormData(prev => ({
              ...prev,
              licenseId: prev.licenseId || rawLicenses[0].id,
            }))
          }
        }
      } catch (error) {
        console.error("Failed to load form metadata", error)
        if (!cancelled) {
          setCategories([])
          setBrands([])
          setSourcePlatforms([])
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
        if (formData.brandId) params.append("brandId", formData.brandId)
        if (formData.categoryId) params.append("categoryId", formData.categoryId)
        params.append("includeDescendants", "true")
        const res = await fetch(`/api/products?${params.toString()}`)
        const json = await res.json().catch(() => ({ products: [] }))
        if (!cancelled) {
          setProducts(Array.isArray(json.products) ? json.products : [])
        }
      } catch (error) {
        console.error("Failed to load products", error)
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [formData.brandId, formData.categoryId])

  React.useEffect(() => {
    setFormData(prev => {
      if (prev.categoryId === effectiveCategoryId) return prev
      return { ...prev, categoryId: effectiveCategoryId }
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

  // Clear product search when the product list reloads so stale text doesn't
  // falsely suggest an active selection.
  React.useEffect(() => {
    setProductSearch("")
  }, [products])

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
    setFormData(prev => ({ ...prev, productIds: [] }))
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

  const handleCreateProductSubmit = async () => {
    setCreateProductError(null)
    setCreatingProduct(true)

    let imageUrl: string | undefined

    if (createProductData.imageFile) {
      try {
        const supabase = await createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData?.user?.id) {
          throw new Error("You must be logged in to upload images")
        }

        const userId = userData.user.id
        const file = createProductData.imageFile
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "product-image"
        const path = `${userId}/product-${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PRODUCT_THUMBNAILS)
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false })

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage.from(STORAGE_BUCKETS.PRODUCT_THUMBNAILS).getPublicUrl(path)
        imageUrl = publicData.publicUrl
      } catch (uploadErr) {
        const fallback = "Failed to upload image"
        const message = uploadErr instanceof Error ? uploadErr.message : fallback
        console.error("Product image upload failed", uploadErr)
        setCreateProductError(message)
        setCreatingProduct(false)
        return
      }
    }

    const payload = {
      name: createProductData.name.trim(),
      brandId: createProductData.brandId,
      categoryId: createProductData.categoryId,
      description: createProductData.description?.trim() || undefined,
      releaseYear: createProductData.releaseYear ? Number(createProductData.releaseYear) : undefined,
      imageUrl,
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setCreateProductError(json?.error || "Failed to create product")
        return
      }

      const product = json?.product as ProductOption | undefined
      if (product?.id) {
        setProducts(prev => {
          const next = [
            ...prev.filter((p) => p.id !== product.id),
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              brand_id: product.brand_id ?? null,
              category_id: product.category_id ?? null,
            },
          ]
          return next.sort((a, b) => a.name.localeCompare(b.name))
        })

        setFormData(prev => ({
          ...prev,
          brandId: product.brand_id ?? prev.brandId,
          categoryId: product.category_id ?? prev.categoryId,
          productIds: prev.productIds.includes(product.id)
            ? prev.productIds
            : [...prev.productIds, product.id],
        }))

        setCategoryPathFromCategoryId(product.category_id)
        setShowCreateProduct(false)
        setPendingProductName("")
        setCreateProductData(emptyCreateProduct)
      }
    } catch (err) {
      setCreateProductError(err instanceof Error ? err.message : "Failed to create product")
    } finally {
      setCreatingProduct(false)
    }
  }

  const updateCreateField = <K extends keyof CreateProductFormData>(field: K, value: CreateProductFormData[K]) => {
    setCreateProductData(prev => ({ ...prev, [field]: value }))
  }

  const handleFilesSelect = (files: File[]) => {
    setFormData(prev => ({ ...prev, files }))
  }

  const handleThumbnailsSelect = (thumbnails: File[]) => {
    setFormData(prev => ({ ...prev, thumbnails }))
  }

  const addProduct = (id: string) => {
    setFormData(prev => {
      if (prev.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT) return prev
      return {
        ...prev,
        productIds: prev.productIds.includes(id) ? prev.productIds : [...prev.productIds, id],
      }
    })
    setProductSearch("")
  }

  const removeProduct = (id: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.filter(pid => pid !== id),
    }))
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()],
      }))
    }
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }))
  }

  return {
    formData,
    setFormData,
    tagInput,
    setTagInput,
    categories,
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
    pendingProductName,
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
  }
}
