import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DeleteAccountConfirmPage() {
  const t = await getTranslations("DeleteAccountForm");
  return (
    <AuthShell>
      <Card className="shadow-overlay">
        <CardHeader className="space-y-xs text-center">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            {t("description", { word: t("confirmWord") })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
