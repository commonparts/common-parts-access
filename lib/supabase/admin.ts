import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client authenticated with the secret key
 * (`sb_secret_...`), which acts as the `service_role` role and bypasses RLS.
 * The variable has no `NEXT_PUBLIC_` prefix, so it is never inlined into
 * client bundles; Supabase also rejects the key when sent from a browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin configuration: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
