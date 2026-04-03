"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  toggle: () => void
  triggerId: string
  contentId: string
}>({ open: false, toggle: () => {}, triggerId: '', contentId: '' })

function Collapsible({ open: controlledOpen, onOpenChange, children, className }: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const contentId = React.useId()
  const triggerId = `${contentId}-trigger`

  const toggle = React.useCallback(() => {
    const next = !open
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }, [open, isControlled, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open, toggle, triggerId, contentId }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({ children, className }: CollapsibleTriggerProps) {
  const { open, toggle, triggerId, contentId } = React.useContext(CollapsibleContext)

  return (
    <button
      type="button"
      id={triggerId}
      onClick={toggle}
      aria-expanded={open}
      aria-controls={contentId}
      className={cn("flex w-full items-center justify-between", className)}
    >
      {children}
      <svg
        aria-hidden="true"
        focusable="false"
        className={cn(
          "h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200",
          open && "rotate-180"
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

const TRANSITION_DURATION_MS = 200

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open, triggerId, contentId } = React.useContext(CollapsibleContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | 'auto'>(0)

  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return

    if (open) {
      setHeight(el.scrollHeight)
      const timer = setTimeout(() => setHeight('auto'), TRANSITION_DURATION_MS)
      return () => clearTimeout(timer)
    }
    // Collapse: snap to current scrollHeight first so the transition animates from a fixed value
    setHeight(el.scrollHeight)
    requestAnimationFrame(() => setHeight(0))
  }, [open])

  React.useEffect(() => {
    const el = contentRef.current
    if (!el || !open) return

    const observer = new ResizeObserver(() => {
      setHeight((currentHeight) =>
        currentHeight === 'auto' ? currentHeight : el.scrollHeight
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      className={cn("overflow-hidden transition-[height] duration-200 ease-in-out")}
      style={{ height: height === 'auto' ? 'auto' : height }}
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <div ref={contentRef} className={className}>
        {children}
      </div>
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
