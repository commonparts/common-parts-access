import * as React from "react"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"

export function Footer() {
  return (
    <footer className="w-full border-t border-border-subtle bg-bg-surface backdrop-blur">
      <Container size="xl" className="flex flex-col gap-lg py-xl text-caption text-text-secondary">
        <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between sm:gap-xl">
          <div className="flex flex-col gap-xs">
            <Logo className="text-text-primary" />
          </div>
          <div className="flex flex-col gap-xs text-text-primary">
            <span className="text-caption uppercase tracking-wide text-text-secondary">Contact</span>
            <a
              href="mailto:contact@access.commonparts.org"
              className="text-body font-medium transition-colors hover:text-text-primary"
            >
              contact@access.commonparts.org
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-sm text-caption uppercase tracking-wide text-text-primary">
          <span className="rounded-full bg-action-primary px-md py-xs text-text-inverse">Open access for every repair</span>
        </div>
      </Container>
    </footer>
  )
}