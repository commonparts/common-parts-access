"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/queries/auth.client";

export function SignOutEverywhere() {
  const t = useTranslations("SignOutEverywhere");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await signOut("global");
      if (error) throw error;
      window.location.replace(getPathname({ href: "/logout-success", locale }));
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="space-y-sm">
      <p>{t("description")}</p>
      <Button type="button" variant="secondary" onClick={handleSignOut} disabled={pending}>
        {t(pending ? "pending" : "action")}
      </Button>
      {failed && <p role="alert" className="text-status-errorText">{t("failure")}</p>}
    </div>
  );
}
