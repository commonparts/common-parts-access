import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DeleteAccountSuccessPage() {
  const t = await getTranslations("DeleteAccountSuccessPage");
  return (
    <AuthShell>
      <Card className="shadow-overlay">
        <CardHeader className="space-y-xs text-center">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-sm">
          <Button asChild className="w-full">
            <Link href="/">{t("home")}</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/sign-up">{t("signUp")}</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
