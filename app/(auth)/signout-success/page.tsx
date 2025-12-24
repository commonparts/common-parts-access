import { Button } from "@/components/ui/button";
import { HarborMark } from "@/components/layout/hero";
import { Anchor, CheckCircle } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignOutPage() {
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
            Safe passage secured
          </h1>

          <p className="mb-8 leading-relaxed text-muted-foreground">
            You&apos;ve successfully departed the harbor. Your session has been cleared and your data is secure.
          </p>

          <Button asChild className="w-full">
            <Link href="/">
              <Anchor className="h-4 w-4" />
              Return to harbor
            </Link>
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            Ready to dock again? You can sign in anytime to rejoin the community.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
