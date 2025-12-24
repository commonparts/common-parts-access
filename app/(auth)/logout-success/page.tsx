import { Button } from "@/components/ui/button";
import { HarborMark } from "@/components/layout/hero";
import { Anchor, CheckCircle, Waves } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";

export default function LogoutSuccessPage() {
  return (
    <AuthShell size="md">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-lg backdrop-blur-sm">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <HarborMark className="h-16 w-16" />
              <CheckCircle className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background text-green-500" />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-heading font-bold text-foreground">
            Anchors aweigh!
          </h1>

          <p className="mb-8 leading-relaxed text-muted-foreground">
            You&apos;ve successfully set sail from PartHarbor. Your session has ended safely and all your data remains secure in our harbor.
          </p>

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

          <p className="mt-6 text-xs text-muted-foreground">
            Thank you for being part of the PartHarbor community. We&apos;re here whenever you need to find or share spare parts.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
