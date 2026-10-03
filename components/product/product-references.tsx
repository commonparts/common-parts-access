import { formatRegionName } from "@/lib/utils/formatters"
import {
  groupProductReferences,
  type ProductReference,
  type ProductReferenceType,
} from "@/lib/utils/product-references"
import { cn } from "@/lib/utils"

const GROUP_LABELS: Record<ProductReferenceType, string> = {
  manufacturer_ref: "Model references",
  commercial_name: "Also sold as",
  ean: "Barcodes",
}

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
  const groups = groupProductReferences(references, displayedName)
  if (groups.length === 0) return null

  return (
    <dl className={cn("space-y-xs text-body", className)}>
      {groups.map((group) => (
        <div key={group.type} className="flex flex-wrap gap-x-sm">
          <dt className="text-text-secondary">{GROUP_LABELS[group.type]}</dt>
          <dd className="text-text-primary">
            {group.references
              .map((reference) =>
                reference.region
                  ? `${reference.value} (${formatRegionName(reference.region)})`
                  : reference.value,
              )
              .join(", ")}
          </dd>
        </div>
      ))}
    </dl>
  )
}
