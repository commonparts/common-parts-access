// ============================================================================
// Core Database Types - Matches Supabase schema exactly
// ============================================================================

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  website_url?: string | null;
  location?: string | null;
  reputation_score?: number;
  verified_maker?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface License {
  id: string;
  spdx_id: string;         // e.g. "CC0-1.0", "CC-BY-4.0"
  name: string;            // full legal name
  short_name: string;      // display label
  url: string;             // canonical URL
  allows_redistribution: boolean;
  requires_attribution: boolean;
  allows_commercial: boolean;
  is_copyleft: boolean;
  created_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  founded_year?: number | null;
  country?: string | null; // ISO country code
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null; // Storage path to category icon image (e.g. 'category-icons/icon.png')
  parent_id?: string | null;
  level?: number;
  path?: string | null; // Materialized path: /electronics/phones/
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  release_year?: number | null;
  discontinued?: boolean;
  image_url?: string | null;
  parts_count?: number; // denormalized count of published parts (trigger-maintained)
  open_requests_count?: number; // denormalized count of open part requests (trigger-maintained)
  is_listed?: boolean; // generated: parts_count > 0 or open_requests_count > 0, the public listing rule
  created_at?: string;
  updated_at?: string;
}

// Row shape returned by the fetch_part_request_counts RPC — aggregate only,
// never any row-level or identifying data.
export interface PartRequestCount {
  description: string;
  request_count: number;
}

// ============================================================================
// Part JSONB column shapes
// ============================================================================

export interface PartDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: 'mm' | 'cm' | 'in';
}

type SupportType = 'none' | 'buildplate_only' | 'everywhere';

export interface PartPrintSettings {
  layer_height?: number; // mm, non-negative
  infill?: number;       // 0–100 %
  supports?: SupportType;
}

// ============================================================================
// Part enum types — declared before Part so the interface can reference them
// ============================================================================

export type PartStatus = 'draft' | 'published' | 'archived';

// The six blocking criteria of curation checklist v1 (Flow P3 §4.3.3).
// Stored on parts.curation_checklist as a partial {criterion: boolean} map;
// all six must be true for a curated part to be publishable.
export type CurationCriterionKey =
  | 'eligibility'
  | 'product_target'
  | 'license'
  | 'file'
  | 'attribution'
  | 'duplicate';

export type CurationChecklist = Partial<Record<CurationCriterionKey, boolean>>;
export type PartOriginType = 'original' | 'curated' | 'manufacturer';
export type PartVerificationStatus = 'unverified' | 'author_tested' | 'community_validated' | 'certified';
export type PartFileHostingType = 'hosted' | 'link_out';

export interface Part {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  // Null once the owning account is deleted: the part stays published,
  // anonymized (issue #178).
  user_id: string | null;
  // No brand_id: a part's brands are the distinct brands of the products it
  // fits, read through part_products (issue #315).
  category_id?: string | null;

  // Part details
  part_name?: string | null;
  part_number?: string | null;
  material?: string | null;
  color?: string | null;
  dimensions?: PartDimensions | null;
  
  // 3D Print settings
  print_settings?: PartPrintSettings | null;
  estimated_print_time?: number | null; // minutes
  estimated_material_usage?: number | null; // grams (stored as DECIMAL)
  
  // Files and media
  thumbnail_url?: string | null;
  images?: string[] | null; // Storage references `bucket/path` (text[]), resolved at the API boundary (#56)
  
  // Status and metrics
  status?: PartStatus;
  view_count?: number;
  like_count?: number;
  
  // Origin tracking
  origin_type: PartOriginType;
  source_url?: string | null;
  source_platform?: string | null;   // FK to source_platforms.slug
  source_published_at?: string | null;
  file_hosting_type?: PartFileHostingType;

  // Attribution (required when origin_type = 'curated')
  original_author?: string | null;
  original_author_url?: string | null;

  // License
  license_id?: string | null;

  // Validation
  verification_status: PartVerificationStatus;
  makes_count?: number; // every print report on the part, trigger-maintained (#318)

  // Metadata
  tags?: string[] | null;
  instructions?: string | null;
  notes?: string | null;

  // Curation (Flow P3) — non-blocking flags, the blocking legal-review flag,
  // and the blocking-checklist state. Maintained by the internal curation tool.
  needs_verification?: boolean;
  needs_print_settings?: boolean;
  needs_photo?: boolean;
  needs_instructions?: boolean;
  needs_category?: boolean;
  needs_legal_review?: boolean;
  legal_review_justification?: string | null;
  curation_checklist?: CurationChecklist;

  // Public upload flow (origin_type = 'original') — the contributor's
  // declaration that they created the part and may publish it. Blocking
  // condition of the upload publish gate.
  originality_attested?: boolean;
  originality_attested_at?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface SourcePlatform {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  logo_url?: string | null;
  import_supported: boolean;
  active: boolean;
  created_at?: string;
}