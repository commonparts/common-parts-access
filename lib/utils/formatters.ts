/**
 * Data formatting utilities
 */

import type { NumberFormatOptions } from 'next-intl'

/** Adds the known print-setting units, delegating number formatting to next-intl. */
export function formatPrintSetting(
  key: string,
  value: string | number | boolean | null,
  formatNumber: (value: number, options?: NumberFormatOptions) => string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
  const unit = key === 'layer_height' ? 'millimeter' : key === 'infill' ? 'percent' : undefined
  return formatNumber(value, unit ? { style: 'unit', unit } : undefined)
}

/**
 * Splits a print-time duration given in minutes into whole hours and minutes,
 * for the `printTime` message of the part card and the part page.
 * Returns null for missing or non-positive values so callers can omit it.
 * @example splitPrintTime(150) // { hours: 2, minutes: 30 }
 */
export function splitPrintTime(
  minutes: number | null | undefined,
): { hours: number; minutes: number } | null {
  if (minutes == null || !Number.isFinite(minutes)) return null
  // Round to whole minutes before the positivity check so fractional values
  // below half a minute return null instead of "0m", and so a fractional
  // value can't roll up to "1h 60m".
  const total = Math.round(minutes)
  if (total <= 0) return null
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

/** Decimal multiples of a byte that Intl.NumberFormat formats as units, smallest first. */
const FILE_SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/** The Intl units are decimal: a kilobyte is 1000 bytes. */
const BYTES_PER_KILOBYTE = 1000

/**
 * A file size as a value in the largest unit that keeps it at 1 or more, for
 * next-intl's unit formatter: `format.number(value, { style: 'unit', unit })`.
 * @example fileSizeUnit(2_500_000) // { value: 2.5, unit: 'megabyte' }
 */
export function fileSizeUnit(bytes: number): { value: number; unit: (typeof FILE_SIZE_UNITS)[number] } {
  const exponent =
    bytes > 0
      ? Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KILOBYTE)), FILE_SIZE_UNITS.length - 1)
      : 0
  return { value: bytes / BYTES_PER_KILOBYTE ** exponent, unit: FILE_SIZE_UNITS[exponent] }
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Converts rich HTML (as returned by source platforms) into readable plain
 * text for textarea pre-fill: <br> and block-element ends become newlines,
 * list items become "- " bullets, all other tags are stripped, common HTML
 * entities are decoded and blank runs are collapsed. Not a sanitizer — the
 * output contains no markup by construction.
 */
export function htmlToPlainText(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|figure|figcaption|table|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(x?)([0-9a-f]+);/gi, (match, hex, code) => {
      try {
        return String.fromCodePoint(Number.parseInt(code, hex ? 16 : 10))
      } catch {
        return match
      }
    })

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Format an ISO 3166-1 alpha-2 region code as its name in the given locale
 * ("FR" → "France" in English, "Allemagne" for "DE" in French). next-intl has
 * no display-name formatter. Falls back to the code itself when the runtime
 * does not know it.
 */
export function formatRegionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}
