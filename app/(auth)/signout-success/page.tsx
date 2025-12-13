import { Button } from "@/components/ui/button";
import { HarborMark } from "@/components/layout/hero";
import { Anchor, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 backdrop-blur-sm p-8 text-center">
          {/* Harbor icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <HarborMark className="w-16 h-16" />
              <CheckCircle className="w-6 h-6 text-green-500 absolute -top-1 -right-1 bg-background rounded-full" />
            </div>
          </div>

          {/* Success message */}
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            Safe passage secured
          </h1>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            You&apos;ve successfully departed the harbor. Your session has been cleared and your data is secure.
          </p>

          {/* Return to harbor button */}
          <Button asChild size="lg" className="w-full">
            <Link href="/">
              <Anchor className="w-4 h-4" />
              Return to harbor
            </Link>
          </Button>

          {/* Additional helpful text */}
          <p className="text-xs text-muted-foreground mt-4">
            Ready to dock again? You can sign in anytime to rejoin the community.
          </p>
        </div>
      </div>
    </div>
  );
}
