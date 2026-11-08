'use client'

import * as React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { SOCIAL_FEATURES_ENABLED } from "@/lib/utils/feature-flags"
import { isValidHttpUrl } from "@/lib/utils/validation"
import { formatPrintSetting, splitPrintTime } from "@/lib/utils/formatters"
import { sortImageUrls } from "@/lib/utils/images"
import { describePublication } from "@/lib/utils/publication"
import type { PrintReportStats } from "@/lib/utils/print-reports"
import type { PartPageFile } from "@/types/parts"
import { Grid } from "@/components/layout/grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PartFileList } from "./part-file-list"
import type { PrintReportReference } from "./print-report-controls"
import { CompatibleProducts } from "./compatible-products"
import { SourceLink } from "./source-link"


/**
 * Statuses with a public badge, keyed to their `PartDetails.verificationStatus`
 * message. `certified` is deliberately absent: certification is frozen and
 * must not be promised publicly (#326).
 */
const VERIFICATION_STATUS_KEYS = {
  unverified: 'unverified',
  author_tested: 'authorTested',
  community_validated: 'communityValidated',
} as const

/** The dimensions shown on the part page, in display order. */
const DIMENSION_KEYS = ['length', 'width', 'height', 'diameter', 'thickness'] as const

/** Field label in the Attribution & license card: an eyebrow, distinct from every value (#204). */
const ATTRIBUTION_LABEL_CLASS = "text-micro font-medium uppercase tracking-caps text-text-secondary"

/** Base of every link in the Attribution & license card, with the keyboard focus ring. */
const ATTRIBUTION_LINK_CLASS =
  "rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"

interface PartDetailsProps {
  slug: string
  className?: string
}

interface PartDimensions {
  length?: number
  width?: number
  height?: number
  diameter?: number
  thickness?: number
  unit?: string
}

type PrintSettings = Record<string, string | number | boolean | null>

/** A license as the part page shows it: a linked badge and the download notice. */
interface PartLicense {
  name: string
  shortName: string
  url: string
  requiresAttribution: boolean
  isCopyleft: boolean
}

interface PartData {
  id: string
  slug: string
  name: string
  description?: string
  isPublished: boolean
  partDetails: {
    partName?: string
    partNumber?: string
    material?: string
    color?: string
    dimensions?: PartDimensions | string | null
  }
  printSettings?: PrintSettings | null
  estimatedPrintTime?: number
  estimatedMaterialUsage?: number
  thumbnailUrl?: string
  images: string[]
  stats: {
    likes: number
  }
  viewerHasLiked?: boolean
  tags: string[]
  license: PartLicense | null
  originType: 'original' | 'curated' | 'manufacturer'
  verificationStatus: 'unverified' | 'author_tested' | 'community_validated' | 'certified'
  fileHostingType: 'hosted' | 'link_out'
  sourcePlatform?: string | null
  sourcePlatformName?: string | null
  sourceUrl?: string | null
  originalAuthor?: string | null
  originalAuthorUrl?: string | null
  instructions?: string
  notes?: string
  createdAt: string
  /** The account that uploaded an original part. Null on a curated part (#372). */
  author: {
    username: string
    displayName?: string
    avatar?: string
    location?: string
    verifiedMaker: boolean
  } | null
  products?: {
    id: string
    name: string
    slug: string
    brand?: {
      name: string
      slug: string
      verified: boolean
    } | null
    /** The product's category, shown beside it rather than as a property of the part (#372). */
    category?: {
      name: string
      slug: string
    } | null
    /** Print report counters and the evidence level they derive (issues #317, #318). */
    reportStats: PrintReportStats
    /** The product's references, offered as optional detail on a print report. */
    references: PrintReportReference[]
  }[]
  /**
   * Every brand the part is filed under, derived from its compatible products
   * (issue #315). Empty when the part links to no product.
   */
  brands?: {
    id: string
    name: string
    slug: string
  }[]
  files: PartPageFile[]
}

/** Why the part could not be shown, for the matching message. */
type PartLoadError = 'notFound' | 'failed'

export function PartDetails({ slug, className }: PartDetailsProps) {
  const t = useTranslations('PartDetails')
  const card = useTranslations('PartCard')
  const publicationLabels = useTranslations('Publication')
  const format = useFormatter()
  const locale = useLocale()
  const [part, setPart] = useState<PartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PartLoadError | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [likePending, setLikePending] = useState(false)
  const [downloadPending, setDownloadPending] = useState(false)
  const [licenseNoticeVisible, setLicenseNoticeVisible] = useState(false)
  const viewTrackedRef = useRef(false)

  // Non-blocking license notice shown once a download is triggered (issue #250).
  // A curated part keeps the license chosen at the source (#374) and credits
  // the original author.
  const licenseNotice = useMemo(() => {
    if (!part?.license) return null
    const author =
      part.originalAuthor || part.author?.displayName || part.author?.username || null
    // License and author, then the attribution obligation and, for copyleft
    // licenses, the ShareAlike clause. Informational only: it never gates
    // the download.
    const license = part.license.shortName || part.license.name
    return [
      author ? t('licenseNotice.byAuthor', { license, author }) : t('licenseNotice.license', { license }),
      part.license.requiresAttribution && t('licenseNotice.attribution'),
      part.license.isCopyleft && t('licenseNotice.shareAlike'),
    ]
      .filter(Boolean)
      .join(' ')
  }, [part, t])

  const adjustLikes = useCallback((liked: boolean, delta: number) => {
    setPart(prev => {
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
    setPart(prev => {
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

  const updateReportStats = useCallback((productId: string, reportStats: PrintReportStats) => {
    setPart(prev => {
      if (!prev?.products) return prev
      return {
        ...prev,
        products: prev.products.map(p => (p.id === productId ? { ...p, reportStats } : p)),
      }
    })
  }, [])

  useEffect(() => {
    async function fetchPart() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/parts/${slug}/details?locale=${locale}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('notFound')
            return
          }
          throw new Error(`Failed to fetch part: ${response.statusText}`)
        }
        
        const data = await response.json()
        const normalizedPart = data?.part
          ? { ...data.part, viewerHasLiked: Boolean(data.part.viewerHasLiked) }
          : null
        setPart(normalizedPart)
      } catch (err) {
        console.error('Error fetching part:', err)
        setError('failed')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchPart()
    }
  }, [slug, locale])

  useEffect(() => {
    if (!part || viewTrackedRef.current) return

    viewTrackedRef.current = true
    const controller = new AbortController()

    const trackView = async () => {
      try {
        await fetch(`/api/parts/${part.slug}/view`, {
          method: 'POST',
          signal: controller.signal,
        })
      } catch (err) {
        // DOMException from AbortController is not an Error subclass, so check safely
        if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: unknown }).name === 'AbortError') return
        console.error('View tracking failed:', err)
      }
    }

    trackView()

    return () => {
      controller.abort()
    }
  }, [part])

  const handleLikeToggle = useCallback(async () => {
    if (!part || likePending) {
      return
    }

    const nextLiked = !(part.viewerHasLiked ?? false)
    const targetSlug = part.slug

    adjustLikes(nextLiked, nextLiked ? 1 : -1)
    setLikePending(true)

    try {
      const response = await fetch(`/api/parts/${targetSlug}/likes`, {
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
      alert(t('likeFailed'))
    } finally {
      setLikePending(false)
    }
  }, [part, likePending, adjustLikes, syncLikes, t])

  /** Shows a failed download; the reason comes from the download API. */
  const alertDownloadFailure = (reason: string | undefined) =>
    alert(reason ? t('downloadFailedReason', { reason }) : t('downloadFailed'))

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="animate-pulse space-y-lg">
          <Grid columns={12} className="items-start gap-lg">
            <div className="col-span-12 lg:col-span-7">
              <div className="aspect-video rounded-lg border border-border-subtle bg-bg-muted" />
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-sm">
              <div className="h-8 w-3/4 rounded bg-bg-muted" />
              <div className="h-4 w-full rounded bg-bg-muted" />
              <div className="h-4 w-2/3 rounded bg-bg-muted" />
              <div className="h-10 w-40 rounded bg-bg-muted" />
            </div>
          </Grid>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-bg-muted rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('errorTitle')}</h3>
          <p role="alert" className="text-body text-status-errorText">{t(`error.${error}`)}</p>
        </div>
      </div>
    )
  }

  if (!part) {
    return null
  }

  const allImages = sortImageUrls([...new Set([
    ...(part.thumbnailUrl ? [part.thumbnailUrl] : []),
    ...part.images,
  ].filter(Boolean))])

  // How the part entered the registry, in the reader's vocabulary (#301).
  const publication = describePublication(part.originType, part.fileHostingType)
  const printTime = splitPrintTime(part.estimatedPrintTime)
  const dimensions = part.partDetails.dimensions
  const verificationKey =
    part.verificationStatus === 'certified' ? null : VERIFICATION_STATUS_KEYS[part.verificationStatus]

  // The platform's display name, or its slug when the platform is not listed.
  const sourcePlatformLabel = part.sourcePlatformName ?? part.sourcePlatform

  // File filtering is now handled by PartFileList component

  return (
    <div className={cn("w-full space-y-lg", className)}>
      <Grid columns={12} className="items-start gap-lg">
        <div className="col-span-12 lg:col-span-7 space-y-sm">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border-subtle bg-bg-muted">
            {allImages.length > 0 ? (
              <Image
                src={allImages[selectedImageIndex]}
                alt={part.name}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-secondary">
                <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-sm overflow-x-auto pb-2">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "shrink-0 overflow-hidden rounded border",
                    "h-16 w-16",
                    index === selectedImageIndex
                      ? "border-action-primary ring-2 ring-action-primary"
                      : "hover:opacity-80",
                  )}
                >
                  <Image
                    src={image}
                    alt={t('imageAlt', { name: part.name, index: index + 1 })}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-md">
          <div className="space-y-xs">
            {/* The badge is a one-word summary, so what it means is carried as
                visually hidden text rather than a title attribute — keyboard
                users and most screen readers never surface a tooltip. It is
                absolutely positioned, so it is not a flex item and adds no gap. */}
            <Badge variant="outline">
              {publicationLabels(`${publication}.badge`)}
              <span className="sr-only">{t('publicationDescription', { description: publicationLabels(`${publication}.description`) })}</span>
            </Badge>
            {part.brands && part.brands.length > 0 && (
              <p className="text-micro font-medium uppercase tracking-caps text-text-secondary">
                {part.brands.map((brand, index) => (
                  <React.Fragment key={brand.id}>
                    {index > 0 && <span aria-hidden="true"> · </span>}
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="rounded-sm transition-colors hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                    >
                      {brand.name}
                    </Link>
                  </React.Fragment>
                ))}
              </p>
            )}
            <h1 className="text-heading-lg font-heading font-semibold text-text-primary">{part.name}</h1>
            {part.originType === 'curated' && part.originalAuthor && (
              <p className="text-body text-text-secondary">
                {t.rich(sourcePlatformLabel ? 'originalDesignOn' : 'originalDesign', {
                  author: part.originalAuthor,
                  platform: sourcePlatformLabel ?? '',
                  credit: (chunks) =>
                    part.originalAuthorUrl && isValidHttpUrl(part.originalAuthorUrl) ? (
                      <a
                        href={part.originalAuthorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-text-primary hover:underline"
                      >
                        {chunks}
                      </a>
                    ) : (
                      <span className="font-medium text-text-primary">{chunks}</span>
                    ),
                })}
              </p>
            )}
            {part.partDetails.partName && (
              <p className="text-body text-text-secondary">{t('partName', { name: part.partDetails.partName })}</p>
            )}
            {part.description && (
              <p className="text-body text-text-secondary leading-relaxed">{part.description}</p>
            )}
          </div>

          {/* Likes are the only counter on the page (#372), so the row exists
              only while social features are on. */}
          {SOCIAL_FEATURES_ENABLED && (
            <div className="flex flex-wrap items-center gap-md text-body text-text-secondary">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t.rich('likes', {
                  count: part.stats.likes,
                  strong: (chunks) => <span className="font-semibold text-text-primary">{chunks}</span>,
                })}
              </div>
            </div>
          )}

          {part.tags.length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {part.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="uppercase tracking-wide">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-sm">
            <div className="flex flex-wrap gap-sm">
              {part.fileHostingType === 'link_out' ? (
                part.sourceUrl && isValidHttpUrl(part.sourceUrl) ? (
                  <Button asChild className="inline-flex items-center gap-xs">
                    <SourceLink href={part.sourceUrl} slug={part.slug} context="part_page">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {part.sourcePlatformName ? t('viewOn', { platform: part.sourcePlatformName }) : t('viewOnSource')}
                    </SourceLink>
                  </Button>
                ) : (
                  <Button className="inline-flex items-center gap-xs" disabled>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {part.sourcePlatformName ? t('viewOn', { platform: part.sourcePlatformName }) : t('viewOnSource')}
                  </Button>
                )
              ) : (
                <Button
                  className="inline-flex items-center gap-xs"
                  disabled={downloadPending}
                  aria-busy={downloadPending}
                  onClick={async () => {
                    setDownloadPending(true)
                    setLicenseNoticeVisible(true)
                    try {
                      const { downloadAllPartFiles } = await import('@/lib/storage/download')
                      const result = await downloadAllPartFiles(part.files, part.slug, part.name)
                      if (!result.success) {
                        console.error('Download failed:', result.error)
                        alertDownloadFailure(result.error)
                      }
                    } catch (error) {
                      console.error('Download error:', error)
                      alertDownloadFailure(undefined)
                    } finally {
                      setDownloadPending(false)
                    }
                  }}
                >
                  {downloadPending ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {t(downloadPending ? 'preparingDownload' : 'download')}
                </Button>
              )}
              {SOCIAL_FEATURES_ENABLED && (
                <Button
                  variant="outline"
                  className="inline-flex items-center gap-xs"
                  onClick={handleLikeToggle}
                  disabled={likePending}
                  aria-pressed={part.viewerHasLiked}
                >
                  {likePending ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill={part.viewerHasLiked ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                  {t(part.viewerHasLiked ? 'liked' : 'like')}
                </Button>
              )}
            </div>

            {licenseNoticeVisible && licenseNotice && (
              <p role="status" className="text-sm text-text-secondary">
                {licenseNotice}
              </p>
            )}

          </div>

          {/* The API returns no author for a curated part: its page credits the
              original designer under the title instead (#372). */}
          {part.author && (
            <Card className="border-border-subtle">
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
                  {t('createdBy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-sm">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-bg-muted">
                  {part.author.avatar ? (
                    <Image
                      src={part.author.avatar}
                      alt={part.author.username}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg className="h-6 w-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-semibold text-text-primary">
                      {part.author.displayName || part.author.username}
                    </span>
                    {part.author.verifiedMaker && (
                      <Badge variant="soft">
                        {t('verifiedMaker')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">@{part.author.username}</p>
                  {part.author.location && (
                    <p className="text-sm text-text-secondary">📍 {part.author.location}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Grid>

      {/* Full width so a long list never stretches the cards below (issue #355) */}
      {part.products && part.products.length > 0 && (
        <CompatibleProducts
          partId={part.id}
          products={part.products}
          canReport={part.isPublished}
          onReportStatsChange={updateReportStats}
        />
      )}

      <Grid columns={12} className="items-start gap-lg">
        {part.instructions && (
          <Card className="col-span-12 lg:col-span-8 border-border-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-institutional-malachite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('instructions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{part.instructions}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="col-span-12 md:col-span-6 xl:col-span-4 border-border-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-institutional-malachite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t('details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {part.partDetails.partNumber && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-text-secondary font-medium">{t('partNumber')}</span>
                <span className="font-mono text-sm bg-bg-muted px-2 py-1 rounded">{part.partDetails.partNumber}</span>
              </div>
            )}
            {part.partDetails.material && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-text-secondary font-medium">{t('material')}</span>
                <span className="font-medium">{part.partDetails.material}</span>
              </div>
            )}
            {part.partDetails.color && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-text-secondary font-medium">{t('color')}</span>
                <span className="font-medium">{part.partDetails.color}</span>
              </div>
            )}
            {dimensions && (
              <div className="flex flex-col gap-2">
                <span className="text-text-secondary font-medium">{t('dimensions')}</span>
                <div className="bg-bg-subtle p-3 rounded-lg">
                  {typeof dimensions === 'object' ? (
                    <div className="space-y-1 text-sm">
                      {DIMENSION_KEYS.map((key) =>
                        dimensions[key] ? (
                          <div key={key} className="flex justify-between">
                            <span className="text-text-primary">{t(`dimension.${key}`)}</span>
                            <span className="font-mono">{dimensions[key]} {dimensions.unit || 'mm'}</span>
                          </div>
                        ) : null,
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-mono">{String(dimensions)}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-text-secondary font-medium">
                {t(part.originType === 'curated' ? 'added' : 'uploaded')}
              </span>
              <span className="text-sm">
                {format.dateTime(new Date(part.createdAt), { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Print Settings */}
        {(part.printSettings || part.estimatedPrintTime || part.estimatedMaterialUsage) && (
          <Card className="col-span-12 md:col-span-6 xl:col-span-4 border-border-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-institutional-malachite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a2 2 0 01-2-2V5a2 2 0 012-2H14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7v10l3-3 3 3V7z" />
                </svg>
                {t('printSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {printTime && (
                <div className="flex items-center gap-2 p-3 bg-bg-subtle rounded-lg">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{t('printTime')}</p>
                    <p className="font-semibold">{card('printTime', printTime)}</p>
                  </div>
                </div>
              )}
              {part.estimatedMaterialUsage && (
                <div className="flex items-center gap-2 p-3 bg-bg-subtle rounded-lg">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{t('materialUsage')}</p>
                    <p className="font-semibold">
                      {format.number(part.estimatedMaterialUsage, { style: 'unit', unit: 'gram', unitDisplay: 'narrow' })}
                    </p>
                  </div>
                </div>
              )}
              {part.printSettings && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t('recommendedSettings')}</h4>
                  <div className="space-y-2">
                    {typeof part.printSettings === 'object' && Object.entries(part.printSettings).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-text-secondary capitalize">{key.replace(/_/g, ' ')}</span>
                        <Badge variant="outline">{formatPrintSetting(key, value, format.number)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attribution & license */}
        <Card className="col-span-12 md:col-span-6 xl:col-span-4 border-border-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-institutional-malachite" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('attribution')}
            </CardTitle>
          </CardHeader>
          {/* Each field has its own treatment so the card scans at a glance
              (#204): the designer as the strongest line, the source as a
              link, the license as a badge with its full name, and the
              verification status last, in a quieter footer. */}
          <CardContent>
            <dl className="space-y-sm">
              {/* Source attribution — only rendered when a source URL is present */}
              {part.sourceUrl && isValidHttpUrl(part.sourceUrl) && (
                <>
                  {part.originalAuthor && (
                    <div className="space-y-3xs">
                      <dt className={ATTRIBUTION_LABEL_CLASS}>{t('originalAuthor')}</dt>
                      <dd className="text-bodyLg font-semibold text-text-primary">
                        {part.originalAuthorUrl && isValidHttpUrl(part.originalAuthorUrl) ? (
                          <a
                            href={part.originalAuthorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(ATTRIBUTION_LINK_CLASS, "underline-offset-4")}
                          >
                            {part.originalAuthor}
                          </a>
                        ) : (
                          part.originalAuthor
                        )}
                      </dd>
                    </div>
                  )}

                  <div className="space-y-3xs">
                    <dt className={ATTRIBUTION_LABEL_CLASS}>{t('source')}</dt>
                    {sourcePlatformLabel && (
                      <dd className="text-body font-medium text-text-primary">{sourcePlatformLabel}</dd>
                    )}
                    <dd className="text-caption">
                      <SourceLink
                        href={part.sourceUrl}
                        slug={part.slug}
                        context="part_page"
                        className={cn(ATTRIBUTION_LINK_CLASS, "break-all text-text-secondary underline underline-offset-2 hover:text-text-primary")}
                      >
                        {sourcePlatformLabel ? t('viewOn', { platform: sourcePlatformLabel }) : t('viewOriginal')}
                      </SourceLink>
                    </dd>
                  </div>
                </>
              )}

              {/* License — always rendered, one per part (#372) */}
              <div className="space-y-3xs">
                <dt className={ATTRIBUTION_LABEL_CLASS}>{t('license')}</dt>
                {part.license ? (
                  <>
                    <dd>
                      <a
                        href={part.license.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(ATTRIBUTION_LINK_CLASS, "inline-flex transition hover:opacity-80")}
                      >
                        <Badge variant="outline" size="md">{part.license.shortName}</Badge>
                      </a>
                    </dd>
                    {part.license.name !== part.license.shortName && (
                      <dd className="text-caption text-text-secondary">{part.license.name}</dd>
                    )}
                  </>
                ) : (
                  <dd>
                    <Badge variant="outline" size="md">—</Badge>
                  </dd>
                )}
              </div>

              {/* Verification status — last and quieter: it qualifies the part
                  rather than crediting anyone. Hidden for statuses with no
                  public label. */}
              {verificationKey && (
                <div className="flex flex-wrap items-center justify-between gap-xs border-t border-border-subtle pt-sm">
                  <dt className={ATTRIBUTION_LABEL_CLASS}>{t('verification')}</dt>
                  <dd>
                    <Badge variant="soft">{t(`verificationStatus.${verificationKey}`)}</Badge>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Files */}
        {/* Files — only shown for hosted parts */}
        {part.fileHostingType !== 'link_out' && (
        <div className="col-span-12 space-y-sm lg:col-span-6 xl:col-span-8">
          <PartFileList
            files={part.files}
            showCard={true}
            onFileDownload={async (file: PartPageFile) => {
              setLicenseNoticeVisible(true)
              const { downloadFile } = await import('@/lib/storage/download')

              try {
                const result = await downloadFile(file, part.slug)
                if (!result.success) {
                  console.error('Download failed:', result.error)
                  alertDownloadFailure(result.error)
                }
              } catch (error) {
                console.error('Download error:', error)
                alertDownloadFailure(undefined)
              }
            }}
          />
          {licenseNoticeVisible && licenseNotice && (
            <p role="status" className="text-sm text-text-secondary">
              {licenseNotice}
            </p>
          )}
        </div>
        )}

        {/* Notes */}
        {part.notes && (
          <Card className="col-span-12 lg:col-span-6 border-border-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-institutional-malachite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {t('notes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{part.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* Comments have no UI yet; when one is built, gate it behind SOCIAL_FEATURES_ENABLED (issue #322) */}
    </div>
  )
}
