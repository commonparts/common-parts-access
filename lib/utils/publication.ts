import type { ModelFileHostingType, ModelOriginType } from '@/types/database'

/**
 * The user-facing vocabulary of the publish flow (issue #301).
 *
 * Storage is unchanged: `origin_type` and `file_hosting_type` keep their
 * values, their columns and their query scoping. This module is the single
 * place that maps that pair onto the words a visitor reads, so the part page,
 * the publish tool and the drafts list can never describe the same record
 * differently.
 *
 * The words *curation*, *curated*, *link-out* and *hosting type* deliberately
 * do not appear in any string here — they are storage terms, not UI terms.
 */

export type PublicationKind = 'original' | 'hosted' | 'referenced'

export interface PublicationLabel {
  kind: PublicationKind
  /** Badge text on the part page and the drafts list. */
  badge: string
  /** One sentence explaining what the badge means, for helper copy. */
  description: string
}

const PUBLICATION_LABELS: Record<PublicationKind, PublicationLabel> = {
  original: {
    kind: 'original',
    badge: 'Original',
    description: 'Designed by the contributor and published here for the first time.',
  },
  hosted: {
    kind: 'hosted',
    badge: 'Hosted',
    description: 'Published elsewhere first — the files are hosted on Common Parts.',
  },
  referenced: {
    kind: 'referenced',
    badge: 'Referenced',
    description: 'Published elsewhere — the files stay at the source and Common Parts links to them.',
  },
}

/**
 * Describes how a part entered the registry, from the stored origin and
 * hosting pair.
 *
 * Anything that is not `curated` is Original: it was published here first, so
 * there is no other publication to reference. That covers the unused
 * `manufacturer` origin deterministically, and `(original, link_out)` does not
 * exist by design — a self-designed part hosted elsewhere goes through the
 * elsewhere track with the designer as the original author.
 */
export function describePublication(
  originType: ModelOriginType,
  fileHostingType: ModelFileHostingType | null | undefined,
): PublicationLabel {
  if (originType !== 'curated') return PUBLICATION_LABELS.original
  return fileHostingType === 'link_out' ? PUBLICATION_LABELS.referenced : PUBLICATION_LABELS.hosted
}
