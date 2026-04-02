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
  contentId: string
}>({ open: false, toggle: () => {}, contentId: '' })

function Collapsible({ open: controlledOpen, onOpenChange, children, className }: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const contentId = React.useId()

  const toggle = React.useCallback(() => {
    const next = !open
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }, [open, isControlled, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open, toggle, contentId }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({ children, className }: CollapsibleTriggerProps) {
  const { open, toggle, contentId } = React.useContext(CollapsibleContext)

  return (
    <button
      type="button"
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

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open, contentId } = React.useContext(CollapsibleContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | undefined>(0)

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight : 0)
    }
  }, [open])

  return (
    <div
      id={contentId}
      role="region"
      className={cn("overflow-hidden transition-[height] duration-200 ease-in-out")}
      style={{ height: height ?? 0 }}
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
