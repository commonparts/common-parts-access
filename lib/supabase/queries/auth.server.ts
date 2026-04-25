import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

/**
 * Get current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  return await supabase.auth.getUser();
}

/**
 * Verify OTP (email confirmation, password reset, etc.)
 */
export async function verifyOtp(type: EmailOtpType, token_hash: string) {
  const supabase = await createClient();
  return await supabase.auth.verifyOtp({
    type,
    token_hash,
  });
}
