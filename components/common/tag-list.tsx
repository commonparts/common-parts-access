import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface TagListProps {
  tags: string[]
  onTagClick?: (tag: string) => void
  removable?: boolean
  onRemove?: (tag: string) => void
  className?: string
  variant?: "default" | "outline" | "secondary"
  size?: "sm" | "default" | "lg"
}

export function TagList({
  tags,
  onTagClick,
  removable = false,
  onRemove,
  className,
  variant = "secondary",
  size = "default"
}: TagListProps) {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={variant}
          className={cn(
            "cursor-pointer transition-colors",
            size === "sm" && "text-xs px-2 py-0.5",
            size === "lg" && "text-sm px-3 py-1",
            onTagClick && "hover:bg-primary hover:text-primary-foreground"
          )}
          onClick={() => onTagClick?.(tag)}
        >
          {tag}
          {removable && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(tag)
              }}
              className="ml-1 hover:text-destructive"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </Badge>
      ))}
    </div>
  )
}