import { Inter, Outfit, JetBrains_Mono } from 'next/font/google'

// Outfit for headings - friendly, geometric
export const headingFont = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

// Inter for body and UI text
export const bodyFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// JetBrains Mono for numeric values and specifications
export const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})
