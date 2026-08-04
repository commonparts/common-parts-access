import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's stock scales, so the token scales this
 * project defines in tailwind.config.ts have to be declared here. Without them
 * a token class is treated as an unrelated (or, worse, colliding) utility:
 * `text-micro text-text-inverse` used to collapse to the colour alone, because
 * `micro` was not recognised as a font size, and `px-md` could not override
 * `px-sm` because neither was recognised as padding.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // fontSize keys from tailwind.config.ts
      text: [
        "micro",
        "caption",
        "body",
        "bodyLg",
        "subtitle",
        "heading-sm",
        "heading-md",
        "heading-lg",
        "display",
        "display-lg",
      ],
      // spacing keys — drive padding, margin, gap, size, space
      spacing: [
        "3xs",
        "2xs",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
      ],
      // borderRadius keys beyond the stock ones
      radius: ["pill"],
    },
  },
  override: {
    // Stock Tailwind font sizes ship a default line-height, so tailwind-merge
    // drops any `leading-*` that precedes a `text-<size>`. This project's font
    // sizes are bare values with no line-height attached, so that rule would
    // silently delete a deliberate `leading-*` instead of replacing it.
    conflictingClassGroups: { "font-size": [] },
  },
})

/**
 * Utility function to merge class names with Tailwind CSS conflict resolution
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export all utilities from modular files
export * from './utils/slug'
export * from './utils/validation'
export * from './utils/formatters'
export * from './utils/constants'

// Performance utilities (keeping these in main file for now)

/**
 * Debounce function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return (...args: TArgs) => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function calls
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  limit: number
): (...args: TArgs) => void {
  let inThrottle = false
  return (...args: TArgs) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}








