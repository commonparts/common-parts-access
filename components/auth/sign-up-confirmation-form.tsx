"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpConfirmationCode, signUpConfirmationEmail } from "@/lib/schemas/auth";
import { resendSignUpConfirmation, verifySignUpCode } from "@/lib/supabase/queries/auth.client";
import { authErrorKey } from "@/lib/utils/auth-errors";
import { signUpConfirmationUrl, takePendingSignUpEmail } from "@/lib/utils/sign-up-confirmation";

interface SignUpConfirmationFormProps {
  redirectPath: string | null;
}

type Submission =
  | { status: "idle" | "verify" | "resend" | "resent" }
  | { status: "error"; message: string };

/** Verify the code in the browser so Supabase can rate-limit by visitor IP. */
export function SignUpConfirmationForm({ redirectPath }: SignUpConfirmationFormProps): React.JSX.Element {
  const t = useTranslations("SignUpSuccessPage");
  const auth = useTranslations("AuthForms");
  const errors = useTranslations("AuthErrors");
  const [submission, setSubmission] = useState<Submission>({ status: "idle" });
  const { status } = submission;
  const pending = status === "verify" || status === "resend";
  const prefillEmail = useCallback((input: HTMLInputElement | null): void => {
    if (input && !input.value) input.value = takePendingSignUpEmail();
  }, []);

  /** Keep resend and verification from racing, since resend replaces the active code. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const fields = new FormData(event.currentTarget, submitter);
    const email = signUpConfirmationEmail.safeParse(fields.get("email"));
    if (!email.success) {
      setSubmission({ status: "error", message: errors("invalidEmail") });
      return;
    }

    const isResend = fields.get("intent") === "resend";
    const code = isResend ? null : signUpConfirmationCode.safeParse(fields.get("code"));
    if (code && !code.success) {
      setSubmission({ status: "error", message: t("codeFormat") });
      return;
    }

    setSubmission({ status: isResend ? "resend" : "verify" });
    try {
      if (!code) {
        const confirmUrl = signUpConfirmationUrl(window.location.origin, redirectPath);
        const { error } = await resendSignUpConfirmation(email.data, confirmUrl);
        if (error) throw error;
        setSubmission({ status: "resent" });
        return;
      }
      const { data, error } = await verifySignUpCode(email.data, code.data);
      if (error) throw error;
      if (!data.session) {
        setSubmission({ status: "error", message: errors("generic") });
        return;
      }
      // Reload so protected routes render with the new session cookies.
      window.location.replace(redirectPath ?? "/");
    } catch (error: unknown) {
      setSubmission({ status: "error", message: errors(authErrorKey(error)) });
    }
  }

  return (
    <form method="post" noValidate onSubmit={handleSubmit} className="space-y-sm">
      <div className="grid gap-2xs">
        <Label htmlFor="confirmation-email">{auth("email")}</Label>
        <Input
          id="confirmation-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly={pending}
          ref={prefillEmail}
        />
      </div>
      <div className="grid gap-2xs">
        <Label htmlFor="confirmation-code">{t("code")}</Label>
        <Input
          id="confirmation-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          readOnly={pending}
        />
      </div>
      {submission.status === "error" && (
        <p role="alert" className="text-sm text-status-errorText">{submission.message}</p>
      )}
      {status === "resent" && <p role="status" className="text-sm text-text-secondary">{t("resent")}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {status === "verify" ? t("verifying") : t("verify")}
      </Button>
      <Button
        type="submit"
        name="intent"
        value="resend"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {status === "resend" ? t("resending") : t("resend")}
      </Button>
      <p className="text-caption text-text-secondary">{t("existingLink")}</p>
    </form>
  );
}
