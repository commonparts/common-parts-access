export const FILE_TYPES = {
  MODEL_FILES: ['.stl', '.obj', '.3mf', '.step', '.iges'] as const,
  IMAGE_FILES: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  DOC_FILES: ['.pdf', '.txt', '.md'] as const,
} as const;

export const STORAGE_BUCKETS = {
  MODEL_FILES: 'models-files',
  MODEL_THUMBNAILS: 'models-thumbnails',
  USER_AVATARS: 'user-avatars', // Future
  BRAND_ASSETS: 'brand-assets', // Future
} as const;