import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor, CheckCircle } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignOutPage() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <Card className="text-center shadow-overlay">
          <CardHeader className="items-center gap-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/70">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
              Safe passage secured
            </CardTitle>
            <CardDescription className="text-body text-text-secondary">
              You&apos;ve successfully departed the harbor. Your session has been cleared and your data is secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/">
                <Anchor className="h-4 w-4" />
                Return to harbor
              </Link>
            </Button>

            <p className="text-xs text-text-secondary">
              Ready to dock again? You can sign in anytime to rejoin the community.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
