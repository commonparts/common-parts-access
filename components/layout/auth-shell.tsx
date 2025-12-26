import type React from "react"

import { cn } from "@/lib/utils"
import { Container } from "@/components/layout/container"
import { Grid } from "@/components/layout/grid"
import { Section } from "@/components/layout/section"

type AuthShellProps = {
  children: React.ReactNode
  size?: "sm" | "md"
  align?: "center" | "start"
  className?: string
}

export function AuthShell({ children, size = "sm", align = "center", className }: AuthShellProps) {
  return (
    <Section
      className={cn(
        "relative flex min-h-svh w-full overflow-hidden bg-[radial-gradient(circle_at_20%_20%,_rgba(89,199,155,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(249,115,22,0.16),_transparent_32%),radial-gradient(circle_at_50%_80%,_rgba(59,130,246,0.14),_transparent_42%)]",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.05)_1px,_transparent_1px),linear-gradient(240deg,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[length:40px_40px] opacity-40" />
      </div>

      <Container size={size} className="w-full">
        <Grid columns={12} className={cn("justify-center", align === "center" ? "items-center" : "items-start")}> 
          <div className="col-span-12 mx-auto flex justify-center">
            <div className="w-full max-w-container-sm">
              {children}
            </div>
          </div>
        </Grid>
      </Container>
    </Section>
  )
}
