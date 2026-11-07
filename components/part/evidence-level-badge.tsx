import * as React from "react"
import { useTranslations } from "next-intl"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import type { EvidenceLevel } from "@/lib/utils/evidence-level"

interface EvidenceLevelBadgeProps extends Omit<BadgeProps, "children" | "tone" | "variant" | "asChild"> {
  level: EvidenceLevel
}

// Treatment rises with the evidence: a bare claim stays quiet, a confirmed
// fit reads as positive, a disputed one warns without alarming. The label
// and description of each level are the `EvidenceLevel` messages.
const EVIDENCE_LEVEL_DISPLAY: Record<
  EvidenceLevel,
  { tone: BadgeProps["tone"]; variant: BadgeProps["variant"] }
> = {
  declared: { tone: "neutral", variant: "outline" },
  confirmed: { tone: "success", variant: "soft" },
  disputed: { tone: "warning", variant: "soft" },
}

/**
 * Evidence level of one part–product fit (issue #317). Shown next to each
 * compatible product on a part page and on each part of a product page, since
 * the same part can be confirmed on one product and only declared on another.
 */
export function EvidenceLevelBadge({ level, ...props }: EvidenceLevelBadgeProps) {
  const t = useTranslations("EvidenceLevel")
  const display = EVIDENCE_LEVEL_DISPLAY[level]
  const description = t(`${level}.description`)

  return (
    <Badge tone={display.tone} variant={display.variant} title={description} {...props}>
      {t(`${level}.label`)}
      <span className="sr-only">{t("descriptionPrefix", { description })}</span>
    </Badge>
  )
}
