"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountForm() {
  const t = useTranslations("DeleteAccountForm");
  // The word the user types to confirm, in the language of the page.
  const confirmWord = t("confirmWord");
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (confirmText.trim().toUpperCase() !== confirmWord) {
      setError(t("typeToConfirm", { word: confirmWord }));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/users", { method: "DELETE" });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(body?.error ?? t("failed"));
          return;
        }

        router.replace("/delete-account/success");
      } catch (err) {
        console.error(err);
        setError(t("failed"));
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-sm">
      <div className="space-y-xs">
        <label className="text-sm font-semibold text-text-primary" htmlFor="confirm-text">
          {t("label", { word: confirmWord })}
        </label>
        <Input
          id="confirm-text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={confirmWord}
          autoComplete="off"
          disabled={isPending}
        />
      </div>

      {error ? <p role="alert" className="text-sm text-status-errorText">{error}</p> : null}

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
