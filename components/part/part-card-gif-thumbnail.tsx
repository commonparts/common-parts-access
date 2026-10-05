"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface PartCardGifThumbnailProps {
  src: string
  alt: string
  sizes: string
  className?: string
}

/**
 * Grid thumbnail for a GIF (#217): a still frame by default, the animation
 * only while the pointer is over the thumbnail or the card holds keyboard
 * focus.
 *
 * next/image serves animated images as-is, so the still frame is drawn
 * client-side: once the GIF loads, it is painted onto a canvas, which the
 * HTML spec has draw the first frame of an animation. The animated image
 * stays mounted underneath and is revealed by CSS, so no extra file is
 * stored and no request is repeated on hover.
 *
 * Relies on two groups set by PartCard: `group/card` on the card (keyboard
 * focus anywhere in it, via :focus-visible) and `group/thumb` on the thumbnail
 * (pointer hover). The reveal is gated by `motion-safe`, so with
 * prefers-reduced-motion the still frame is all that is ever shown.
 */
export function PartCardGifThumbnail({ src, alt, sizes, className }: PartCardGifThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [stillReady, setStillReady] = React.useState(false)

  const drawStillFrame = React.useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context || image.naturalWidth === 0) return
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.drawImage(image, 0, 0)
    setStillReady(true)
  }, [])

  return (
    <div className={cn("absolute inset-0", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onLoad={(event) => drawStillFrame(event.currentTarget)}
        // Hidden until revealed; if the still frame could not be drawn, the
        // image stays visible rather than leave an empty thumbnail.
        className={cn(
          "object-cover",
          stillReady &&
            "opacity-0 motion-safe:group-hover/thumb:opacity-100 motion-safe:group-has-[:focus-visible]/card:opacity-100",
        )}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-cover",
          stillReady
            ? "motion-safe:group-hover/thumb:opacity-0 motion-safe:group-has-[:focus-visible]/card:opacity-0"
            : "opacity-0",
        )}
      />
    </div>
  )
}
