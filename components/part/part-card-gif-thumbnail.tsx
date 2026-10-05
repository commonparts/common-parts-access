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

/** Set by PartCard on the card: the scope of keyboard focus. */
const CARD_SELECTOR = "[data-part-card]"

/** Set by PartCard on the thumbnail: the scope of pointer hover. */
const THUMBNAIL_SELECTOR = "[data-part-card-thumbnail]"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/** Before hydration nothing animates, so the server snapshot is "reduced". */
function getServerReducedMotion() {
  return true
}

type StillFrameState = "pending" | "drawn" | "failed"

/**
 * Grid thumbnail for a GIF (#217): a still frame by default, the animation
 * only while the pointer is over the thumbnail or the card holds keyboard
 * focus, and never with prefers-reduced-motion.
 *
 * next/image serves animated images as-is, so the still frame is drawn
 * client-side: once the GIF loads, it is painted onto a canvas, which the
 * HTML spec has draw the first frame of an animation.
 *
 * The animated image is mounted only while it is needed: until the still
 * frame is drawn (it is that frame's source), then while the card is hovered
 * or focused. An image hidden by CSS keeps decoding and advancing frames, so
 * a grid of idle GIFs would otherwise keep every animation running. Remounting
 * on hover reuses the browser cache. The animated image stays transparent
 * until it has loaded, so the still frame is never replaced by an empty box.
 * If the image fails to load or the frame cannot be drawn, a neutral
 * placeholder stands in for it.
 */
export function PartCardGifThumbnail({ src, alt, sizes, className }: PartCardGifThumbnailProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [stillFrame, setStillFrame] = React.useState<StillFrameState>("pending")
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [animationLoaded, setAnimationLoaded] = React.useState(false)
  const reducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  )

  const active = (hovered || focused) && !reducedMotion
  const animationMounted = stillFrame === "pending" || active

  // A remount loads the image again: it stays transparent until then.
  const [wasMounted, setWasMounted] = React.useState(animationMounted)
  if (wasMounted !== animationMounted) {
    setWasMounted(animationMounted)
    if (!animationMounted) setAnimationLoaded(false)
  }

  const showAnimation = active && animationLoaded

  React.useEffect(() => {
    const root = rootRef.current
    const thumbnail = root?.closest<HTMLElement>(THUMBNAIL_SELECTOR) ?? root
    const card = root?.closest<HTMLElement>(CARD_SELECTOR) ?? thumbnail
    if (!thumbnail || !card) return

    const onPointerEnter = () => setHovered(true)
    const onPointerLeave = () => setHovered(false)
    const onFocusIn = (event: FocusEvent) => {
      setFocused(event.target instanceof Element && event.target.matches(":focus-visible"))
    }
    const onFocusOut = (event: FocusEvent) => {
      // Focus moving within the card is re-evaluated by the next focusin.
      if (!(event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) {
        setFocused(false)
      }
    }

    thumbnail.addEventListener("pointerenter", onPointerEnter)
    thumbnail.addEventListener("pointerleave", onPointerLeave)
    card.addEventListener("focusin", onFocusIn)
    card.addEventListener("focusout", onFocusOut)
    return () => {
      thumbnail.removeEventListener("pointerenter", onPointerEnter)
      thumbnail.removeEventListener("pointerleave", onPointerLeave)
      card.removeEventListener("focusin", onFocusIn)
      card.removeEventListener("focusout", onFocusOut)
    }
  }, [])

  const drawStillFrame = React.useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    const { naturalWidth, naturalHeight } = image
    if (!canvas || !context || naturalWidth === 0 || naturalHeight === 0) {
      setStillFrame("failed")
      return
    }
    // Downscaled to the pixel budget, aspect ratio preserved; never upscaled.
    const scale = Math.min(1, STILL_FRAME_MAX_EDGE_PX / Math.max(naturalWidth, naturalHeight))
    canvas.width = Math.max(1, Math.round(naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(naturalHeight * scale))
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    setStillFrame("drawn")
  }, [])

  return (
    // The wrapper carries the accessible name: the animated image is mounted
    // only part of the time, so it is decorative, and the canvas is hidden.
    <div
      ref={rootRef}
      role="img"
      aria-label={alt}
      className={cn("absolute inset-0", stillFrame === "failed" && "bg-muted", className)}
    >
      {animationMounted && (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          onLoad={(event) => {
            if (stillFrame !== "drawn") drawStillFrame(event.currentTarget)
            setAnimationLoaded(true)
          }}
          onError={() => {
            // An image that never loads never draws a frame: show the placeholder.
            if (stillFrame !== "drawn") setStillFrame("failed")
          }}
          className={cn("object-cover", showAnimation ? "opacity-100" : "opacity-0")}
        />
      )}
      {/* Transparent until the frame is drawn, so it can always sit on top. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-cover",
          showAnimation && "opacity-0",
        )}
      />
    </div>
  )
}
