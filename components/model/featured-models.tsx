'use client'

import { useState, useEffect } from 'react'
import { ModelGrid } from '@/components/model/model-grid'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

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
      <Section>
        <Container size="lg">
          <div className="text-center py-xl">
            <div className="mx-auto mb-sm flex size-16 items-center justify-center rounded-full bg-border-subtle">
              <svg className="size-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-xs text-heading-sm font-semibold text-text-primary">Unable to load models</h3>
            <p className="text-body text-text-secondary">{error}</p>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container size="lg" className="space-y-lg">
        <div className="space-y-xs text-center">
          <h2 className="text-heading-md font-heading font-semibold text-text-primary">Most Downloaded Models</h2>
          <p className="text-body text-text-secondary max-w-2xl mx-auto">
            Discover the most popular 3D models and parts shared by our community
          </p>
        </div>

        <ModelGrid 
          models={models}
          loading={loading}
          variant="default"
          showAuthor={true}
          showStats={true}
          className="mb-lg"
        />

        {!loading && models.length > 0 && (
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/browse">
                View More Models
              </Link>
            </Button>
          </div>
        )}
      </Container>
    </Section>
  )
}