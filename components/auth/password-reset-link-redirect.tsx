"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { passwordResetRetryReason } from "@/lib/schemas/auth";
import { isPasswordResetLinkFailure } from "@/lib/utils/auth-errors";

/** Handles rejected reset links whose error can arrive in the browser-only fragment. */
export function PasswordResetLinkRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    const { search, hash } = window.location;
    if (
      isPasswordResetLinkFailure(new URLSearchParams(search)) ||
      isPasswordResetLinkFailure(new URLSearchParams(hash.slice(1)))
    ) {
      router.replace({
        pathname: "/forgot-password",
        query: { error: passwordResetRetryReason.value },
      });
    }
  }, [router]);

  return null;
}
