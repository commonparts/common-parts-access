/**
 * Form validation utilities and schemas
 */

import { APP_URL } from '@/lib/utils/constants'

/**
 * Resolves an in-app path to an absolute URL on the canonical app origin.
 * Uses the URL constructor so a trailing slash on APP_URL never produces
 * a double slash (e.g. "https://site.com//model/x").
 */
export function absoluteAppUrl(path: string): string {
  return new URL(path, APP_URL).href
}

/**
 * Coerces an unknown JSON value to a trimmed string; non-strings become ''.
 * Use on untrusted request bodies so a malformed payload (e.g. {"name": 123})
 * stays on the caller's 400 path instead of throwing on .trim().
 */
export function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normalizes an entity name (brand, product) for storage and duplicate
 * comparison: trims and collapses internal whitespace runs to single spaces.
 * Case is preserved for display — case-insensitive matching happens in SQL.
 */
export function normalizeEntityName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Escapes ILIKE metacharacters (% _ \) in a literal string so it can be used
 * as a case-insensitive exact-match pattern without acting as a wildcard.
 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/**
 * Validates that a redirect path is a safe relative in-app path.
 * Accepts only strings that start with a single "/" (not "//") and contain
 * no ASCII control characters, whitespace, or backslashes — preventing
 * protocol-relative redirects and malformed Location header issues.
 *
 * The path is also percent-decoded before validation so encoded slashes or
 * backslashes cannot bypass the checks (for example, "/%5c%5cevil.com").
 */
export function isSafeRedirect(path: string): boolean {
  if (typeof path !== "string") return false;
  if (/[\u0000-\u001F\u007F]/.test(path)) return false;
  if (!/^\/(?!\/)[^\s\\]*$/.test(path)) return false;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return false;
  }

  if (/[\u0000-\u001F\u007F]/.test(decodedPath)) return false;
  return /^\/(?!\/)[^\s\\]*$/.test(decodedPath);
}

/**
 * Parses a 1-based page number from a URL search param.
 * Returns 1 for missing, malformed, or non-positive values.
 */
export function parsePageParam(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

/**
 * Email validation
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * URL validation
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validates that a URL uses only http or https scheme.
 * Rejects javascript:, data:, and any other scheme to prevent XSS
 * when user-supplied URLs are rendered as anchor href values.
 *
 * @param url - URL to validate
 * @returns True only for http/https URLs
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * UUID validation (any version, canonical 8-4-4-4-12 hex format)
 * @param value - String to validate
 * @returns True if the string is a well-formed UUID
 */
export function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Password strength validation
 * @param password - Password to validate
 * @returns Validation result with strength level and requirements
 */
export function validatePassword(password: string): {
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong'
  requirements: {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
  }
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }

  const passedCount = Object.values(requirements).filter(Boolean).length
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  if (passedCount >= 4) strength = 'strong'
  else if (passedCount >= 3) strength = 'medium'

  return {
    isValid: requirements.minLength && requirements.hasUpperCase && requirements.hasLowerCase && requirements.hasNumber,
    strength,
    requirements
  }
}

/**
 * Username validation
 * @param username - Username to validate
 * @returns Validation result
 */
export function validateUsername(username: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const trimmed = username.trim()

  if (trimmed.length < 3) {
    errors.push('Username must be at least 3 characters long')
  }

  if (trimmed.length > 20) {
    errors.push('Username must be no more than 20 characters long')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores')
  }

  if (/^[_-]|[_-]$/.test(trimmed)) {
    errors.push('Username cannot start or end with hyphens or underscores')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * File validation
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[] // MIME types or extensions
    allowedExtensions?: string[]
  } = {}
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { maxSize, allowedTypes = [], allowedExtensions = [] } = options

  // Size validation
  if (maxSize && file.size > maxSize) {
    errors.push(`File size must be less than ${formatFileSize(maxSize)}`)
  }

  // Type validation
  if (allowedTypes.length > 0) {
    const fileType = file.type.toLowerCase()
    const isAllowed = allowedTypes.some(type => 
      fileType.includes(type.toLowerCase())
    )
    
    if (!isAllowed) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }
  }

  // Extension validation
  if (allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name)
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Model validation schema
 * @param data - Model data to validate
 * @returns Validation result
 */
export function validateModel(data: {
  title: string
  description?: string
  category: string
  tags: string[]
  files: File[]
}): {
  isValid: boolean
  errors: Record<string, string[]>
} {
  const errors: Record<string, string[]> = {}

  // Title validation
  if (!data.title || data.title.trim().length < 3) {
    errors.title = ['Title must be at least 3 characters long']
  } else if (data.title.trim().length > 100) {
    errors.title = ['Title must be no more than 100 characters long']
  }

  // Description validation
  if (data.description && data.description.trim().length > 1000) {
    errors.description = ['Description must be no more than 1000 characters long']
  }

  // Category validation
  if (!data.category || data.category.trim().length === 0) {
    errors.category = ['Category is required']
  }

  // Tags validation
  if (data.tags.length > 10) {
    errors.tags = ['Maximum 10 tags allowed']
  }

  const invalidTags = data.tags.filter(tag => tag.trim().length < 2 || tag.trim().length > 20)
  if (invalidTags.length > 0) {
    errors.tags = [...(errors.tags || []), 'Tags must be between 2-20 characters long']
  }

  // Files validation
  if (!data.files || data.files.length === 0) {
    errors.files = ['At least one model file is required']
  } else if (data.files.length > 5) {
    errors.files = ['Maximum 5 files allowed']
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Sanitize HTML string to prevent XSS
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// Helper functions (these will be moved to formatters.ts)
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
}

