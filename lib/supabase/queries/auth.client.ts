import { createClient } from "@/lib/supabase/client";
import { checkUsernameAvailability, updateUserProfile } from "@/lib/supabase/queries/users";

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
export async function signUp(
  email: string, 
  password: string, 
  username: string,
  redirectTo?: string
) {
  const supabase = createClient();
  
  // Check if username is available
  const { available, error: usernameError } = await checkUsernameAvailability(username);
  
  if (usernameError) {
    return { data: null, error: usernameError };
  }
  
  if (!available) {
    return { 
      data: null, 
      error: new Error("Username is already taken") 
    };
  }
  
  // Create auth user with username in metadata
  // The database trigger will create the user_profile automatically
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        username: username,
      },
    },
  });
  
  if (authError || !authData.user) {
    return { data: authData, error: authError };
  }
  
  // Update the user profile with the username
  // This works because the trigger already created the profile
  // and the user's session allows them to update their own profile
  const { error: profileError } = await updateUserProfile(authData.user.id, {
    username: username,
  });
  
  if (profileError) {
    // Profile update failed, but user is created
    // The username from metadata will still be used by the trigger
    console.warn('Profile update failed, username set via metadata:', profileError);
  }
  
  return { data: authData, error: null };
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
