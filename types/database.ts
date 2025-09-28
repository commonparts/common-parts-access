export interface EnhancedModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  user_id: string;
  // ... existing fields
  // New fields (optional for backward compatibility)
  part_name?: string;
  part_number?: string;
  print_settings?: Record<string, any>;
  tags?: string[];
}

// Keep existing types, extend gradually
export type Model = EnhancedModel; // Alias for compatibility