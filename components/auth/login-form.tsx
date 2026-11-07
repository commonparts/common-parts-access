"use client";

import { cn } from "@/lib/utils";
import { signInWithPassword } from "@/lib/supabase/queries/auth.client";
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
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseRedirectParam } from "@/lib/utils/validation";
import { authErrorKey } from "@/lib/utils/auth-errors";

/** Where a user lands after signing in when no safe `redirect` param is set. */
const DEFAULT_POST_LOGIN_PATH = "/";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("LoginForm");
  const auth = useTranslations("AuthForms");
  const errors = useTranslations("AuthErrors");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectPath = parseRedirectParam(searchParams.get("redirect"));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signInWithPassword(email, password);
      if (error) throw error;
      // Full document navigation is deliberate (#110, #112). A soft
      // router.push sent users back to /login (#110): the client still holds
      // state built for an anonymous visitor (server-rendered layouts, the
      // router cache, prefetched protected routes). A fresh document load
      // renders every segment with the new session cookie. replace() keeps
      // /login out of the history so "back" does not return to the form.
      window.location.replace(redirectPath ?? DEFAULT_POST_LOGIN_PATH);
    } catch (error: unknown) {
      console.error("[LoginForm] Login error:", error);
      setError(errors(authErrorKey(error)));
      // Reset only on failure: on success the button stays in its loading
      // state until the next document replaces this page.
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
          <form onSubmit={handleLogin}>
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
                <div className="flex items-center">
                  <Label htmlFor="password">{auth("password")}</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-caption underline"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-status-errorText">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("submitting") : t("submit")}
              </Button>
            </div>
            <div className="mt-md text-center text-caption">
              {t("noAccount")}{" "}
              <Link
                href={
                  redirectPath
                    ? `/sign-up?redirect=${encodeURIComponent(redirectPath)}`
                    : "/sign-up"
                }
                className="underline"
              >
                {t("signUp")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
