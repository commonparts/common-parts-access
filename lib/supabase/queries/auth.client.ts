import { createClient } from "@/lib/supabase/client";

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, redirectTo?: string) {
  const supabase = createClient();
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = createClient();
  return await supabase.auth.signOut();
}

/**
 * Update user password
 */
export async function updatePassword(password: string) {
  const supabase = createClient();
  return await supabase.auth.updateUser({ password });
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = createClient();
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
}

/**
 * Get current user (client-side)
 */
export async function getCurrentUser() {
  const supabase = createClient();
  return await supabase.auth.getUser();
}
