import { z } from "zod";

export const passwordResetLinkFailure = z.object({
  error: z.literal("access_denied"),
  error_code: z.literal("otp_expired"),
});

export const passwordResetRetryReason = z.literal("password-reset-link");
