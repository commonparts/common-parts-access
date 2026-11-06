import type { PartFileHostingType, PartOriginType } from '@/types/database'

/**
 * The user-facing vocabulary of the publish flow (issue #301).
 *
 * Storage is unchanged: `origin_type` and `file_hosting_type` keep their
 * values, their columns and their query scoping. This module is the single
 * place that maps that pair onto the kind a visitor reads, so the part page,
 * the publish tool and the drafts list can never describe the same record
 * differently. The badge and description of each kind are the `Publication`
 * messages.
 *
 * The words *curation*, *curated*, *link-out* and *hosting type* deliberately
 * do not appear in those messages — they are storage terms, not UI terms.
 */

type PublicationKind = 'original' | 'hosted' | 'referenced'

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
  originType: PartOriginType,
  fileHostingType: PartFileHostingType | null | undefined,
): PublicationKind {
  if (originType !== 'curated') return 'original'
  return fileHostingType === 'link_out' ? 'referenced' : 'hosted'
}
