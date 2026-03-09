import Link from "next/link";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccountSuccessPage() {
  return (
    <AuthShell>
      <Card className="shadow-overlay">
        <CardHeader className="space-y-xs text-center">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            Account deleted
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            Your account has been removed. Thanks for being part of Common Parts Access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-sm">
          <Button asChild className="w-full">
            <Link href="/">Return home</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/sign-up">Create a new account</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
