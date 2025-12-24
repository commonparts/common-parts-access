import type React from "react"

import { cn } from "@/lib/utils"
import { Container } from "@/components/layout/container"

type AuthShellProps = {
  children: React.ReactNode
  size?: "sm" | "md"
  align?: "center" | "start"
  className?: string
}

export function AuthShell({ children, size = "sm", align = "center", className }: AuthShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-svh w-full justify-center px-lg",
        align === "center" ? "items-center py-xl" : "items-start py-2xl",
        className,
      )}
    >
      <Container size={size} className="w-full">
        {children}
      </Container>
    </div>
  )
}
