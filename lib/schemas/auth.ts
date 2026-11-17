import { z } from "zod";

export const passwordResetLinkFailure = z.object({
  error: z.literal("access_denied"),
  error_code: z.literal("otp_expired"),
});

export const passwordResetRetryReason = z.literal("password-reset-link");

export const signUpConfirmationEmail = z.string().trim().pipe(
  z.email({ pattern: z.regexes.html5Email }),
);

export const signUpConfirmationCode = z.string().trim().regex(/^[0-9]{6}$/);
