/**
 * URL slug generation utilities
 */

/**
 * Convert string to URL-safe slug
 * @param str - String to convert
 * @returns URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug from a title, optionally with a suffix for uniqueness
 * @param title - The title to convert to slug
 * @param existingSlugs - Array of existing slugs to avoid duplicates
 * @returns Unique slug
 */
export function generateUniqueSlug(title: string, existingSlugs: string[] = []): string {
  const baseSlug = slugify(title)
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }
  
  let counter = 1
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
  }
  
  return uniqueSlug
}

/**
 * Extract slug from URL path
 * @param path - URL path (e.g., "/models/my-awesome-model")
 * @returns Extracted slug
 */
export function extractSlugFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

/**
 * Validate slug format
 * @param slug - Slug to validate
 * @returns True if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug)
}

/**
 * Generate random slug for temporary/anonymous items
 * @param prefix - Optional prefix
 * @param length - Length of random part (default: 8)
 * @returns Random slug
 */
export function generateRandomSlug(prefix: string = '', length: number = 8): string {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 2 + length)
  
  return prefix ? `${prefix}-${randomPart}` : randomPart
}