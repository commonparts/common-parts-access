import { verifyOtp } from "@/lib/supabase/queries/auth.server";
import { isSafeRedirect } from "@/lib/utils/validation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Validate next server-side — client-side validation alone is not enough
  // since anyone can craft a direct request to /confirm?next=https://evil.com.
  const rawNext = searchParams.get("next") ?? "/";
  const next = isSafeRedirect(rawNext) ? rawNext : "/";

  if (token_hash && type) {
    const { error } = await verifyOtp(type, token_hash);
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/error?error=${encodeURIComponent(error?.message || 'Verification failed')}`);
    }
  }

  // If token_hash or type is missing, redirect to error page with clear message.
  // This usually indicates a misconfigured redirect URL in Supabase Auth settings.
  redirect(`/error?error=${encodeURIComponent('Invalid or expired confirmation link. Please request a new sign-up email.')}`);
}
