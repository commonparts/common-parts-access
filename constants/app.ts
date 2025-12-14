export const FILE_TYPES = {
  MODEL_FILES: ['.stl', '.obj', '.stp', '.step'] as const,
  IMAGE_FILES: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  DOC_FILES: [] as const,
} as const;

export const STORAGE_BUCKETS = {
  MODEL_FILES: 'model-files',
  MODEL_THUMBNAILS: 'model-thumbnails',
  USER_AVATARS: 'user-avatars',
  BRAND_ASSETS: 'brand-assets',
  CATEGORY_ICONS: 'category-icons',
  PRODUCT_IMAGES: 'product-images',
  PRODUCT_THUMBNAILS: 'product-thumbnails',
  BRAND_LOGOS: 'brand-logos',
} as const;