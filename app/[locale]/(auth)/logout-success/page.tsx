import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function LogoutSuccessPage() {
  const t = await getTranslations("LogoutSuccessPage");
  return (
    <AuthShell>
      <Card className="text-center shadow-none">
        <CardHeader className="items-center gap-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/70">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4" />
                {t("home")}
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                {t("signIn")}
              </Link>
            </Button>
          </div>

          <p className="text-xs text-text-secondary">
            {t("thanks")}
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
