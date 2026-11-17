import { z } from "zod";

export const emailCodeAddress = z.string().trim().pipe(
  z.email({ pattern: z.regexes.html5Email }),
);

export const emailCode = z.string().trim().regex(/^[0-9]{6}$/);
