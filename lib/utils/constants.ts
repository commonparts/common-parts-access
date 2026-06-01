/**
 * Application constants and configuration values
 */

// Application metadata
export const APP_NAME = 'Common Parts Access'
export const APP_DESCRIPTION = 'Open platform for publishing and accessing digital spare parts for everyday repairs'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
export const APP_VERSION = '1.0.0'

// File upload constraints
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILES_PER_MODEL: 5,
  ALLOWED_MODEL_EXTENSIONS: ['.obj', '.fbx', '.dae', '.3ds', '.blend', '.stl', '.ply', '.gltf', '.glb'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  ALLOWED_MIME_TYPES: {
    models: [
      'model/stl'
    ],
    images: [
      'image/jpeg'
    ]
  }
} as const

// Model categories
export const MODEL_CATEGORIES = [
  'Architecture',
  'Vehicles',
  'Characters',
  'Animals',
  'Furniture',
  'Electronics',
  'Weapons',
  'Nature',
  'Science Fiction',
  'Fantasy',
  'Industrial',
  'Medical',
  'Sports',
  'Food & Drinks',
  'Clothing',
  'Art & Sculptures',
  'Household Items',
  'Tools',
  'Jewelry',
  'Other'
] as const

// Model quality levels
export const QUALITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  ULTRA: 'ultra'
} as const

export const QUALITY_LABELS = {
  [QUALITY_LEVELS.LOW]: 'Low Poly',
  [QUALITY_LEVELS.MEDIUM]: 'Medium Poly',
  [QUALITY_LEVELS.HIGH]: 'High Poly',
  [QUALITY_LEVELS.ULTRA]: 'Ultra High Poly'
} as const

// Pricing tiers
export const PRICING_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  EXCLUSIVE: 'exclusive'
} as const

export const PRICING_LABELS = {
  [PRICING_TIERS.FREE]: 'Free',
  [PRICING_TIERS.PREMIUM]: 'Premium',
  [PRICING_TIERS.EXCLUSIVE]: 'Exclusive'
} as const

// User roles
export const USER_ROLES = {
  USER: 'user',
  CREATOR: 'creator',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
} as const

// Search and pagination
export const SEARCH_CONFIG = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 48,
  MAX_SEARCH_RESULTS: 1000,
  DEBOUNCE_DELAY: 300, // milliseconds
  MIN_SEARCH_LENGTH: 2
} as const

// Sort options
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  MOST_POPULAR: 'most_popular',
  MOST_DOWNLOADED: 'most_downloaded',
  HIGHEST_RATED: 'highest_rated',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc'
} as const

export const SORT_LABELS = {
  [SORT_OPTIONS.NEWEST]: 'Newest First',
  [SORT_OPTIONS.OLDEST]: 'Oldest First',
  [SORT_OPTIONS.MOST_POPULAR]: 'Most Popular',
  [SORT_OPTIONS.MOST_DOWNLOADED]: 'Most Downloaded',
  [SORT_OPTIONS.HIGHEST_RATED]: 'Highest Rated',
  [SORT_OPTIONS.NAME_ASC]: 'Name A-Z',
  [SORT_OPTIONS.NAME_DESC]: 'Name Z-A',
  [SORT_OPTIONS.PRICE_ASC]: 'Price Low to High',
  [SORT_OPTIONS.PRICE_DESC]: 'Price High to Low'
} as const

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email'
  },
  MODELS: {
    BASE: '/api/models',
    SEARCH: '/api/models/search',
    CATEGORIES: '/api/models/categories',
    FEATURED: '/api/models/featured',
    POPULAR: '/api/models/popular',
    UPLOAD: '/api/models/upload'
  },
  USERS: {
    BASE: '/api/users',
    PROFILE: '/api/users/profile',
    FAVORITES: '/api/users/favorites',
    DOWNLOADS: '/api/users/downloads',
    UPLOADS: '/api/users/uploads'
  },
  STORAGE: {
    UPLOAD: '/api/storage/upload',
    DELETE: '/api/storage/delete'
  }
} as const

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  MODEL_CATEGORIES: 'model:categories',
  FEATURED_MODELS: 'model:featured',
  POPULAR_MODELS: 'model:popular',
  SEARCH_RESULTS: 'search:results',
  USER_FAVORITES: 'user:favorites',
  USER_DOWNLOADS: 'user:downloads'
} as const

// Cache durations (in seconds)
export const CACHE_DURATION = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400  // 24 hours
} as const

// Form validation limits
export const VALIDATION_LIMITS = {
  MODEL: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 1000,
    TAGS_MAX_COUNT: 10,
    TAG_MIN_LENGTH: 2,
    TAG_MAX_LENGTH: 20,
    PRODUCTS_MAX_COUNT: 10
  },
  USER: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    PASSWORD_MIN_LENGTH: 8,
    BIO_MAX_LENGTH: 500
  }
} as const

// Theme configuration
export const THEME_CONFIG = {
  DEFAULT_THEME: 'system',
  THEMES: ['light', 'dark', 'system'] as const
} as const

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
} as const

// Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
} as const

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
} as const

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  FILE_UPLOAD: 'Failed to upload file. Please try again.',
  FILE_TOO_LARGE: 'File is too large. Please choose a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please choose a supported file format.'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  MODEL_UPLOADED: 'Model uploaded successfully!',
  MODEL_UPDATED: 'Model updated successfully!',
  MODEL_DELETED: 'Model deleted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_VERIFIED: 'Email verified successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!'
} as const

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_PREMIUM: process.env.NEXT_PUBLIC_ENABLE_PREMIUM === 'true',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_COMMENTS: process.env.NEXT_PUBLIC_ENABLE_COMMENTS === 'true',
  ENABLE_RATINGS: process.env.NEXT_PUBLIC_ENABLE_RATINGS === 'true',
  ENABLE_SOCIAL_LOGIN: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true'
} as const

// External service URLs
export const EXTERNAL_URLS = {
  GITHUB: 'https://github.com',
  TWITTER: 'https://twitter.com',
  DISCORD: 'https://discord.gg',
  DOCUMENTATION: 'https://commonparts.org/docs',
  SUPPORT: 'https://commonparts.org/support',
  PRIVACY_POLICY: '/privacy',
  TERMS_OF_SERVICE: '/terms',
  CONTACT: '/contact'
} as const

// Default values
export const DEFAULTS = {
  AVATAR_URL: '/images/default-avatar.png',
  MODEL_THUMBNAIL: '/images/default-model-thumbnail.png',
  ITEMS_PER_PAGE: SEARCH_CONFIG.DEFAULT_PAGE_SIZE,
  SORT_BY: SORT_OPTIONS.NEWEST,
  THEME: THEME_CONFIG.DEFAULT_THEME
} as const