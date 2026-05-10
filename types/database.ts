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
  model_number?: string | null;
  description?: string | null;
  release_year?: number | null;
  discontinued?: boolean;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Model enum types — declared before Model so the interface can reference them
// ============================================================================

export type ModelStatus = 'draft' | 'published' | 'archived';
export type ModelOriginType = 'original' | 'curated' | 'manufacturer';
export type ModelVerificationStatus = 'unverified' | 'author_tested' | 'community_validated' | 'certified';

export interface Model {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  user_id: string;
  product_id?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  
  // Part details
  part_name?: string | null;
  part_number?: string | null;
  material?: string | null;
  color?: string | null;
  dimensions?: Record<string, unknown> | null; // {length: 50, width: 30, height: 10, unit: "mm"}
  
  // 3D Print settings
  print_settings?: Record<string, unknown> | null; // {layer_height: 0.2, infill: 20, supports: true}
  estimated_print_time?: number | null; // minutes
  estimated_material_usage?: number | null; // grams (stored as DECIMAL)
  
  // Files and media
  thumbnail_url?: string | null;
  images?: string[] | null; // Array of image URLs (text[])
  
  // Status and metrics
  status?: ModelStatus;
  download_count?: number;
  view_count?: number;
  like_count?: number;
  
  // Origin tracking
  origin_type: ModelOriginType;
  source_url?: string | null;
  source_platform?: string | null;   // 'printables', 'thingiverse', 'github', etc.
  source_published_at?: string | null;

  // Attribution (required when origin_type = 'curated')
  original_author?: string | null;
  original_author_url?: string | null;

  // License
  license_id?: string | null;
  source_license_id?: string | null;

  // Validation
  verification_status: ModelVerificationStatus;
  makes_count?: number;

  // Metadata
  tags?: string[] | null;
  instructions?: string | null;
  notes?: string | null;
  
  created_at?: string;
  updated_at?: string;
}

export interface ModelFile {
  id: string;
  model_id: string;
  filename: string; // max 255 chars
  original_filename: string; // max 255 chars
  file_type: string; // stl, obj, step, pdf, etc. (max 10 chars)
  file_size: number; // bytes (BIGINT)
  file_url: string;
  file_category: string; // model, documentation, image (max 20 chars)
  upload_path: string; // Storage path
  checksum?: string | null; // File integrity (max 64 chars)
  created_at?: string;
}

export interface ModelLike {
  id: string;
  user_id: string;
  model_id: string;
  liked_at?: string;
}

export interface ModelDownload {
  id: string;
  user_id?: string | null;
  model_id: string;
  file_id: string | null; // Nullable for archive/ZIP downloads
  ip_hash?: string | null; // SHA-256 of IP + UA
  user_agent?: string | null;
  downloaded_at?: string;
}

export interface ModelComment {
  id: string;
  model_id: string;
  user_id: string;
  parent_id?: string | null; // For nested comments
  content: string;
  rating?: number | null; // 1-5
  created_at?: string;
  updated_at?: string;
}

export interface Collection {
  id: string;
  name: string; // max 200 chars
  description?: string | null;
  user_id: string;
  is_public?: boolean;
  thumbnail_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionModel {
  collection_id: string;
  model_id: string;
  added_at?: string;
}

// ============================================================================
// Enhanced Types with Relations - Used in queries and API responses
// ============================================================================

export interface ModelWithRelations extends Model {
  user_profiles?: UserProfile | UserProfile[];
  brands?: Brand | Brand[];
  categories?: Category | Category[];
  products?: (Product & { brands?: Brand | Brand[] }) | (Product & { brands?: Brand | Brand[] })[];
  licenses?: License | License[];
}

// ============================================================================
// Database Filter Types
// ============================================================================

export interface ModelFilters {
  category_id?: string;
  brand_id?: string;
  product_id?: string;
  status?: ModelStatus;
  user_id?: string;
  tags?: string[];
}