import { createClient } from "@/lib/supabase/server";

/**
 * Get current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  return await supabase.auth.getUser();
}

/** Claims the chosen username only while the caller's profile has its generated name. */
export function claimSignUpUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  username: string,
) {
  return supabase
    .from("user_profiles")
    .update({ username })
    .eq("id", userId)
    // Keep this guard in sync with the handle_new_user trigger.
    .eq("username", `user_${userId.slice(0, 8)}`);
}
