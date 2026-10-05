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
 * Longest edge, in device pixels, of the canvas holding the still frame. The
 * 8 MB upload limit bounds compressed bytes, not pixel dimensions, so a large
 * GIF copied at full size could allocate tens of MB per card. 1280 covers a
 * grid card at 2x density; the canvas costs at most 1280² × 4 bytes ≈ 6.5 MB.
 */
const STILL_FRAME_MAX_EDGE_PX = 1280

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
 * The animated image is hidden from the first server-rendered frame and only
 * ever revealed by the hover and focus variants, so it never shows on load,
 * before hydration or while the still frame is being drawn. If the frame
 * cannot be drawn, a neutral placeholder stands in for it.
 *
 * Relies on two groups set by PartCard: `group/card` on the card (keyboard
 * focus anywhere in it, via :focus-visible) and `group/thumb` on the thumbnail
 * (pointer hover). The reveal is gated by `motion-safe`, so with
 * prefers-reduced-motion the still frame is all that is ever shown.
 */
export function PartCardGifThumbnail({ src, alt, sizes, className }: PartCardGifThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [stillFailed, setStillFailed] = React.useState(false)

  const drawStillFrame = React.useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    const { naturalWidth, naturalHeight } = image
    if (!canvas || !context || naturalWidth === 0 || naturalHeight === 0) {
      setStillFailed(true)
      return
    }
    // Downscaled to the pixel budget, aspect ratio preserved; never upscaled.
    const scale = Math.min(1, STILL_FRAME_MAX_EDGE_PX / Math.max(naturalWidth, naturalHeight))
    canvas.width = Math.max(1, Math.round(naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(naturalHeight * scale))
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    setStillFailed(false)
  }, [])

  return (
    <div className={cn("absolute inset-0", stillFailed && "bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onLoad={(event) => drawStillFrame(event.currentTarget)}
        className="object-cover opacity-0 motion-safe:group-hover/thumb:opacity-100 motion-safe:group-has-[:focus-visible]/card:opacity-100"
      />
      {/* Transparent until the frame is drawn, so it can always sit on top. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover motion-safe:group-hover/thumb:opacity-0 motion-safe:group-has-[:focus-visible]/card:opacity-0"
      />
    </div>
  )
}
