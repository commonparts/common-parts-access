import type React from "react"

import { cn } from "@/lib/utils"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"

export type DashboardShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ title, description, actions, children, className }: DashboardShellProps) {
  return (
    <Section>
      <Container size="xl" className={cn("space-y-lg", className)}>
        <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-xs">
            <h1 className="text-heading-md font-heading font-semibold text-text-primary">{title}</h1>
            {description ? <p className="text-body text-text-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-sm">{actions}</div> : null}
        </div>
        {children}
      </Container>
    </Section>
  )
}
