import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/types/supabase";

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: TablesUpdate<"user_profiles">) {
  const supabase = createClient();
  
  return await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  
  if (error) {
    return { available: false, error };
  }
  
  return { available: !data, error: null };
}
