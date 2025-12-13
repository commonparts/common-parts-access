'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ModelGrid } from '@/components/model/model-grid'
import { SortOptions, SortOptionsDropdown } from '@/components/browse/sort-options'
import { SearchBar } from '@/components/layout/search-bar'
import { Pagination } from '@/components/browse/pagination'
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
  
  // State
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // URL parameters
  const currentPage = parseInt(searchParams.get('page') || '1')
  const currentSort = searchParams.get('sortBy') || 'popularity'
  const currentSearch = searchParams.get('search') || ''

  // Update URL without page reload
  const updateURL = useCallback((params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value)
      } else {
        newSearchParams.delete(key)
      }
    })

    // Reset to page 1 when changing search or sort
    if (params.sortBy || params.search !== undefined) {
      newSearchParams.set('page', '1')
    }

    router.push(`/browse?${newSearchParams.toString()}`)
  }, [router, searchParams])

  // Fetch models
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: currentSort,
        sortOrder: 'desc'
      })

      if (currentSearch) {
        params.set('search', currentSearch)
      }

      const response = await fetch(`/api/models?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data: ModelsResponse = await response.json()
      
      // Convert createdAt strings back to Date objects
      const modelsWithDates = data.models.map(model => ({
        ...model,
        createdAt: new Date(model.createdAt)
      }))
      
      setModels(modelsWithDates)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching models:', err)
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [currentPage, currentSort, currentSearch])

  // Effect to fetch data when parameters change
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Handlers
  const handleSortChange = (sortBy: string) => {
    updateURL({ sortBy })
  }

  const handleSearchChange = (search: string) => {
    updateURL({ search: search || '' })
  }

  const handlePageChange = (page: number) => {
    updateURL({ page: page.toString() })
  }

  const clearSearch = () => {
    updateURL({ search: '' })
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to load models</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchModels()}>
              Try Again
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Browse 3D Models
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover and download 3D models and replacement parts from our community
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Sort Options - Left Side */}
          <div className="flex-1">
            {/* Desktop: Horizontal buttons */}
            <div className="hidden md:block">
              <SortOptions 
                value={currentSort} 
                onChange={handleSortChange}
              />
            </div>
            {/* Mobile: Dropdown */}
            <div className="md:hidden">
              <SortOptionsDropdown 
                value={currentSort} 
                onChange={handleSortChange}
              />
            </div>
          </div>

          {/* Search Bar - Right Side */}
          <div className="w-full sm:w-auto sm:min-w-[300px]">
            <SearchBar
              placeholder="Search models..."
              onSearch={handleSearchChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Active Search Display */}
        {currentSearch && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <span className="text-sm">
              Showing results for <strong>&quot;{currentSearch}&quot;</strong>
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearSearch}
              className="h-6 px-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        )}

        {/* Results Summary */}
        {!loading && (
          <div className="mb-6 text-sm text-muted-foreground">
            {pagination.total} models found
            {currentSearch && ` for “${currentSearch}”`}
          </div>
        )}

        {/* Model Grid */}
        <div className="mb-8">
          <ModelGrid 
            models={models}
            loading={loading}
            variant="default"
            showAuthor={true}
            showStats={true}
          />
        </div>

        {/* Pagination */}
        {!loading && models.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            showInfo={true}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            className="mt-8"
          />
        )}
      </main>
    </div>
  )
}
