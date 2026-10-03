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
 * Returns the hostname of a URL with any leading "www." stripped, or null
 * for unparseable input. Used to compare user-supplied URLs against platform
 * base URLs without being tripped up by the www prefix.
 */
export function normalizedHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
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
