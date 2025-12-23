import * as React from "react"

export function Footer() {
  return (
    <footer className="w-full border-t border-border-subtle bg-bg-surface backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-lg px-lg py-xl text-caption text-text-secondary sm:px-xl">
        <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between sm:gap-xl">
          <div className="flex flex-col gap-xs">
            <span className="font-heading text-heading-sm font-bold text-text-primary">PartHarbor</span>
          </div>
          <div className="flex flex-col gap-xs text-text-primary">
            <span className="text-caption uppercase tracking-wide text-text-secondary">Reach the crew</span>
            <a
              href="mailto:harbor@partharbor.com"
              className="text-body font-medium transition-colors hover:text-text-primary"
            >
              harbor@partharbor.com
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-sm text-caption uppercase tracking-wide text-text-primary">
          <span className="rounded-full bg-action-primary px-sm py-xs text-text-inverse">Safe harbor for every repair</span>
        </div>
      </div>
    </footer>
  )
}