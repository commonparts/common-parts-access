import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  }
  className?: string
  showAuthor?: boolean
  showStats?: boolean
  variant?: "default" | "compact" | "detailed"
}

export function ModelCard({ 
  model, 
  className, 
  showAuthor = true, 
  showStats = true,
  variant = "default"
}: ModelCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  if (variant === "compact") {
    return (
      <Card className={cn("group hover:shadow-lg transition-all duration-200", className)}>
        <Link href={`/model/${model.slug}`}>
          <div className="aspect-square relative overflow-hidden rounded-t-lg">
            {model.thumbnailUrl ? (
              <img 
                src={model.thumbnailUrl} 
                alt={model.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            {model.isPremium && (
              <Badge className="absolute top-2 right-2 bg-yellow-500">Premium</Badge>
            )}
          </div>
        </Link>
        <CardContent className="p-3">
          <Link href={`/model/${model.slug}`}>
            <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
              {model.title}
            </h3>
          </Link>
          {showStats && (
            <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {formatNumber(model.stats.likes)}
              </span>
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <Card className={cn("group hover:shadow-lg transition-all duration-200", className)}>
      <Link href={`/model/${model.slug}`}>
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          {model.thumbnailUrl ? (
            <img 
              src={model.thumbnailUrl} 
              alt={model.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
          {model.isPremium && (
            <Badge className="absolute top-2 right-2 bg-yellow-500">Premium</Badge>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>
      </Link>

      <CardHeader className="pb-2">
        <Link href={`/model/${model.slug}`}>
          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
            {model.title}
          </h3>
        </Link>
        {model.description && variant === "detailed" && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {model.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-2">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="secondary" className="text-xs">
            {model.category}
          </Badge>
          {model.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {model.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{model.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Author */}
        {showAuthor && (
          <Link href={`/user/${model.author.username}`} className="flex items-center space-x-2 hover:text-primary transition-colors">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {model.author.avatar ? (
                <img src={model.author.avatar} alt={model.author.username} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">@{model.author.username}</span>
          </Link>
        )}
      </CardContent>

      {showStats && (
        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {formatNumber(model.stats.likes)}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {formatNumber(model.stats.downloads)}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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