import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

/**
 * Server-only Supabase client authenticated with the secret key
 * (`sb_secret_...`), which acts as the `service_role` role and bypasses RLS.
 * The variable has no `NEXT_PUBLIC_` prefix, so it is never inlined into
 * client bundles; Supabase also rejects the key when sent from a browser.
 */
export function createAdminClient() {
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = serverEnv("SUPABASE_SECRET_KEY");

  // The secret key is optional configuration: without it, the features that
  // need the service role report that they are unavailable.
  if (!secretKey) {
    throw new Error("Missing Supabase admin configuration: set SUPABASE_SECRET_KEY");
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
