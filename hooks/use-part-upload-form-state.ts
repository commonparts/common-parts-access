import { useLocale, useTranslations } from "next-intl"
import * as React from "react"
import { usePublishForm } from '@/hooks/use-publish-form'
import type { PublishFormContext } from '@/lib/publish/form'
import { STORAGE_BUCKETS } from "@/constants/app"
import { VALIDATION_LIMITS } from "@/lib/utils/constants"
import { createClient } from "@/lib/supabase/client"
import { toStorageReference } from "@/lib/storage/path-utils"
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

const emptyCreateProduct: CreateProductFormData = {
  name: "",
  brandId: "",
  categoryId: "",
  description: "",
  releaseYear: "",
  imageFile: null,
}

/**
 * The full state object the hook returns. Named so the shared publish steps
 * (`components/publish/*`) can take it as a prop without each one restating
 * the two dozen fields it forwards.
 */
export type PartUploadFormState = ReturnType<typeof usePartUploadFormState>

interface UsePartUploadFormStateOptions extends PublishFormContext {
  /**
   * Selects the first license once the list loads, unless the form already
   * holds one. Off on the elsewhere track: the license at the source is
   * recorded as found there or pre-filled, never defaulted (#374).
   */
  preselectFirstLicense?: boolean
}

/** Loads the publication catalog and manages category/product selection and creation. */
export function usePartUploadFormState({
  preselectFirstLicense = true,
  ...context
}: UsePartUploadFormStateOptions) {
  const locale = useLocale()
  const t = useTranslations("CreateProductModal")
  const methods = usePublishForm(context)
  const { formData, setValue, getValues } = methods
  const [tagInput, setTagInput] = React.useState("")
  const [categories, setCategories] = React.useState<CategoryOption[]>([])
  const [brands, setBrands] = React.useState<BrandOption[]>([])
  const [licenses, setLicenses] = React.useState<LicenseOption[]>([])
  const [sourcePlatforms, setSourcePlatforms] = React.useState<SourcePlatform[]>([])
  const [products, setProducts] = React.useState<ProductOption[]>([])
  // Names of every product seen this session, keyed by id. `products` only
  // holds the brand currently selected in the picker, but the linked set can
  // span brands since #315 (and survives a brand switch), so the chips read
  // their label from here instead — otherwise every product from another
  // brand, and every one restored from a draft, would render as "Product".
  const [productNames, setProductNames] = React.useState<Record<string, string>>({})
  const [loadingProducts, setLoadingProducts] = React.useState(false)
  const [loadingMeta, setLoadingMeta] = React.useState(true)
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

  const categoryPath = React.useMemo(() => {
    const path: string[] = []
    let id: string | null = formData.categoryId
    while (id && !path.includes(id)) {
      path.unshift(id)
      id = categoryParentMap.get(id) ?? null
    }
    return path
  }, [formData.categoryId, categoryParentMap])

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

  React.useEffect(() => {
    let cancelled = false

    async function loadMetadata() {
      setLoadingMeta(true)
      try {
        const [catRes, brandRes, licenseRes, platformRes] = await Promise.all([
          fetch(`/api/categories?locale=${locale}`),
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
          if (preselectFirstLicense && rawLicenses.length > 0) {
            if (!getValues('licenseId')) setValue('licenseId', rawLicenses[0].id)
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
    // Constant for the lifetime of a form, so the metadata loads once.
  }, [preselectFirstLicense, locale, getValues, setValue])

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
    if (showCreateProduct) {
      setCreateProductData(prev => ({
        ...prev,
        name: pendingProductName || prev.name,
        brandId: formData.brandId || prev.brandId,
        categoryId: formData.categoryId || prev.categoryId,
      }))
      setCreateProductError(null)
      setCreatingProduct(false)
    }
  }, [showCreateProduct, pendingProductName, formData.brandId, formData.categoryId])

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

  // Remember the name of every product the picker loads, so it stays available
  // once the brand filter moves on to another catalog.
  React.useEffect(() => {
    if (products.length === 0) return
    setProductNames(prev => {
      const next = { ...prev }
      let changed = false
      for (const product of products) {
        if (next[product.id] !== product.name) {
          next[product.id] = product.name
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [products])

  // Resolve linked products the picker has not loaded — the case on a resumed
  // draft, whose links no longer come with a brand to scope the list by.
  React.useEffect(() => {
    const missing = formData.productIds.filter(id => !productNames[id])
    if (missing.length === 0) return

    let cancelled = false

    async function resolveNames(ids: string[]) {
      try {
        const res = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}`)
        const json = await res.json().catch(() => ({ products: [] }))
        const resolved: ProductOption[] = Array.isArray(json.products) ? json.products : []
        if (cancelled || resolved.length === 0) return
        setProductNames(prev => ({
          ...prev,
          ...Object.fromEntries(resolved.map(product => [product.id, product.name])),
        }))
      } catch (error) {
        console.error("Failed to resolve linked products", error)
      }
    }

    resolveNames(missing)
    return () => {
      cancelled = true
    }
  }, [formData.productIds, productNames])

  const handleCategorySelect = (level: number, value: string) => {
    setValue('categoryId', value || categoryPath[level - 1] || '')
    setValue('productIds', [])
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
    if (categoryId) setValue('categoryId', categoryId)
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
          setCreateProductError(t("signInToUpload"))
          setCreatingProduct(false)
          return
        }

        const userId = userData.user.id
        const file = createProductData.imageFile
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "product-image"
        const path = `${userId}/product-${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PRODUCT_THUMBNAILS)
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false })

        if (uploadError) throw uploadError

        // The product stores a relative storage reference, resolved to a
        // public URL when it is read (#56).
        imageUrl = toStorageReference(STORAGE_BUCKETS.PRODUCT_THUMBNAILS, path)
      } catch (uploadErr) {
        console.error("Product image upload failed", uploadErr)
        setCreateProductError(t("imageUploadFailed"))
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
      const product = json?.product as ProductOption | undefined

      // A 409 carrying a product means an equivalent one already exists for
      // this brand — fall through and link it instead of surfacing an error.
      if (!res.ok && !(res.status === 409 && product?.id)) {
        setCreateProductError(json?.error || t("createFailed"))
        return
      }

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

        setValue('brandId', product.brand_id ?? getValues('brandId'))
        setValue('categoryId', product.category_id ?? getValues('categoryId'))
        const linked = getValues('productIds')
        if (!linked.includes(product.id)) setValue('productIds', [...linked, product.id])

        setCategoryPathFromCategoryId(product.category_id)
        setShowCreateProduct(false)
        setPendingProductName("")
        setCreateProductData(emptyCreateProduct)
      }
    } catch {
      setCreateProductError(t("createFailed"))
    } finally {
      setCreatingProduct(false)
    }
  }

  const updateCreateField = <K extends keyof CreateProductFormData>(field: K, value: CreateProductFormData[K]) => {
    setCreateProductData(prev => ({ ...prev, [field]: value }))
  }

  const addProduct = (id: string): void => {
    const ids = getValues('productIds')
    if (ids.length < VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT && !ids.includes(id)) setValue('productIds', [...ids, id])
    setProductSearch('')
  }

  const removeProduct = (id: string): void => setValue('productIds', getValues('productIds').filter(pid => pid !== id))
  const addTag = (tag: string): void => {
    const tags = getValues('tags')
    if (tag.trim() && !tags.includes(tag.trim())) setValue('tags', [...tags, tag.trim()])
    setTagInput('')
  }
  const removeTag = (tag: string): void => setValue('tags', getValues('tags').filter(value => value !== tag))

  return {
    ...methods,
    tagInput,
    setTagInput,
    categories,
    brands,
    licenses,
    sourcePlatforms,
    products,
    productNames,
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
    addProduct,
    removeProduct,
    addTag,
    removeTag,
  }
}
