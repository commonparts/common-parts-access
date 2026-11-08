import type { Result } from '@/lib/api/parse'
import type { SourceUrlMatch } from '@/lib/supabase/queries/curation'

export type DraftIdentity = { id: string; slug: string }
export type SavePublicationResult = Result<DraftIdentity | null> & { duplicate?: SourceUrlMatch | null }
export type PublishPublicationResult = Result<{ slug: string }> & { blockers?: string[] }
