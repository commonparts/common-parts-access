import * as React from "react"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import type { EvidenceLevel } from "@/lib/utils/evidence-level"

interface EvidenceLevelBadgeProps extends Omit<BadgeProps, "children" | "tone" | "variant" | "asChild"> {
  level: EvidenceLevel
}

// Treatment rises with the evidence: a bare claim stays quiet, a confirmed
// fit reads as positive, a disputed one warns without alarming.
const EVIDENCE_LEVEL_DISPLAY: Record<
  EvidenceLevel,
  { label: string; description: string; tone: BadgeProps["tone"]; variant: BadgeProps["variant"] }
> = {
  declared: {
    label: "Declared",
    description: "Fit claimed by the source or a curator, not yet confirmed by a print report",
    tone: "neutral",
    variant: "outline",
  },
  confirmed: {
    label: "Confirmed",
    description: "At least one print report confirms this fit",
    tone: "success",
    variant: "soft",
  },
  disputed: {
    label: "Disputed",
    description: "More print reports reject this fit than confirm it",
    tone: "warning",
    variant: "soft",
  },
}

/**
 * Evidence level of one part–product fit (issue #317). Shown next to each
 * compatible product on a part page and on each part of a product page, since
 * the same part can be confirmed on one product and only declared on another.
 */
export function EvidenceLevelBadge({ level, ...props }: EvidenceLevelBadgeProps) {
  const display = EVIDENCE_LEVEL_DISPLAY[level]

  return (
    <Badge tone={display.tone} variant={display.variant} title={display.description} {...props}>
      {display.label}
      <span className="sr-only">: {display.description}</span>
    </Badge>
  )
}
