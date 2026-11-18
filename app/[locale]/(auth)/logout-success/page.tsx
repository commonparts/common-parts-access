import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function LogoutSuccessPage() {
  const t = await getTranslations("LogoutSuccessPage");
  return (
    <AuthShell>
      <Card className="text-center shadow-overlay">
        <CardHeader className="space-y-xs">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-sm">
          <div className="grid gap-sm">
            <Button asChild className="w-full">
              <Link href="/">{t("home")}</Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          </div>

          <p className="text-caption text-text-secondary">
            {t("thanks")}
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
