'use client'

import { useState, useEffect } from 'react'
import { PartGrid } from '@/components/model/part-grid'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import type { PartCardData } from '@/types/models'

interface FeaturedPartsResponse {
  models: PartCardData[]
  total: number
}

export function FeaturedModels() {
  const [parts, setParts] = useState<PartCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeaturedParts() {
      try {
        const response = await fetch('/api/models/featured')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch parts: ${response.statusText}`)
        }

        const data: FeaturedPartsResponse = await response.json()
        setParts(data.models)
      } catch (err) {
        console.error('Error fetching featured parts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load parts')
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedParts()
  }, [])

  if (error) {
    return (
      <Section>
        <Container size="xl">
          <div className="text-center py-xl">
            <div className="mx-auto mb-sm flex size-16 items-center justify-center rounded-full bg-border-subtle">
              <svg className="size-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-xs text-heading-sm font-semibold text-text-primary">Unable to load parts</h3>
            <p className="text-body text-text-secondary">{error}</p>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container size="xl" className="space-y-lg">
        <h2 className="text-heading-md font-heading font-semibold text-text-primary">Most downloaded parts</h2>

        <PartGrid parts={parts} loading={loading} variant="default" className="mb-lg" />

        {!loading && parts.length > 0 && (
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/browse">
                View more parts
              </Link>
            </Button>
          </div>
        )}
      </Container>
    </Section>
  )
}