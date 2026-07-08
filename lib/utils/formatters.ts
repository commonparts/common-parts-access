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
 * Format number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Format percentage
 * @param value - Value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
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
 * Format time
 * @param date - Date to format
 * @param format - Format type
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string,
  format: 'short' | 'medium' | 'long' = 'short',
  locale: string = 'en-US'
): string {
  const targetDate = new Date(date)
  
  const options: Intl.DateTimeFormatOptions = {
    short: { timeStyle: 'short' as const },
    medium: { timeStyle: 'medium' as const },
    long: { timeStyle: 'long' as const }
  }[format]

  return new Intl.DateTimeFormat(locale, options).format(targetDate)
}

/**
 * Format duration from milliseconds
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
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
 * Capitalize first letter of each word
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Convert string to title case
 * @param str - String to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

/**
 * Convert camelCase to readable text
 * @param str - CamelCase string
 * @returns Readable text
 */
export function camelCaseToWords(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/**
 * Format phone number
 * @param phoneNumber - Phone number to format
 * @param format - Format type (default: 'us')
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string, format: 'us' | 'international' = 'us'): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  if (format === 'us' && cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
  }
  
  return phoneNumber
}

/**
 * Format model stats for display
 * @param stats - Model statistics
 * @returns Formatted stats object
 */
export function formatModelStats(stats: {
  downloads?: number
  views?: number
  likes?: number
  fileSize?: number
  uploadedAt?: Date | string
}): {
  downloads: string
  views: string
  likes: string
  fileSize: string
  uploadedAt: string
} {
  return {
    downloads: stats.downloads ? formatNumber(stats.downloads) : '0',
    views: stats.views ? formatNumber(stats.views) : '0',
    likes: stats.likes ? formatNumber(stats.likes) : '0',
    fileSize: stats.fileSize ? formatFileSize(stats.fileSize) : '0 Bytes',
    uploadedAt: stats.uploadedAt ? formatRelativeTime(stats.uploadedAt) : 'Unknown'
  }
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
 * Get filename without extension
 * @param filename - Full filename
 * @returns Filename without extension
 */
export function getFilenameWithoutExtension(filename: string): string {
  return filename.substring(0, filename.lastIndexOf('.'))
}