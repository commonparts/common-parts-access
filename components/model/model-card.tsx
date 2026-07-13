import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrintTime } from "@/lib/utils/formatters"

interface ModelCardProps {
  model: {
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
    // Optional part metadata (e.g. product page). Rendered as a compact meta
    // row + license badge when any is provided; other usages are unaffected.
    material?: string | null
    license?: string | null
    estimatedPrintTime?: number | null // minutes
  }
  className?: string
  showAuthor?: boolean
  showStats?: boolean
  variant?: "default" | "compact" | "detailed"
  // Optional overlay on the thumbnail (e.g. compatibility badge on a product
  // page). Rendered top-left so it never collides with the Premium badge.
  badge?: React.ReactNode
  // Render the part-meta row (material · print time · downloads) + license
  // badge. Downloads always show here; material/print/license are conditional.
  showPartMeta?: boolean
}

export function ModelCard({
  model,
  className,
  showAuthor = true,
  showStats = true,
  variant = "default",
  badge,
  showPartMeta = false,
}: ModelCardProps) {
  const printTime = formatPrintTime(model.estimatedPrintTime)
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const [now] = React.useState(() => Date.now())
  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - now) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  if (variant === "compact") {
    return (
      <Card className={cn("group transition-colors duration-200 hover:border-border-default", className)}>
        <Link href={`/model/${model.slug}`}>
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            {model.thumbnailUrl ? (
              <Image
                src={model.thumbnailUrl}
                alt={model.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <svg className="h-12 w-12 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            {model.isPremium && (
              <Badge className="absolute right-2 top-2 bg-yellow-500">Premium</Badge>
            )}
          </div>
        </Link>
        <CardContent className="space-y-1 p-3">
          <Link href={`/model/${model.slug}`}>
            <h3 className="line-clamp-2 min-h-[2lh] font-heading text-sm font-semibold text-text-primary transition-colors hover:text-primary">
              {model.title}
            </h3>
          </Link>
          {showStats && (
            <div className="mt-1 flex items-center space-x-3 text-xs text-text-secondary">
              <span className="flex items-center">
                <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {formatNumber(model.stats.likes)}
              </span>
              <span className="flex items-center">
                <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {formatNumber(model.stats.downloads)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("group transition-colors duration-200 hover:border-border-default", className)}>
      <Link href={`/model/${model.slug}`}>
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {model.thumbnailUrl ? (
            <Image
              src={model.thumbnailUrl}
              alt={model.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <svg className="h-16 w-16 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
          {model.isPremium && (
            <Badge className="absolute top-2 right-2 bg-yellow-500">Premium</Badge>
          )}
          {badge && <div className="absolute left-sm top-sm z-10">{badge}</div>}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>
      </Link>

      <CardHeader className="pb-2">
        <Link href={`/model/${model.slug}`}>
          <h3 className="line-clamp-2 min-h-[2lh] font-heading text-heading-sm font-semibold text-text-primary transition-colors hover:text-primary">
            {model.title}
          </h3>
        </Link>
        {model.description && variant === "detailed" && (
          <p className="mt-1 line-clamp-2 text-body text-text-secondary">
            {model.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-sm pb-2">
        {/* Author */}
        {showAuthor && (
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted">
              {model.author.avatar ? (
                <Image
                  src={model.author.avatar}
                  alt={model.author.username}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg aria-hidden="true" className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-text-primary">@{model.author.username}</span>
          </div>
        )}

        {/* Part metadata (material, print time, downloads) + license badge */}
        {showPartMeta && (
          <>
            <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-text-secondary">
              {model.material && <span>{model.material}</span>}
              {printTime && <span>{printTime}</span>}
              <span>{formatNumber(model.stats.downloads)} downloads</span>
            </div>
            {model.license && <Badge variant="outline">{model.license}</Badge>}
          </>
        )}
      </CardContent>

      {showStats && (
        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {formatNumber(model.stats.likes)}
              </span>
              <span className="flex items-center">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {formatNumber(model.stats.downloads)}
              </span>
              <span className="flex items-center">
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {formatNumber(model.stats.views)}
              </span>
            </div>
            <span className="text-xs">
              {formatDate(model.createdAt)}
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}