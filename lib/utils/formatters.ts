/**
 * Data formatting utilities
 */

/**
 * Format a count with its noun, pluralizing the noun for counts other than 1.
 * @example pluralize(2, 'part') // "2 parts"
 * @example pluralize(1, 'brand') // "1 brand"
 */
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/**
 * Format a print-time duration given in minutes as "2h 30m" / "45m" / "3h".
 * Returns null for missing or non-positive values so callers can omit it.
 */
export function formatPrintTime(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null
  // Round to whole minutes before the positivity check so fractional values
  // below half a minute return null instead of "0m", and so a fractional
  // value can't roll up to "1h 60m".
  const total = Math.round(minutes)
  if (total <= 0) return null
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Format file size from bytes to human readable format
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Format number with thousand separators
 * @param num - Number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num)
}



/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string, locale: string = 'en-US'): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'seconds')
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minutes')
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hours')
  } else if (diffInSeconds < 604800) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'days')
  } else if (diffInSeconds < 2629746) {
    return rtf.format(-Math.floor(diffInSeconds / 604800), 'weeks')
  } else if (diffInSeconds < 31556952) {
    return rtf.format(-Math.floor(diffInSeconds / 2629746), 'months')
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31556952), 'years')
  }
}

/**
 * Format date using various formats
 * @param date - Date to format
 * @param format - Format type
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' | 'full' | 'iso' = 'medium',
  locale: string = 'en-US'
): string {
  const targetDate = new Date(date)

  if (format === 'iso') {
    return targetDate.toISOString().split('T')[0]
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { dateStyle: 'short' as const },
    medium: { dateStyle: 'medium' as const },
    long: { dateStyle: 'long' as const },
    full: { dateStyle: 'full' as const }
  }[format]

  return new Intl.DateTimeFormat(locale, options).format(targetDate)
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






interface LicenseNoticeInput {
  /** Display name of the license, e.g. "CC BY-SA 4.0" */
  licenseName: string
  requiresAttribution: boolean
  /** True for ShareAlike/copyleft licenses (e.g. CC-BY-SA, GPL) */
  isCopyleft: boolean
  /** Name of the author to credit, if known */
  author?: string | null
}

/**
 * Builds the one-line informational license notice shown when a download
 * is triggered (issue #250): license, author, attribution obligation, and
 * the ShareAlike clause for copyleft licenses. Informational only — it
 * must never gate or block the download.
 */
export function formatLicenseNotice(input: LicenseNoticeInput): string {
  const sentences = [
    input.author
      ? `Licensed under ${input.licenseName}, by ${input.author}.`
      : `Licensed under ${input.licenseName}.`
  ]
  if (input.requiresAttribution) {
    sentences.push('Attribution to the author is required when sharing.')
  }
  if (input.isCopyleft) {
    sentences.push('Derivatives must be shared under the same license (ShareAlike).')
  }
  return sentences.join(' ')
}

/**
 * Get file extension from filename
 * @param filename - Filename to extract extension from
 * @returns File extension (lowercase, without dot)
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
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
