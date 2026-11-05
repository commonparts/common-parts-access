import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/users";

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
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
