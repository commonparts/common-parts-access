'use client'

import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface RegisteredImagesProps {
  /** Image URLs in canonical order — index 0 is the thumbnail. */
  urls: string[]
  className?: string
}

/**
 * Thumbnail grid of the images already registered on the draft, in the order
 * the part page will show them (issue #302). Shown on both tracks so it is
 * obvious the gallery is in place, rather than an opaque count.
 */
export function RegisteredImages({ urls, className }: RegisteredImagesProps) {
  if (urls.length === 0) return null

  return (
    <div className={cn('space-y-2xs', className)}>
      <p className="text-sm text-text-secondary">
        {urls.length} {urls.length === 1 ? 'image is' : 'images are'} on the draft, in slideshow
        order — the first is the thumbnail.
      </p>
      <div className="flex flex-wrap gap-2xs">
        {urls.map((url, index) => (
          <div
            key={url}
            className="relative h-3xl w-3xl overflow-hidden rounded-md border border-border-subtle bg-bg-subtle"
          >
            <Image
              src={url}
              alt={index === 0 ? 'Thumbnail' : `Image ${index + 1}`}
              fill
              sizes="80px"
              className="object-cover"
            />
            {index === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-background/70 py-px text-center text-xs text-text-primary">
                Thumbnail
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
