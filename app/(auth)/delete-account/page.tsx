import Link from "next/link";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccountPage() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md">
        <Card className="shadow-overlay">
          <CardHeader className="space-y-xs text-center">
            <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
              Delete your account
            </CardTitle>
            <CardDescription className="text-body text-text-secondary">
              This will permanently remove your account and associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-sm">
            <div className="rounded-lg border border-border-subtle bg-bg-muted p-md text-sm text-text-secondary">
              <p>
                You will lose access to any models, likes, collections, and profile information. If you proceed, your
                account will be removed and you will be signed out immediately.
              </p>
            </div>
            <Button asChild variant="destructive" className="w-full">
              <Link href="/delete-account/confirm">Continue to confirmation</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
