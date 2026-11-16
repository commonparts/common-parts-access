import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignUpConfirmationForm } from "@/components/auth/sign-up-confirmation-form";
import { parseRedirectParam } from "@/lib/utils/validation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const t = await getTranslations("SignUpSuccessPage");
  const { redirect } = await searchParams;
  const redirectPath = parseRedirectParam(typeof redirect === "string" ? redirect : null);
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpConfirmationForm redirectPath={redirectPath} />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
