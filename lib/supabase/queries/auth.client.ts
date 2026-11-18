import type { Locale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/** Only the explicit sign-up form can create an account. */
export async function requestEmailCode(email: string, signUpLocale?: Locale) {
  const { error } = await createClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: Boolean(signUpLocale),
      // The profile keeps its generated username until the email is verified.
      data: signUpLocale ? { locale: signUpLocale, signup_username_pending: true } : undefined,
    },
  });

  // Give the same response whether or not an address has an account.
  return { error: error?.code === "otp_disabled" && !signUpLocale ? null : error };
}

export async function verifyEmailCode(email: string, token: string) {
  return createClient().auth.verifyOtp({ email, token, type: "email" });
}

export async function signOut(scope: "local" | "global" = "local") {
  return createClient().auth.signOut({ scope });
}
