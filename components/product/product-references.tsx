import { useLocale, useTranslations } from "next-intl"
import { formatRegionName } from "@/lib/utils/formatters"
import { groupProductReferences, type ProductReference } from "@/lib/utils/product-references"
import { cn } from "@/lib/utils"

interface ProductReferencesProps {
  references: ProductReference[]
  /** The name shown as the product title — not repeated under "Also sold as". */
  displayedName: string
  className?: string
}

/**
 * The references a product is known by, grouped by type, so a visitor can
 * match the page against the label printed on their device. Renders nothing
 * when the product has no references.
 */
export function ProductReferences({ references, displayedName, className }: ProductReferencesProps) {
  const t = useTranslations("ProductReferences")
  const locale = useLocale()
  const groups = groupProductReferences(references, displayedName)
  if (groups.length === 0) return null

  return (
    <dl className={cn("space-y-xs text-body", className)}>
      {groups.map((group) => (
        <div key={group.type} className="flex flex-wrap gap-x-sm">
          <dt className="text-text-secondary">{t(group.type)}</dt>
          <dd className="text-text-primary">
            {group.references
              .map((reference) =>
                reference.region
                  ? t("withRegion", { value: reference.value, region: formatRegionName(reference.region, locale) })
                  : reference.value,
              )
              .join(", ")}
          </dd>
        </div>
      ))}
    </dl>
  )
}
