'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Pagination } from '@/components/browse/pagination'
import { SortOptions, SortOptionsDropdown } from '@/components/browse/sort-options'
import { Container } from '@/components/layout/container'
import { Grid } from '@/components/layout/grid'
import { SearchBar } from '@/components/layout/search-bar'
import { Section } from '@/components/layout/section'
import { ModelGrid } from '@/components/model/model-grid'
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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ModelsResponse {
  models: Model[]
  pagination: PaginationInfo
}

export default function BrowsePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })

  const currentPage = parseInt(searchParams.get('page') || '1')
  const currentSort = searchParams.get('sortBy') || 'popularity'
  const currentSearch = searchParams.get('search') || ''
  const currentProduct = searchParams.get('productId') || ''

  const updateURL = useCallback(
    (params: Record<string, string>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newSearchParams.set(key, value)
        } else {
          newSearchParams.delete(key)
        }
      })

      if (params.sortBy || params.search !== undefined) {
        newSearchParams.set('page', '1')
      }

      router.push(`/browse?${newSearchParams.toString()}`)
    },
    [router, searchParams],
  )

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: currentSort,
        sortOrder: 'desc',
      })

      if (currentSearch) {
        params.set('search', currentSearch)
      }

      if (currentProduct) params.set('productId', currentProduct)

      const response = await fetch(`/api/models?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data: ModelsResponse = await response.json()

      const modelsWithDates = data.models.map((model) => ({
        ...model,
        createdAt: new Date(model.createdAt),
      }))

      setModels(modelsWithDates)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching models:', err)
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [currentPage, currentSort, currentSearch, currentProduct])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleSortChange = (sortBy: string) => updateURL({ sortBy })
  const handleSearchChange = (search: string) => updateURL({ search: search || '' })
  const handlePageChange = (page: number) => updateURL({ page: page.toString() })
  const clearSearch = () => updateURL({ search: '' })

  if (error) {
    return (
      <Section>
        <Container size="lg" className="space-y-md text-center">
          <div className="mx-auto mb-sm flex size-16 items-center justify-center rounded-full bg-border-subtle">
            <svg className="size-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-xs">
            <h3 className="text-heading-sm font-semibold text-text-primary">Unable to load models</h3>
            <p className="text-body text-text-secondary">{error}</p>
          </div>
          <Button onClick={() => fetchModels()}>Try again</Button>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container size="xl" className="space-y-lg">
        <div className="space-y-xs">
          <h1 className="text-heading-md font-heading font-semibold text-text-primary">Browse 3D Models</h1>
          <p className="text-body text-text-secondary">
            Discover and download 3D models and replacement parts from our community
          </p>
        </div>

        <Grid columns={12} className="items-start gap-md">
          <div className="col-span-12 space-y-sm md:col-span-6">
            <div className="hidden md:block">
              <SortOptions value={currentSort} onChange={handleSortChange} />
            </div>
            <div className="md:hidden">
              <SortOptionsDropdown value={currentSort} onChange={handleSortChange} />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <SearchBar
              value={currentSearch}
              onChange={handleSearchChange}
              onClear={clearSearch}
            />
          </div>
        </Grid>

        <ModelGrid
          models={models}
          loading={loading}
          variant="default"
          showAuthor={true}
          showStats={true}
          className="mb-lg"
        />

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
        />
      </Container>
    </Section>
  )
}
