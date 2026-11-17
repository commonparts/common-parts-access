"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { AuthCaptcha } from "@/components/auth/auth-captcha";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailCode, emailCodeAddress } from "@/lib/schemas/auth";
import { requestEmailCode, verifyEmailCode } from "@/lib/supabase/queries/auth.client";
import { authErrorKey } from "@/lib/utils/auth-errors";
import { cn } from "@/lib/utils";
import { parseRedirectParam } from "@/lib/utils/validation";

interface Props extends ComponentPropsWithoutRef<"div"> {
  mode: "login" | "sign-up";
}

const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function EmailAuthForm({ mode, className, ...props }: Props) {
  const signingUp = mode === "sign-up";
  const t = useTranslations(signingUp ? "SignUpForm" : "LoginForm");
  const auth = useTranslations("AuthForms");
  const errors = useTranslations("AuthErrors");
  const locale = useLocale();
  const redirectPath = parseRedirectParam(useSearchParams().get("redirect"));
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const [showResendCaptcha, setShowResendCaptcha] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (codeRequested) codeInput.current?.focus();
  }, [codeRequested]);

  async function sendCode() {
    if (pending || (captchaSiteKey && !captchaToken)) return;
    const address = emailCodeAddress.safeParse(email);
    if (!address.success) {
      setError(errors("invalidEmail"));
      return;
    }
    setError(null);
    setPending("send");
    try {
      const account = signingUp && !codeRequested ? { username, locale } : undefined;
      const { error } = await requestEmailCode(address.data, account, captchaToken);
      if (error) throw error;
      setEmail(address.data);
      setCode("");
      setCodeRequested(true);
    } catch (error) {
      setError(errors(authErrorKey(error)));
    } finally {
      setCaptchaToken(undefined);
      setCaptchaAttempt((attempt) => attempt + 1);
      setShowResendCaptcha(false);
      setPending(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codeRequested) {
      await sendCode();
      return;
    }
    if (pending) return;
    const token = emailCode.safeParse(code);
    if (!token.success) {
      setError(errors("invalidCode"));
      return;
    }
    setError(null);
    setPending("verify");
    try {
      const { data, error } = await verifyEmailCode(email, token.data);
      if (error) throw error;
      if (!data.session) throw new Error("Email verification returned no session");
      // Reload the document so prefetched anonymous pages see the new session (#110).
      window.location.replace(redirectPath ?? "/");
    } catch (error) {
      setError(errors(authErrorKey(error)));
      setPending(null);
    }
  }

  const alternate = signingUp ? "/login" : "/sign-up";
  const sendDisabled = pending !== null || Boolean(captchaSiteKey && !captchaToken);

  return (
    <div className={cn("flex flex-col gap-lg", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">{t("title")}</CardTitle>
          <CardDescription aria-live="polite">
            {codeRequested ? auth("checkInbox", { email }) : t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" className="flex flex-col gap-lg" onSubmit={submit}>
            {codeRequested ? (
              <div className="grid gap-sm">
                <Label htmlFor="email-code">{auth("code")}</Label>
                <Input
                  ref={codeInput}
                  id="email-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-sm">
                  <Label htmlFor="email">{auth("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={auth("emailPlaceholder")}
                    required
                    disabled={pending !== null}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                {signingUp && (
                  <div className="grid gap-sm">
                    <Label htmlFor="username">{auth("username")}</Label>
                    <Input
                      id="username"
                      autoComplete="username"
                      required
                      disabled={pending !== null}
                      minLength={3}
                      maxLength={50}
                      pattern={"[a-zA-Z0-9_\\-]+"}
                      title={auth("usernameCharacters")}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            {error && <p role="alert" className="text-sm text-status-errorText">{error}</p>}
            {!codeRequested && captchaSiteKey && (
              <AuthCaptcha key={captchaAttempt} siteKey={captchaSiteKey} onToken={setCaptchaToken} />
            )}
            <div className="grid gap-sm">
              <Button type="submit" className="w-full" disabled={codeRequested ? pending !== null : sendDisabled}>
                {codeRequested
                  ? auth(pending === "verify" ? "verifying" : "verify")
                  : auth(pending === "send" ? "sending" : "send")}
              </Button>
              {codeRequested && (
                <>
                  {captchaSiteKey && showResendCaptcha && (
                    <AuthCaptcha key={captchaAttempt} siteKey={captchaSiteKey} onToken={setCaptchaToken} />
                  )}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={pending !== null || (showResendCaptcha && sendDisabled)}
                    onClick={() => {
                      if (captchaSiteKey && !showResendCaptcha) setShowResendCaptcha(true);
                      else void sendCode();
                    }}
                  >
                    {auth(pending === "send" ? "sending" : "resend")}
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={pending !== null}
                    onClick={() => {
                      setCodeRequested(false);
                      setShowResendCaptcha(false);
                      setCaptchaToken(undefined);
                      setError(null);
                    }}
                  >
                    {auth("changeEmail")}
                  </Button>
                </>
              )}
            </div>
          </form>
          <div className="mt-md text-center text-caption">
            {t("alternatePrompt")}{" "}
            <Link
              href={redirectPath ? `${alternate}?redirect=${encodeURIComponent(redirectPath)}` : alternate}
              className="underline"
            >
              {t("alternateAction")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
