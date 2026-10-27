import Image from "next/image"
import { cn } from "@/lib/utils"
import { isGifUrl } from "@/lib/utils/images"
import { PartCardGifThumbnail } from "./part-card-gif-thumbnail"

interface PartThumbnailProps {
  /** The part's `thumbnail_url`; null renders the placeholder. */
  src: string | null
  alt: string
  /** The `sizes` hint passed to next/image, matching the rendered width. */
  sizes: string
  /** Applied to the image only, not to the placeholder. */
  className?: string
}

/**
 * A part's thumbnail, filling its parent: the parent sets the size and the
 * aspect ratio and must be `relative` with `overflow-hidden`. The image is
 * cropped to cover it. A GIF shows a still frame that animates on hover or
 * keyboard focus (#217). A part without a thumbnail shows a placeholder icon.
 */
export function PartThumbnail({ src, alt, sizes, className }: PartThumbnailProps) {
  if (src && isGifUrl(src)) {
    return (
      <PartCardGifThumbnail
        key={src}
        src={src}
        alt={alt}
        sizes={sizes}
        className={className}
      />
    )
  }

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-muted">
      <svg
        aria-hidden="true"
        className="aspect-square h-1/3 max-h-2xl text-text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>
  )
}
