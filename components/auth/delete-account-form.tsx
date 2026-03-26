"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRMATION_PHRASE = "DELETE";

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (confirmText.trim().toUpperCase() !== CONFIRMATION_PHRASE) {
      setError('Please type "DELETE" to confirm.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/users", { method: "DELETE" });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(body?.error ?? "Unable to delete your account right now.");
          return;
        }

        router.replace("/delete-account/success");
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-sm">
      <div className="space-y-xs">
        <label className="text-sm font-semibold text-text-primary" htmlFor="confirm-text">
          Type DELETE to confirm
        </label>
        <Input
          id="confirm-text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          disabled={isPending}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? "Deleting..." : "Delete my account"}
      </Button>
    </form>
  );
}
