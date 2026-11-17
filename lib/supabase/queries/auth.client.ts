import { AuthError } from "@supabase/supabase-js";
import type { Locale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { checkUsernameAvailability } from "@/lib/supabase/queries/users";

interface NewAccount {
  username: string;
  locale: Locale;
}

/** Only the explicit sign-up form can create an account. */
export async function requestEmailCode(email: string, account?: NewAccount, captchaToken?: string) {
  if (account) {
    const { available, error } = await checkUsernameAvailability(account.username);
    if (error) return { error };
    if (!available) return { error: new AuthError("Username is already taken", 409, "username_taken") };
  }

  const { error } = await createClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: Boolean(account),
      data: account,
      captchaToken,
    },
  });

  // Give the same response whether or not an address has an account.
  return { error: error?.code === "otp_disabled" && !account ? null : error };
}

export async function verifyEmailCode(email: string, token: string) {
  return createClient().auth.verifyOtp({ email, token, type: "email" });
}

export async function signOut(scope: "local" | "global" = "local") {
  return createClient().auth.signOut({ scope });
}
