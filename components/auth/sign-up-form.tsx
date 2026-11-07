"use client";

import { cn } from "@/lib/utils";
import { signUp } from "@/lib/supabase/queries/auth.client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { parseRedirectParam } from "@/lib/utils/validation";
import { authErrorKey } from "@/lib/utils/auth-errors";

/** Shortest username accepted at sign-up. */
const USERNAME_MIN_LENGTH = 3;

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("SignUpForm");
  const auth = useTranslations("AuthForms");
  const errors = useTranslations("AuthErrors");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = parseRedirectParam(searchParams.get("redirect"));

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t("passwordsDiffer"));
      setIsLoading(false);
      return;
    }

    if (!username.trim()) {
      setError(t("usernameRequired"));
      setIsLoading(false);
      return;
    }

    // Basic username validation
    if (username.length < USERNAME_MIN_LENGTH) {
      setError(t("usernameTooShort", { min: USERNAME_MIN_LENGTH }));
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(t("usernameCharacters"));
      setIsLoading(false);
      return;
    }

    try {
      const confirmUrl = redirectPath
        ? `${window.location.origin}/confirm?next=${encodeURIComponent(redirectPath)}`
        : `${window.location.origin}/confirm`;
      const { error } = await signUp(email, password, username, locale, confirmUrl);
      if (error) throw error;
      router.push("/sign-up-success");
    } catch (error: unknown) {
      setError(errors(authErrorKey(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-lg", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-lg">
              <div className="grid gap-sm">
                <Label htmlFor="email">{auth("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={auth("emailPlaceholder")}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-sm">
                <Label htmlFor="username">{t("username")}</Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={USERNAME_MIN_LENGTH}
                  pattern="[a-zA-Z0-9_-]+"
                  title={t("usernameCharacters")}
                />
              </div>
              <div className="grid gap-sm">
                <div className="flex items-center">
                  <Label htmlFor="password">{auth("password")}</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-sm">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">{t("repeatPassword")}</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-status-errorText">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("submitting") : t("submit")}
              </Button>
            </div>
            <div className="mt-md text-center text-caption">
              {t("haveAccount")}{" "}
              <Link
                href={
                  redirectPath
                    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
                    : "/login"
                }
                className="underline"
              >
                {t("signIn")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
