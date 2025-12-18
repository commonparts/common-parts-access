import * as React from "react"

export function Footer() {
  return (
    <footer className="w-full border-t bg-background/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-6 py-10 text-sm text-muted-foreground md:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <div className="flex flex-col gap-1">
            <span className="font-heading text-lg font-bold text-foreground">PartHarbor</span>
          </div>
          <div className="flex flex-col gap-1 text-foreground">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reach the crew</span>
            <a
              href="mailto:harbor@partharbor.com"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              harbor@partharbor.com
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.14em]">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Safe harbor for every repair</span>
        </div>
      </div>
    </footer>
  )
}