import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor, CheckCircle, Waves } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";

export default function LogoutSuccessPage() {
  return (
    <AuthShell size="md">
      <div className="mx-auto w-full max-w-md">
        <Card className="text-center shadow-overlay">
          <CardHeader className="items-center gap-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/70">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
              Anchors aweigh!
            </CardTitle>
            <CardDescription className="text-body text-text-secondary">
              You&apos;ve successfully set sail from PartHarbor. Your session has ended safely and all your data remains secure in our harbor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/">
                  <Anchor className="h-4 w-4" />
                  Return to harbor
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <Waves className="h-4 w-4" />
                  Sign in again
                </Link>
              </Button>
            </div>

            <p className="text-xs text-text-secondary">
              Thank you for being part of the PartHarbor community. We&apos;re here whenever you need to find or share spare parts.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
