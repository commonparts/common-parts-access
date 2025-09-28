import * as React from "react"
import { cn } from "@/lib/utils"
import { ModelCard } from "./model-card"

interface Model {
  id: string
  slug: string
  title: string
  description?: string
  thumbnailUrl?: string
  author: {
    username: string
    avatar?: string
  }
  stats: {
    downloads: number
    likes: number
    views: number
  }
  tags: string[]
  category: string
  createdAt: Date
  isPremium?: boolean
}

interface ModelGridProps {
  models: Model[]
  loading?: boolean
  variant?: "default" | "compact" | "detailed"
  columns?: number
  className?: string
  showAuthor?: boolean
  showStats?: boolean
}

export function ModelGrid({
  models,
  loading = false,
  variant = "default",
  columns,
  className,
  showAuthor = true,
  showStats = true
}: ModelGridProps) {
  const getGridCols = () => {
    if (columns) return `grid-cols-${columns}`
    switch (variant) {
      case "compact":
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      case "detailed":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      default:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    }
  }

  if (loading) {
    return (
      <div className={cn("grid gap-6", getGridCols(), className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-video bg-muted rounded-lg mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No models found</h3>
        <p className="text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-6", getGridCols(), className)}>
      {models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          variant={variant}
          showAuthor={showAuthor}
          showStats={showStats}
        />
      ))}
    </div>
  )
}