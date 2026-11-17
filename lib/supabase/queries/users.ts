import { createClient } from "@/lib/supabase/client";

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
