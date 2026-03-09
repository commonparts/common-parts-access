import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home, LogIn } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";

export default function LogoutSuccessPage() {
  return (
    <AuthShell>
      <Card className="text-center shadow-none">
        <CardHeader className="items-center gap-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/70">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            Signed out
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            You&apos;ve signed out of Common Parts Access. Your session ended securely and your data remains safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4" />
                Return home
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Sign in again
              </Link>
            </Button>
          </div>

          <p className="text-xs text-text-secondary">
            Thank you for being part of Common Parts Access. We&apos;re here whenever you need to find or publish repair parts.
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
