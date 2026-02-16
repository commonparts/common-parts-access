import type React from "react"

import { cn } from "@/lib/utils"

export type SectionProps = {
  children: React.ReactNode
  className?: string
}

export function Section({ children, className }: SectionProps) {
  return <section className={cn("py-2xl", className)}>{children}</section>
}
