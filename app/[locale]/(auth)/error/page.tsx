import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CONFIRMATION_ERROR } from "@/lib/utils/auth-errors";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("AuthErrorPage");
  // The email confirmation callback (/confirm) sends `error=confirmation`
  // when the link is missing its token, invalid or expired.
  const isConfirmationError = (await searchParams).error === CONFIRMATION_ERROR;

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isConfirmationError ? t("confirmationTitle") : t("title")}
            </CardTitle>
            {isConfirmationError && (
              <CardDescription>{t("confirmationDescription")}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isConfirmationError ? (
              <>
                <p className="text-sm text-status-errorText">{t("confirmationError")}</p>
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-text-secondary">
                    <strong>{t("whatYouCanDo")}</strong>
                  </p>
                  <ul className="text-sm text-text-secondary list-disc list-inside space-y-2">
                    <li>
                      {t.rich("requestNewEmail", {
                        link: (chunks) => (
                          <Link href="/sign-up" className="text-action-primary hover:underline">
                            {chunks}
                          </Link>
                        ),
                      })}
                    </li>
                    <li>{t("checkSpam")}</li>
                    <li>{t("linkExpiry")}</li>
                  </ul>
                  <div className="pt-4 flex gap-3">
                    <Button asChild>
                      <Link href="/sign-up">{t("signUpAgain")}</Link>
                    </Button>
                    <Button variant="secondary" asChild>
                      <Link href="/login">{t("signIn")}</Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-status-errorText">{t("unspecified")}</p>
                <Button asChild>
                  <Link href="/">{t("home")}</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
