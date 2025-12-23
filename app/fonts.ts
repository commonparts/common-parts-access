import { Inter, Outfit, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export { inter, outfit, jetbrainsMono }