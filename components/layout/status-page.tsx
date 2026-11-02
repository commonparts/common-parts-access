import type React from "react"

import { Container } from "@/components/layout/container"
import { Symbol } from "@/components/layout/logo"
import { Section } from "@/components/layout/section"
import { cn } from "@/lib/utils"

interface StatusPageProps {
  eyebrow: string
  title: string
  description: string
  /** The recovery actions, as `Button`s. */
  children: React.ReactNode
  className?: string
}

/**
 * Full-screen page shown in place of a route that cannot render: the
 * not-found page and the error boundary. These render outside the public
 * layout, so the brand mark stands in for the navbar.
 */
export function StatusPage({ eyebrow, title, description, children, className }: StatusPageProps) {
  return (
    <Section className={cn("flex min-h-screen items-center bg-bg-surface", className)}>
      <Container size="sm" className="flex flex-col items-center gap-lg text-center">
        <Symbol className="size-xl" bodyColor="var(--color-text-primary)" />
        <div className="space-y-sm">
          <p className="text-micro font-medium uppercase tracking-caps text-text-secondary">{eyebrow}</p>
          <h1 className="text-heading-lg text-text-primary">{title}</h1>
          <p className="text-body text-text-secondary">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-sm">{children}</div>
      </Container>
    </Section>
  )
}
