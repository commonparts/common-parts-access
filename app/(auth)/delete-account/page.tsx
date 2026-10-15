import Link from "next/link";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccountPage() {
  return (
    <AuthShell>
      <Card className="shadow-overlay">
        <CardHeader className="space-y-xs text-center">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            Delete your account
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            This permanently deletes your account and your personal data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-sm">
          <div className="space-y-xs rounded-lg border border-border-subtle bg-bg-muted p-md text-sm text-text-secondary">
            <p>
              Your profile, collections and unpublished parts are deleted. Parts you published stay available, no
              longer attributed to you, and your likes are kept anonymously.
            </p>
            <p>
              To have your published parts removed as well, email contact@commonparts.org before deleting your account.
              If you proceed, you will be signed out immediately.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/delete-account/confirm">Continue to confirmation</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
