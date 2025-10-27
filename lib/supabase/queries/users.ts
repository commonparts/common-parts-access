import { createClient } from "@/lib/supabase/client";
import type { CreateUserProfileParams, UserProfile } from "@/types/users";

/**
 * Create a user profile manually
 * Note: This is typically not needed as the database trigger handles profile creation
 * This function is kept for manual/admin operations
 */
export async function createUserProfile(params: CreateUserProfileParams) {
  const supabase = createClient();
  
  return await supabase
    .from("user_profiles")
    .insert({
      id: params.id,
      username: params.username,
      display_name: params.display_name || params.username,
    })
    .select()
    .single();
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  const supabase = createClient();
  
  return await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
}

/**
 * Get user profile by username
 */
export async function getUserProfileByUsername(username: string) {
  const supabase = createClient();
  
  return await supabase
    .from("user_profiles")
    .select("*")
    .eq("username", username)
    .single();
}

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
