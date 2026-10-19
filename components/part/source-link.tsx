"use client"

import * as React from "react"
import { sendSourceClick, type SourceClickContext } from "@/lib/utils/source-clicks"

/** `MouseEvent.button` value of the middle button, which opens links in a new tab. */
const MIDDLE_MOUSE_BUTTON = 1

interface SourceLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  /** Slug of the part whose source this link opens. */
  slug: string
  /** Where the link is rendered, recorded with the click. */
  context: SourceClickContext
  ref?: React.Ref<HTMLAnchorElement>
}

/**
 * A link to a part's source, opened in a new tab, that records an anonymous
 * click (issue #375). A left click (with or without a modifier key) and a
 * middle click are recorded; opening the link from the context menu is not,
 * as no click event reaches the page. Crawlers that follow the href run no
 * handler, so they are never counted.
 */
export function SourceLink({
  slug,
  context,
  onClick,
  onAuxClick,
  ...props
}: SourceLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    sendSourceClick(slug, context)
  }

  const handleAuxClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onAuxClick?.(event)
    if (event.button === MIDDLE_MOUSE_BUTTON) {
      sendSourceClick(slug, context)
    }
  }

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
    />
  )
}
