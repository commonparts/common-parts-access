"use client"

import * as React from "react"

// Static, expandable helper explaining how to find a product's exact reference.
// Content is intentionally generic (works for any appliance brand).
export function HowToCheckReference() {
  const [open, setOpen] = React.useState(false)
  const contentId = React.useId()

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-subtle">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-sm px-md py-sm text-left text-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
      >
        How to check your reference
        <svg
          aria-hidden="true"
          className={`size-sm shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          id={contentId}
          className="space-y-sm border-t border-border-subtle px-md py-sm text-sm text-text-secondary"
        >
          <p>
            The exact reference (model number) tells you which parts are guaranteed to fit. Two
            products in the same series can differ in small ways, so it&rsquo;s worth confirming.
          </p>
          <ul className="list-disc space-y-xs pl-lg">
            <li>Check the rating label on the underside or back of the appliance.</li>
            <li>Look inside the battery or accessory compartment.</li>
            <li>Match the full code, including the suffix after the slash (e.g. HC9450/15).</li>
          </ul>
          <p>
            If your exact reference isn&rsquo;t listed, parts marked &ldquo;Fits&rdquo; the series are a
            strong starting point.
          </p>
        </div>
      )}
    </div>
  )
}
