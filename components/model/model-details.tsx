'use client'

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModelFileList } from "./model-file-list"


interface ModelDetailsProps {
  slug: string
  className?: string
}

interface ModelFile {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  file_url: string
  file_category: string
  created_at: string
}

// ModelComment interface hidden for MVP
// interface ModelComment {
//   id: string
//   content: string
//   rating?: number
//   createdAt: string
//   updatedAt: string
//   author: {
//     username: string
//     displayName?: string
//     avatar?: string
//     verifiedMaker: boolean
//   } | null
// }

interface ModelData {
  id: string
  slug: string
  name: string
  description?: string
  partDetails: {
    partName?: string
    partNumber?: string
    material?: string
    color?: string
    dimensions?: any
  }
  printSettings?: any
  estimatedPrintTime?: number
  estimatedMaterialUsage?: number
  thumbnailUrl?: string
  images: string[]
  stats: {
    downloads: number
    likes: number
    views: number
  }
  viewerHasLiked?: boolean
  tags: string[]
  license: string
  instructions?: string
  notes?: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName?: string
    bio?: string
    avatar?: string
    website?: string
    location?: string
    reputationScore: number
    verifiedMaker: boolean
    memberSince: string
  } | null
  product?: {
    id: string
    name: string
    slug: string
    modelNumber?: string
    description?: string
    releaseYear?: number
    discontinued: boolean
    image?: string
    brand?: {
      id: string
      name: string
      slug: string
      description?: string
      logo?: string
      website?: string
      verified: boolean
    }
  }
  category?: {
    id: string
    name: string
    slug: string
    description?: string
    icon?: string
    path?: string
  }
  brand?: {
    id: string
    name: string
    slug: string
    description?: string
    logo?: string
    website?: string
    verified: boolean
  }
  files: ModelFile[]
  // comments: ModelComment[] // Hidden for MVP
}

export function ModelDetails({ slug, className }: ModelDetailsProps) {
  const [model, setModel] = useState<ModelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [likePending, setLikePending] = useState(false)

  const adjustLikes = useCallback((liked: boolean, delta: number) => {
    setModel(prev => {
      if (!prev) return prev
      return {
        ...prev,
        viewerHasLiked: liked,
        stats: {
          ...prev.stats,
          likes: Math.max(0, prev.stats.likes + delta)
        }
      }
    })
  }, [])

  const syncLikes = useCallback((liked: boolean, likes?: number) => {
    setModel(prev => {
      if (!prev) return prev
      return {
        ...prev,
        viewerHasLiked: liked,
        stats: {
          ...prev.stats,
          likes: typeof likes === 'number' ? Math.max(0, likes) : prev.stats.likes
        }
      }
    })
  }, [])

  useEffect(() => {
    async function fetchModel() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/models/${slug}/details`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Model not found')
          }
          throw new Error(`Failed to fetch model: ${response.statusText}`)
        }
        
        const data = await response.json()
        const normalizedModel = data?.model
          ? { ...data.model, viewerHasLiked: Boolean(data.model.viewerHasLiked) }
          : null
        setModel(normalizedModel)
      } catch (err) {
        console.error('Error fetching model:', err)
        setError(err instanceof Error ? err.message : 'Failed to load model')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchModel()
    }
  }, [slug])

  const handleLikeToggle = useCallback(async () => {
    if (!model || likePending) {
      return
    }

    const nextLiked = !(model.viewerHasLiked ?? false)
    const targetSlug = model.slug

    adjustLikes(nextLiked, nextLiked ? 1 : -1)
    setLikePending(true)

    try {
      const response = await fetch(`/api/models/${targetSlug}/likes`, {
        method: nextLiked ? 'POST' : 'DELETE'
      })

      if (response.status === 401) {
        adjustLikes(!nextLiked, nextLiked ? -1 : 1)
        if (typeof window !== 'undefined') {
          const redirectTarget = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
          window.location.href = redirectTarget
        }
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update like status')
      }

      const payload = await response.json()
      syncLikes(payload.liked ?? nextLiked, payload.likes)
    } catch (err) {
      console.error('Like toggle failed:', err)
      adjustLikes(!nextLiked, nextLiked ? -1 : 1)
      alert('Unable to update like. Please try again.')
    } finally {
      setLikePending(false)
    }
  }, [model, likePending, adjustLikes, syncLikes])

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatPrintTime = (minutes?: number) => {
    if (!minutes) return 'Not specified'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-video bg-muted rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Unable to load model</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return null
  }

  const allImages = [
    ...(model.thumbnailUrl ? [model.thumbnailUrl] : []),
    ...model.images
  ].filter(Boolean)

  // File filtering is now handled by ModelFileList component

  return (
    <div className={cn("w-full space-y-8", className)}>
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-video relative overflow-hidden rounded-lg border">
            {allImages.length > 0 ? (
              <img 
                src={allImages[selectedImageIndex]} 
                alt={model.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Thumbnail Navigation */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded border overflow-hidden",
                    index === selectedImageIndex 
                      ? "ring-2 ring-primary border-primary" 
                      : "hover:opacity-75"
                  )}
                >
                  <img 
                    src={image} 
                    alt={`${model.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{model.name}</h1>
            {model.partDetails.partName && (
              <p className="text-lg text-muted-foreground mb-4">
                Part: {model.partDetails.partName}
              </p>
            )}
            {model.description && (
              <p className="text-muted-foreground leading-relaxed">
                {model.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">{model.stats.downloads}</span>
              <span className="text-muted-foreground">downloads</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-medium">{model.stats.likes}</span>
              <span className="text-muted-foreground">likes</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-medium">{model.stats.views}</span>
              <span className="text-muted-foreground">views</span>
            </div>
          </div>

          {/* Tags */}
          {model.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {model.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              size="lg" 
              className="flex items-center gap-2"
              onClick={async () => {
                // Import download function dynamically to avoid SSR issues
                const { downloadAllModelFiles } = await import('@/lib/storage/download')
                
                try {
                  const result = await downloadAllModelFiles(model.files, model.slug, model.name)
                  if (!result.success) {
                    // Don't show error if it's just a redirect to login
                    if (!result.requiresAuth) {
                      console.error('Download failed:', result.error)
                      alert(`Download failed: ${result.error}`)
                    }
                  }
                } catch (error) {
                  console.error('Download error:', error)
                  alert('Download failed. Please try again.')
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Files
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
              onClick={handleLikeToggle}
              disabled={likePending}
              aria-pressed={model.viewerHasLiked}
            >
              {likePending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill={model.viewerHasLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              {model.viewerHasLiked ? 'Liked' : 'Like'}
            </Button>
          </div>

          {/* Author Info */}
          {model.author && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Created by</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {model.author.avatar ? (
                    <img 
                      src={model.author.avatar} 
                      alt={model.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {model.author.displayName || model.author.username}
                    </span>
                    {model.author.verifiedMaker && (
                      <Badge variant="secondary" className="text-xs">
                        Verified Maker
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{model.author.username}
                  </p>
                  {model.author.location && (
                    <p className="text-sm text-muted-foreground">
                      📍 {model.author.location}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid - Organic Layout */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {/* Part Details */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Part Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.partDetails.partNumber && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground font-medium">Part Number</span>
                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{model.partDetails.partNumber}</span>
              </div>
            )}
            {model.partDetails.material && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground font-medium">Material</span>
                <span className="font-medium">{model.partDetails.material}</span>
              </div>
            )}
            {model.partDetails.color && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground font-medium">Color</span>
                <span className="font-medium">{model.partDetails.color}</span>
              </div>
            )}
            {model.partDetails.dimensions && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground font-medium">Dimensions</span>
                <div className="bg-muted/50 p-3 rounded-lg">
                  {typeof model.partDetails.dimensions === 'object' ? (
                    <div className="space-y-1 text-sm">
                      {model.partDetails.dimensions.length && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Length:</span>
                          <span className="font-mono">{model.partDetails.dimensions.length} mm</span>
                        </div>
                      )}
                      {model.partDetails.dimensions.width && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Width:</span>
                          <span className="font-mono">{model.partDetails.dimensions.width} mm</span>
                        </div>
                      )}
                      {model.partDetails.dimensions.height && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Height:</span>
                          <span className="font-mono">{model.partDetails.dimensions.height} mm</span>
                        </div>
                      )}
                      {model.partDetails.dimensions.diameter && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Diameter:</span>
                          <span className="font-mono">{model.partDetails.dimensions.diameter} mm</span>
                        </div>
                      )}
                      {model.partDetails.dimensions.thickness && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Thickness:</span>
                          <span className="font-mono">{model.partDetails.dimensions.thickness} mm</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-mono">{String(model.partDetails.dimensions)}</p>
                  )}
                </div>
              </div>
            )}
            {model.category && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground font-medium">Category</span>
                <span className="font-medium">
                  {model.category.name}
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-muted-foreground font-medium">License</span>
              <Badge variant="outline" className="w-fit">{model.license}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-muted-foreground font-medium">Uploaded</span>
              <span className="text-sm">{formatDate(model.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Print Settings */}
        {(model.printSettings || model.estimatedPrintTime || model.estimatedMaterialUsage) && (
          <Card className="break-inside-avoid mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a2 2 0 01-2-2V5a2 2 0 012-2H14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7v10l3-3 3 3V7z" />
                </svg>
                Print Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {model.estimatedPrintTime && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Print Time</p>
                    <p className="font-semibold">{formatPrintTime(model.estimatedPrintTime)}</p>
                  </div>
                </div>
              )}
              {model.estimatedMaterialUsage && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Material Usage</p>
                    <p className="font-semibold">{model.estimatedMaterialUsage}g</p>
                  </div>
                </div>
              )}
              {model.printSettings && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recommended Settings</h4>
                  <div className="space-y-2">
                    {typeof model.printSettings === 'object' && Object.entries(model.printSettings).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-xs">{String(value)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Compatible Product */}
        {model.product && (
          <Card className="break-inside-avoid mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Compatible Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                {model.product.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                    <img 
                      src={model.product.image} 
                      alt={model.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-clamp-2">
                    {model.product.name}
                  </div>
                  {model.product.modelNumber && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Model: <span className="font-mono">{model.product.modelNumber}</span>
                    </p>
                  )}
                  {model.product.brand && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium">
                        {model.product.brand.name}
                      </span>
                      {model.product.brand.verified && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Files */}
        <ModelFileList 
          files={model.files}
          showCard={true}
          modelSlug={model.slug}
          onFileDownload={async (file: ModelFile) => {
            // Import download function dynamically to avoid SSR issues
            const { downloadFile } = await import('@/lib/storage/download')
            
            try {
              const result = await downloadFile(file, model.slug)
              if (!result.success) {
                // Don't show error if it's just a redirect to login
                if (!result.requiresAuth) {
                  console.error('Download failed:', result.error)
                  alert(`Download failed: ${result.error}`)
                }
              }
            } catch (error) {
              console.error('Download error:', error)
              alert('Download failed. Please try again.')
            }
          }}
        />

        {/* Instructions */}
        {model.instructions && (
          <Card className="break-inside-avoid mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{model.instructions}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {model.notes && (
          <Card className="break-inside-avoid mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{model.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comments Section - Hidden for MVP */}
      {/* Comments functionality will be added in a future release */}
    </div>
  )
}
