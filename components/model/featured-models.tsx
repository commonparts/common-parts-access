'use client'

import { useState, useEffect } from 'react'
import { ModelGrid } from '@/components/model/model-grid'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

interface FeaturedModelsResponse {
  models: (Omit<Model, 'createdAt'> & { createdAt: string })[]
  total: number
}

export function FeaturedModels() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeaturedModels() {
      try {
        const response = await fetch('/api/models/featured')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`)
        }

        const data: FeaturedModelsResponse = await response.json()
        // Convert createdAt strings back to Date objects
        const modelsWithDates = data.models.map(model => ({
          ...model,
          createdAt: new Date(model.createdAt)
        }))
        setModels(modelsWithDates)
      } catch (err) {
        console.error('Error fetching featured models:', err)
        setError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedModels()
  }, [])

  if (error) {
    return (
      <section className="w-full py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to load models</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Most Downloaded Models
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the most popular 3D models and parts shared by our community
          </p>
        </div>

        <ModelGrid 
          models={models}
          loading={loading}
          variant="default"
          showAuthor={true}
          showStats={true}
          className="mb-8"
        />

        {!loading && models.length > 0 && (
          <div className="text-center">
            <Button asChild size="lg" variant="outline">
              <Link href="/browse">
                View More Models
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}