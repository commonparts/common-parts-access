import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DeleteAccountPage() {
  const t = await getTranslations("DeleteAccountPage");
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
          <div className="space-y-xs rounded-lg border border-border-subtle bg-bg-muted p-md text-sm text-text-secondary">
            <p>{t("scope")}</p>
            <p>{t("publishedParts")}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/delete-account/confirm">{t("continue")}</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/">{t("cancel")}</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
