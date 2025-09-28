'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


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

interface ModelComment {
  id: string
  content: string
  rating?: number
  createdAt: string
  updatedAt: string
  author: {
    username: string
    displayName?: string
    avatar?: string
    verifiedMaker: boolean
  } | null
}

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
  comments: ModelComment[]
}

export function ModelDetails({ slug, className }: ModelDetailsProps) {
  const [model, setModel] = useState<ModelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

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
        setModel(data.model)
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

  const modelFiles = model.files.filter(file => file.file_category === 'model')
  const documentationFiles = model.files.filter(file => file.file_category === 'documentation')
  const imageFiles = model.files.filter(file => file.file_category === 'image')

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
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Files
            </Button>
            <Button variant="outline" size="lg" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Like
            </Button>
            <Button variant="outline" size="lg">
              Share
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
                    <Link 
                      href={`/user/${model.author.username}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {model.author.displayName || model.author.username}
                    </Link>
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

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Print Settings */}
          {(model.printSettings || model.estimatedPrintTime || model.estimatedMaterialUsage) && (
            <Card>
              <CardHeader>
                <CardTitle>Print Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {model.estimatedPrintTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Print Time:</span>
                    <span className="font-medium">{formatPrintTime(model.estimatedPrintTime)}</span>
                  </div>
                )}
                {model.estimatedMaterialUsage && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material Usage:</span>
                    <span className="font-medium">{model.estimatedMaterialUsage}g</span>
                  </div>
                )}
                {model.printSettings && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Recommended Settings:</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {typeof model.printSettings === 'object' && Object.entries(model.printSettings).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {model.instructions && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{model.instructions}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {model.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{model.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Part Details */}
          <Card>
            <CardHeader>
              <CardTitle>Part Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {model.partDetails.partNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Part Number:</span>
                  <span className="font-medium">{model.partDetails.partNumber}</span>
                </div>
              )}
              {model.partDetails.material && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-medium">{model.partDetails.material}</span>
                </div>
              )}
              {model.partDetails.color && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color:</span>
                  <span className="font-medium">{model.partDetails.color}</span>
                </div>
              )}
              {model.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <Link 
                    href={`/browse?category=${model.category.slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {model.category.name}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">License:</span>
                <span className="font-medium">{model.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded:</span>
                <span className="font-medium">{formatDate(model.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          {model.product && (
            <Card>
              <CardHeader>
                <CardTitle>Compatible Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  {model.product.image && (
                    <img 
                      src={model.product.image} 
                      alt={model.product.name}
                      className="w-16 h-16 rounded border object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <Link 
                      href={`/product/${model.product.slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {model.product.name}
                    </Link>
                    {model.product.modelNumber && (
                      <p className="text-sm text-muted-foreground">
                        Model: {model.product.modelNumber}
                      </p>
                    )}
                    {model.product.brand && (
                      <div className="flex items-center gap-1 mt-1">
                        <Link 
                          href={`/brand/${model.product.brand.slug}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {model.product.brand.name}
                        </Link>
                        {model.product.brand.verified && (
                          <Badge variant="outline" className="text-xs">
                            Verified
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
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 3D Model Files */}
              {modelFiles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">3D Models</h4>
                  <div className="space-y-2">
                    {modelFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {file.original_filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentation Files */}
              {documentationFiles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Documentation</h4>
                  <div className="space-y-2">
                    {documentationFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {file.original_filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {model.files.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comments Section */}
      {model.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comments ({model.comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {model.comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {comment.author?.avatar ? (
                      <img 
                        src={comment.author.avatar} 
                        alt={comment.author.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {comment.author && (
                        <Link 
                          href={`/user/${comment.author.username}`}
                          className="font-medium text-sm hover:text-primary transition-colors"
                        >
                          {comment.author.displayName || comment.author.username}
                        </Link>
                      )}
                      {comment.author?.verifiedMaker && (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg 
                              key={i} 
                              className={cn(
                                "w-3 h-3",
                                i < comment.rating! ? "text-yellow-400 fill-current" : "text-muted-foreground"
                              )} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
