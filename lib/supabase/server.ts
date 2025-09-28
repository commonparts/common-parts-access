import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  console.log("[server.ts] createClient called");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          console.log("[server.ts] cookies.getAll:", all);
          return all;
        },
        setAll(cookiesToSet) {
          try {
            console.log("[server.ts] cookies.setAll:", cookiesToSet);
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch (err) {
            console.log("[server.ts] cookies.setAll error:", err);
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
