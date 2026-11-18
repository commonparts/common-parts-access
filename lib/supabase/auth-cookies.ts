import type { CookieOptions } from "@supabase/ssr";

/** Shared by the browser and server so refresh preserves the same cookie attributes. */
export const authCookieOptions: CookieOptions = { secure: process.env.NODE_ENV === "production" };
