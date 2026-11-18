"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeEmailSignUp } from "@/lib/actions/account";
import { emailCode, emailCodeAddress } from "@/lib/schemas/auth";
import { requestEmailCode, verifyEmailCode } from "@/lib/supabase/queries/auth.client";
import { authErrorKey } from "@/lib/utils/auth-errors";
import { cn } from "@/lib/utils";
import { parseRedirectParam } from "@/lib/utils/validation";

interface Props extends ComponentPropsWithoutRef<"div"> {
  mode: "login" | "sign-up";
}

/** Requests and verifies email codes and saves a new user's name after verification. */
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
  const [step, setStep] = useState<"request" | "code" | "username">("request");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const usernameInput = useRef<HTMLInputElement>(null);
  const codeRequested = step === "code";
  const retryingUsername = step === "username";

  useEffect(() => {
    if (codeRequested) codeInput.current?.focus();
    if (retryingUsername) usernameInput.current?.focus();
  }, [codeRequested, retryingUsername]);

  async function sendCode() {
    if (pending) return;
    const address = emailCodeAddress.safeParse(email);
    if (!address.success) {
      setError(errors("invalidEmail"));
      return;
    }
    setError(null);
    setPending("send");
    try {
      const account = signingUp && !codeRequested ? { username, locale } : undefined;
      const { error } = await requestEmailCode(address.data, account);
      if (error) throw error;
      setEmail(address.data);
      setCode("");
      setStep("code");
    } catch (error) {
      setError(errors(authErrorKey(error)));
    } finally {
      setPending(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "request") {
      await sendCode();
      return;
    }
    if (pending) return;
    const token = codeRequested ? emailCode.safeParse(code) : null;
    if (token && !token.success) {
      setError(errors("invalidCode"));
      return;
    }
    setError(null);
    setPending("verify");
    try {
      if (token) {
        const { data, error } = await verifyEmailCode(email, token.data);
        if (error) throw error;
        if (!data.session) throw new Error("Email verification returned no session");
      }
      if (signingUp) {
        const result = await completeEmailSignUp(username).catch(() => null);
        if (!result?.ok) {
          setStep("username");
          setError(result?.error ?? errors("generic"));
          setPending(null);
          return;
        }
      }
      // Reload the document so prefetched anonymous pages see the new session (#110).
      window.location.replace(redirectPath ?? "/");
    } catch (error) {
      setError(errors(authErrorKey(error)));
      setPending(null);
    }
  }

  const alternate = signingUp ? "/login" : "/sign-up";

  return (
    <div className={cn("flex flex-col gap-lg", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm font-heading">{t("title")}</CardTitle>
          <CardDescription className="text-body" aria-live="polite">
            {retryingUsername
              ? auth("chooseUsername")
              : codeRequested ? auth("checkInbox", { email }) : t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" className="grid gap-md" onSubmit={submit}>
            {codeRequested ? (
              <div className="grid gap-xs">
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
            ) : !retryingUsername && (
              <div className="grid gap-xs">
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
            )}
            {signingUp && !codeRequested && (
              <div className="grid gap-xs">
                <Label htmlFor="username">{auth("username")}</Label>
                <Input
                  ref={usernameInput}
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
            {error && <p role="alert" className="text-sm text-status-errorText">{error}</p>}
            <div className="grid gap-sm">
              <Button type="submit" className="w-full" disabled={pending !== null}>
                {retryingUsername
                  ? auth(pending === "verify" ? "finishingSignUp" : "finishSignUp")
                  : codeRequested
                    ? auth(pending === "verify" ? "verifying" : "verify")
                    : auth(pending === "send" ? "sending" : "send")}
              </Button>
              {codeRequested && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={pending !== null}
                    onClick={sendCode}
                  >
                    {auth(pending === "send" ? "sending" : "resend")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={pending !== null}
                    onClick={() => {
                      setStep("request");
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
