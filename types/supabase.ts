export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          country: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
          verified: boolean | null
          website_url: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          level: number | null
          name: string
          name_fr: string | null
          parent_id: string | null
          path: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          name: string
          name_fr?: string | null
          parent_id?: string | null
          path?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          name?: string
          name_fr?: string | null
          parent_id?: string | null
          path?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_parts: {
        Row: {
          added_at: string | null
          collection_id: string
          part_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          part_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_parts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curation_rejections: {
        Row: {
          created_at: string
          created_by: string | null
          failed_criteria: string[]
          id: string
          reason: string
          source_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failed_criteria?: string[]
          id?: string
          reason: string
          source_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failed_criteria?: string[]
          id?: string
          reason?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "curation_rejections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          description: string
          github_issue_number: number | null
          github_issue_url: string | null
          id: string
          status: string
          title: string
          triage_notes: string | null
          type: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          status?: string
          title: string
          triage_notes?: string | null
          type: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          status?: string
          title?: string
          triage_notes?: string | null
          type?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          allows_commercial: boolean
          allows_redistribution: boolean
          created_at: string | null
          id: string
          is_copyleft: boolean
          name: string
          requires_attribution: boolean
          short_name: string
          spdx_id: string
          url: string
        }
        Insert: {
          allows_commercial?: boolean
          allows_redistribution?: boolean
          created_at?: string | null
          id?: string
          is_copyleft?: boolean
          name: string
          requires_attribution?: boolean
          short_name: string
          spdx_id: string
          url: string
        }
        Update: {
          allows_commercial?: boolean
          allows_redistribution?: boolean
          created_at?: string | null
          id?: string
          is_copyleft?: boolean
          name?: string
          requires_attribution?: boolean
          short_name?: string
          spdx_id?: string
          url?: string
        }
        Relationships: []
      }
      part_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          part_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          part_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          part_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "part_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_comments_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      part_downloads: {
        Row: {
          downloaded_at: string | null
          file_id: string | null
          id: string
          part_id: string
        }
        Insert: {
          downloaded_at?: string | null
          file_id?: string | null
          id?: string
          part_id: string
        }
        Update: {
          downloaded_at?: string | null
          file_id?: string | null
          id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_downloads_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "part_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_downloads_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_files: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_category: string
          file_size: number
          file_type: string
          filename: string
          id: string
          original_filename: string
          part_id: string | null
          upload_path: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          file_category: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          original_filename: string
          part_id?: string | null
          upload_path: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          file_category?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          original_filename?: string
          part_id?: string | null
          upload_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_files_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_likes: {
        Row: {
          id: string
          liked_at: string | null
          part_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          liked_at?: string | null
          part_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          liked_at?: string | null
          part_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_likes_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      part_products: {
        Row: {
          does_not_work_count: number
          evidence_level: string
          part_id: string
          product_id: string
          works_count: number
          works_with_adjustments_count: number
        }
        Insert: {
          does_not_work_count?: number
          evidence_level?: string
          part_id: string
          product_id: string
          works_count?: number
          works_with_adjustments_count?: number
        }
        Update: {
          does_not_work_count?: number
          evidence_level?: string
          part_id?: string
          product_id?: string
          works_count?: number
          works_with_adjustments_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "part_products_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      part_requests: {
        Row: {
          created_at: string | null
          description: string
          fulfilled_by_part_id: string | null
          id: string
          page_url: string | null
          product_id: string | null
          raw_query: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          fulfilled_by_part_id?: string | null
          id?: string
          page_url?: string | null
          product_id?: string | null
          raw_query?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          fulfilled_by_part_id?: string | null
          id?: string
          page_url?: string | null
          product_id?: string | null
          raw_query?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_requests_fulfilled_by_part_id_fkey"
            columns: ["fulfilled_by_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      part_source_clicks: {
        Row: {
          clicked_at: string
          context: string
          id: string
          part_id: string
        }
        Insert: {
          clicked_at?: string
          context: string
          id?: string
          part_id: string
        }
        Update: {
          clicked_at?: string
          context?: string
          id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_source_clicks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_views: {
        Row: {
          id: string
          part_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          part_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          part_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_views_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string | null
          curation_checklist: Json
          description: string | null
          dimensions: Json | null
          estimated_material_usage: number | null
          estimated_print_time: number | null
          file_hosting_type: string
          id: string
          images: string[] | null
          instructions: string | null
          legal_review_justification: string | null
          license_id: string | null
          like_count: number | null
          makes_count: number | null
          material: string | null
          name: string
          needs_category: boolean
          needs_instructions: boolean
          needs_legal_review: boolean
          needs_photo: boolean
          needs_print_settings: boolean
          needs_verification: boolean
          notes: string | null
          origin_type: string
          original_author: string | null
          original_author_url: string | null
          originality_attested: boolean
          originality_attested_at: string | null
          part_name: string | null
          part_number: string | null
          print_settings: Json | null
          slug: string
          source_platform: string | null
          source_published_at: string | null
          source_url: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          curation_checklist?: Json
          description?: string | null
          dimensions?: Json | null
          estimated_material_usage?: number | null
          estimated_print_time?: number | null
          file_hosting_type?: string
          id?: string
          images?: string[] | null
          instructions?: string | null
          legal_review_justification?: string | null
          license_id?: string | null
          like_count?: number | null
          makes_count?: number | null
          material?: string | null
          name: string
          needs_category?: boolean
          needs_instructions?: boolean
          needs_legal_review?: boolean
          needs_photo?: boolean
          needs_print_settings?: boolean
          needs_verification?: boolean
          notes?: string | null
          origin_type?: string
          original_author?: string | null
          original_author_url?: string | null
          originality_attested?: boolean
          originality_attested_at?: string | null
          part_name?: string | null
          part_number?: string | null
          print_settings?: Json | null
          slug: string
          source_platform?: string | null
          source_published_at?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          curation_checklist?: Json
          description?: string | null
          dimensions?: Json | null
          estimated_material_usage?: number | null
          estimated_print_time?: number | null
          file_hosting_type?: string
          id?: string
          images?: string[] | null
          instructions?: string | null
          legal_review_justification?: string | null
          license_id?: string | null
          like_count?: number | null
          makes_count?: number | null
          material?: string | null
          name?: string
          needs_category?: boolean
          needs_instructions?: boolean
          needs_legal_review?: boolean
          needs_photo?: boolean
          needs_print_settings?: boolean
          needs_verification?: boolean
          notes?: string | null
          origin_type?: string
          original_author?: string | null
          original_author_url?: string | null
          originality_attested?: boolean
          originality_attested_at?: string | null
          part_name?: string | null
          part_number?: string | null
          print_settings?: Json | null
          slug?: string
          source_platform?: string | null
          source_published_at?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_source_platform_fkey"
            columns: ["source_platform"]
            isOneToOne: false
            referencedRelation: "source_platforms"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "parts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      print_reports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          part_id: string
          product_id: string
          product_reference_id: string | null
          reporter_hash: string
          result: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          part_id: string
          product_id: string
          product_reference_id?: string | null
          reporter_hash: string
          result: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          part_id?: string
          product_id?: string
          product_reference_id?: string | null
          reporter_hash?: string
          result?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_reports_part_product_fkey"
            columns: ["part_id", "product_id"]
            isOneToOne: false
            referencedRelation: "part_products"
            referencedColumns: ["part_id", "product_id"]
          },
          {
            foreignKeyName: "print_reports_product_reference_id_fkey"
            columns: ["product_reference_id"]
            isOneToOne: false
            referencedRelation: "product_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_references: {
        Row: {
          created_at: string
          id: string
          language: string | null
          normalized_value: string
          product_id: string
          region: string | null
          source: string
          status: string
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          normalized_value?: string
          product_id: string
          region?: string | null
          source?: string
          status?: string
          type: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          normalized_value?: string
          product_id?: string
          region?: string | null
          source?: string
          status?: string
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_references_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          discontinued: boolean | null
          id: string
          image_url: string | null
          is_listed: boolean | null
          name: string
          open_requests_count: number
          parts_count: number
          release_year: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discontinued?: boolean | null
          id?: string
          image_url?: string | null
          is_listed?: boolean | null
          name: string
          open_requests_count?: number
          parts_count?: number
          release_year?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discontinued?: boolean | null
          id?: string
          image_url?: string | null
          is_listed?: boolean | null
          name?: string
          open_requests_count?: number
          parts_count?: number
          release_year?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      search_misses: {
        Row: {
          created_at: string
          id: string
          locale: string | null
          normalized_query: string
          outcome: string
          raw_query: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string | null
          normalized_query?: string
          outcome?: string
          raw_query: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string | null
          normalized_query?: string
          outcome?: string
          raw_query?: string
        }
        Relationships: []
      }
      source_platforms: {
        Row: {
          active: boolean
          base_url: string
          created_at: string
          id: string
          import_supported: boolean
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          base_url: string
          created_at?: string
          id?: string
          import_supported?: boolean
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          base_url?: string
          created_at?: string
          id?: string
          import_supported?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          location: string | null
          reputation_score: number | null
          updated_at: string | null
          username: string
          verified_maker: boolean | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          location?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          username: string
          verified_maker?: boolean | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          username?: string
          verified_maker?: boolean | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_brand_nav: {
        Args: { p_brand_id: string; p_locale?: string }
        Returns: Json
      }
      fetch_browse_nav: { Args: { p_locale?: string }; Returns: Json }
      fetch_category_page: {
        Args: { p_locale?: string; p_slug: string }
        Returns: Json
      }
      fetch_part_request_counts: {
        Args: { p_product_id: string }
        Returns: {
          description: string
          request_count: number
        }[]
      }
      fetch_pending_product_references: {
        Args: { result_limit?: number }
        Returns: {
          brand_name: string
          created_at: string
          id: string
          language: string
          product_name: string
          product_slug: string
          region: string
          type: string
          value: string
        }[]
      }
      fetch_top_search_misses: {
        Args: {
          outcome_filter?: string
          result_limit?: number
          since_days?: number
        }
        Returns: {
          last_seen: string
          miss_count: number
          normalized_query: string
          outcome: string
          raw_query: string
        }[]
      }
      fold_search_text: { Args: { value: string }; Returns: string }
      generate_slug: { Args: { input: string }; Returns: string }
      localized_name: {
        Args: { p_locale: string; p_name: string; p_name_fr: string }
        Returns: string
      }
      normalize_product_reference: { Args: { value: string }; Returns: string }
      part_product_evidence_level: {
        Args: { negative_reports: number; positive_reports: number }
        Returns: string
      }
      recompute_product_open_requests_count: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      recompute_product_parts_count: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      refresh_print_report_stats: {
        Args: { p_part_id: string; p_product_id: string }
        Returns: undefined
      }
      release_storage_ownership: {
        Args: { p_user_id: string }
        Returns: number
      }
      search_all: {
        Args: { p_locale?: string; result_limit?: number; search_query: string }
        Returns: Json
      }
      search_product_candidates: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          brand_name: string
          id: string
          name: string
          slug: string
        }[]
      }
      search_token_coverage:
        | { Args: { doc: string; tokens: string[] }; Returns: number }
        | {
            Args: { doc: string; tokens: string[]; typo_tokens: string[] }
            Returns: number
          }
      search_typo_match: {
        Args: { token: string; word: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_print_report: {
        Args: {
          p_comment?: string
          p_part_id: string
          p_product_id: string
          p_product_reference_id?: string
          p_reporter_hash: string
          p_result: string
          p_user_id: string
        }
        Returns: {
          does_not_work_count: number
          evidence_level: string
          works_count: number
          works_with_adjustments_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
