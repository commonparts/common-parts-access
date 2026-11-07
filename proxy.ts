import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  return await updateSession(request, handleI18nRouting);
}

export const config = {
  // Pages only. API routes and the /confirm auth callback are not localized
  // and refresh the session through the server client; Next.js internals and
  // files with an extension (robots.txt, sitemap.xml, images) are static.
  matcher: ["/((?!api|confirm|_next|_vercel|.*\\..*).*)"],
};
