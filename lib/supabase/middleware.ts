import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Dashboard routes that require authentication.
 * These correspond to routes inside app/(dashboard)/.
 */
const PROTECTED_ROUTE_PREFIXES = [
  "/upload",
  "/dashboard",
  "/collections",
  "/downloads",
  "/likes",
  "/my-parts",
  "/notifications",
  "/settings",
];

/**
 * Refreshes the Supabase session on every request and protects dashboard routes.
 * Unauthenticated users accessing a protected route are redirected to
 * /login?redirect=<original-path> so they can return after signing in.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, skip session management and pass through.
  // This prevents the middleware from crashing preview deployments
  // where environment variables have not been configured yet.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() both refreshes the session token and verifies it server-side.
  // Never use getSession() for auth checks — it reads from the cookie only
  // and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    // Clear the original page's query string before building the login URL
    // so protected-route params are not leaked or duplicated on /login.
    url.search = "";
    url.pathname = "/login";
    // Preserve only the pathname so the user returns to the right page after
    // signing in without leaking protected-route query params into the login
    // URL (browser history, server logs, referrer headers).
    url.searchParams.set("redirect", request.nextUrl.pathname);
    // Copy Supabase cookie mutations explicitly so refreshed/cleared auth
    // cookies are preserved on the redirect response. Using cookies.getAll()
    // avoids the Set-Cookie collapse problem that happens when iterating headers.
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
