import { z } from "zod";
import { VALIDATION_LIMITS } from "@/lib/utils/constants";

const { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, EMAIL_CODE_LENGTH } = VALIDATION_LIMITS.USER;

/** Also the `pattern` attribute of the username input, which needs the escaped hyphen. */
export const USERNAME_PATTERN = "[a-zA-Z0-9_\\-]+";

export const emailCodeAddress = z.string().trim().pipe(
  z.email({ pattern: z.regexes.html5Email }),
);

export const emailCode = z.string().trim().length(EMAIL_CODE_LENGTH).regex(/^[0-9]+$/);

export const signUpUsername = z
  .string()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(new RegExp(`^${USERNAME_PATTERN}$`));
