import type { Database, Tables } from '@/types/supabase';

// ============================================================================
// Row types — derived from the generated schema in types/supabase.ts.
//
// types/supabase.ts is generated from the production schema (`npm run
// db:types`) and is regenerated in the same PR as every migration, so a
// renamed or dropped column breaks the build instead of failing at runtime.
// Nothing in this file redeclares a column by hand: what follows only names
// the generated rows, and narrows the columns the generator cannot describe.
// ============================================================================

export type License = Tables<'licenses'>;
export type Brand = Tables<'brands'>;
export type Category = Tables<'categories'>;
export type Product = Tables<'products'>;
export type SourcePlatform = Tables<'source_platforms'>;

/** One row returned by an RPC that returns a set (`returns table (...)`). */
type RpcRow<Name extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][Name]['Returns'] extends readonly (infer Row)[] ? Row : never;

// Row shape returned by the fetch_part_request_counts RPC — aggregate only,
// never any row-level or identifying data.
export type PartRequestCount = RpcRow<'fetch_part_request_counts'>;

// ============================================================================
// Column domains the generator cannot express.
//
// The generator types a text column restricted by a CHECK constraint as
// `string`, and a jsonb column as `Json`. The unions and shapes below are the
// values those constraints and the API validation allow. Each list mirrors the
// CHECK constraint of its column in supabase/migrations/.
// ============================================================================

export const PART_STATUSES = ['draft', 'published', 'archived'] as const;
export type PartStatus = (typeof PART_STATUSES)[number];

export type PartOriginType = 'original' | 'curated' | 'manufacturer';
export type PartVerificationStatus = 'unverified' | 'author_tested' | 'community_validated' | 'certified';
export type PartFileHostingType = 'hosted' | 'link_out';

export const DIMENSION_UNITS = ['mm', 'cm', 'in'] as const;

// The jsonb shapes are type aliases, not interfaces: an alias is assignable to
// the generated `Json` type, an interface (no index signature) is not.

/** Shape of parts.dimensions (jsonb). */
export type PartDimensions = {
  length?: number;
  width?: number;
  height?: number;
  unit?: (typeof DIMENSION_UNITS)[number];
};

export const SUPPORT_TYPES = ['none', 'buildplate_only', 'everywhere'] as const;

/** Shape of parts.print_settings (jsonb). */
export type PartPrintSettings = {
  layer_height?: number; // mm, non-negative
  infill?: number;       // 0–100 %
  supports?: (typeof SUPPORT_TYPES)[number];
};

// The six blocking criteria of curation checklist v1 (Flow P3 §4.3.3).
// Stored on parts.curation_checklist as a partial {criterion: boolean} map;
// all six must be true for a curated part to be publishable.
export const CURATION_CRITERION_KEYS = [
  'eligibility',
  'product_target',
  'license',
  'file',
  'attribution',
  'duplicate',
] as const;
export type CurationCriterionKey = (typeof CURATION_CRITERION_KEYS)[number];

/** Shape of parts.curation_checklist (jsonb). */
export type CurationChecklist = Partial<Record<CurationCriterionKey, boolean>>;

/**
 * Domain types of the parts columns the generator types loosely. Applied to a
 * selected row by `narrowPartRow()` in lib/supabase/rows.ts.
 */
export interface PartColumnDomains {
  status: PartStatus;
  origin_type: PartOriginType;
  verification_status: PartVerificationStatus;
  file_hosting_type: PartFileHostingType;
  dimensions: PartDimensions | null;
  print_settings: PartPrintSettings | null;
  curation_checklist: CurationChecklist;
}

/** A parts row with its constrained columns narrowed to their domain types. */
export type Part = Omit<Tables<'parts'>, keyof PartColumnDomains> & PartColumnDomains;
