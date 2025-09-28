import { Button } from "@/components/ui/button";
import { HarborMark } from "@/components/hero";
import { Anchor, CheckCircle, Waves } from "lucide-react";
import Link from "next/link";

export default function LogoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 backdrop-blur-sm p-8 text-center">
          {/* Harbor icon with success indicator */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <HarborMark className="w-16 h-16" />
              <CheckCircle className="w-6 h-6 text-green-500 absolute -top-1 -right-1 bg-background rounded-full" />
            </div>
          </div>

          {/* Success message */}
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            Anchors aweigh!
          </h1>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            You've successfully set sail from PartHarbor. Your session has ended safely and all your data remains secure in our harbor.
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/">
                <Anchor className="w-4 h-4" />
                Return to harbor
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/login">
                <Waves className="w-4 h-4" />
                Sign in again
              </Link>
            </Button>
          </div>

          {/* Additional helpful text */}
          <p className="text-xs text-muted-foreground mt-6">
            Thank you for being part of the PartHarbor community. We're here whenever you need to find or share spare parts.
          </p>
        </div>
      </div>
    </div>
  );
}
