"use client";

import { cn } from "@/lib/utils";
import { resetPasswordForEmail } from "@/lib/supabase/queries/auth.client";
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
import { authErrorKey } from "@/lib/utils/auth-errors";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ForgotPasswordFormProps extends React.ComponentPropsWithoutRef<"div"> {
  rejectedLink?: boolean;
}

export function ForgotPasswordForm({
  className,
  rejectedLink = false,
  ...props
}: ForgotPasswordFormProps): React.JSX.Element {
  const t = useTranslations("ForgotPasswordForm");
  const auth = useTranslations("AuthForms");
  const errors = useTranslations("AuthErrors");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await resetPasswordForEmail(email, `${window.location.origin}/update-password`);
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(errors(authErrorKey(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-lg", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-sm">{t("sentTitle")}</CardTitle>
            <CardDescription>{t("sentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-caption text-text-secondary">{t("sentBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-sm">{t(rejectedLink ? "rejectedLinkTitle" : "title")}</CardTitle>
            <CardDescription>{t(rejectedLink ? "rejectedLinkDescription" : "description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
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
                {error && <p role="alert" className="text-sm text-status-errorText">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("submitting") : t(rejectedLink ? "resend" : "submit")}
                </Button>
              </div>
              <div className="mt-md text-center text-caption">
                {t("haveAccount")}{" "}
                <Link
                  href="/login"
                  className="underline"
                >
                  {t("signIn")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
