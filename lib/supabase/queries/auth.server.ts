import { createClient } from "@/lib/supabase/server";

/**
 * Get current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  return await supabase.auth.getUser();
}
