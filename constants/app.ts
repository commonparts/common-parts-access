export const FILE_TYPES = {
  MODEL_FILES: ['.stl', '.obj', '.stp', '.step', '.3mf'] as const,
  IMAGE_FILES: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  DOC_FILES: [] as const,
} as const;

/** Maximum length for uploaded filenames — aligned with DB column constraints. */
export const MAX_FILENAME_LENGTH = 255;

export const STORAGE_BUCKETS = {
  MODEL_FILES: 'model-files',
  MODEL_THUMBNAILS: 'model-thumbnails',
  USER_AVATARS: 'user-avatars',
  BRAND_ASSETS: 'brand-assets',
  CATEGORY_ICONS: 'category-icons',
  PRODUCT_THUMBNAILS: 'product-thumbnails',
} as const;