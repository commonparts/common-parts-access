import { exchangeAuthCode, verifyOtp } from "@/lib/supabase/queries/auth.server";
import { isSafeRedirect } from "@/lib/utils/validation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  // Validate next server-side — client-side validation alone is not enough
  // since anyone can craft a direct request to /confirm?next=https://evil.com.
  const rawNext = searchParams.get("next") ?? "/";
  const next = isSafeRedirect(rawNext) ? rawNext : "/";

  // PKCE flow: Supabase redirects here with ?code=... after verifying the
  // confirmation link server-side (default email template behaviour).
  if (code) {
    const { error } = await exchangeAuthCode(code);
    if (!error) {
      redirect(next);
    } else {
      redirect(`/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // OTP flow: custom email template passes token_hash + type directly.
  if (token_hash && type) {
    const { error } = await verifyOtp(type, token_hash);
    if (!error) {
      redirect(next);
    } else {
      redirect(`/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  redirect(`/error?error=${encodeURIComponent("No token hash or type")}`);
}
