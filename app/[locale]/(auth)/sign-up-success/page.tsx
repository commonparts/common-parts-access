import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function Page() {
  const t = await getTranslations("SignUpSuccessPage");
  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">{t("body")}</p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
