import { createServerClient } from "@supabase/ssr";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { findPublicEnv } from "@/lib/public-env";
import type { Database } from "@/types/supabase";

/**
 * Dashboard routes that require authentication, without their locale prefix.
 * These correspond to routes inside app/[locale]/(dashboard)/.
 */
const PROTECTED_ROUTE_PREFIXES = [
  "/publish",
  "/dashboard",
  "/downloads",
  "/my-parts",
  "/notifications",
  "/settings",
];

/**
 * Refreshes the Supabase session on every page request, protects dashboard
 * routes, then hands the request to the locale routing.
 * Unauthenticated users accessing a protected route are redirected to
 * /<locale>/login?redirect=<original-path> so they can return after signing in.
 * A path without a locale prefix is not checked: the locale routing redirects
 * it to its prefixed URL, which is.
 */
export async function updateSession(
  request: NextRequest,
  routeLocale: (request: NextRequest) => NextResponse,
) {
  // If env vars are missing, skip session management and pass through.
  // This prevents the middleware from crashing preview deployments
  // where environment variables have not been configured yet.
  const env = findPublicEnv();
  if (!env) {
    return routeLocale(request);
  }

  const refreshedCookies: Parameters<NextResponse["cookies"]["set"]>[] = [];
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Written to the request so the locale routing forwards the
          // refreshed session to Server Components, and kept for the response.
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            refreshedCookies.push([name, value, options]);
          });
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
  const locale = pathname.split("/")[1];
  const isProtected =
    hasLocale(routing.locales, locale) &&
    PROTECTED_ROUTE_PREFIXES.some(
      (prefix) =>
        pathname === `/${locale}${prefix}` ||
        pathname.startsWith(`/${locale}${prefix}/`),
    );

  let response: NextResponse;
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    // Clear the original page's query string before building the login URL
    // so protected-route params are not leaked or duplicated on /login.
    url.search = "";
    url.pathname = `/${locale}/login`;
    // Preserve only the pathname so the user returns to the right page after
    // signing in without leaking protected-route query params into the login
    // URL (browser history, server logs, referrer headers).
    url.searchParams.set("redirect", pathname);
    response = NextResponse.redirect(url);
  } else {
    response = routeLocale(request);
  }

  refreshedCookies.forEach((cookie) => response.cookies.set(...cookie));
  return response;
}
