import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  // Determine if this is a confirmation link error
  const isConfirmationError = error?.includes('confirmation link') || error?.includes('expired');

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isConfirmationError ? "Link Expired or Invalid" : "Authentication Error"}
            </CardTitle>
            {isConfirmationError && (
              <CardDescription>
                Your confirmation link could not be processed.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <>
                <p className="text-sm text-text-secondary">
                  {error}
                </p>
                {isConfirmationError && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-text-secondary">
                      <strong>What you can do:</strong>
                    </p>
                    <ul className="text-sm text-text-secondary list-disc list-inside space-y-2">
                      <li>Return to <Link href="/sign-up" className="text-action-primary hover:underline">sign-up</Link> and request a new confirmation email</li>
                      <li>Check your email spam folder for the confirmation link</li>
                      <li>Confirmation links expire after 24 hours</li>
                    </ul>
                    <div className="pt-4 flex gap-3">
                      <Button asChild>
                        <Link href="/sign-up">Sign Up Again</Link>
                      </Button>
                      <Button variant="secondary" asChild>
                        <Link href="/login">Log In</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  An unspecified error occurred during authentication.
                </p>
                <Button asChild>
                  <Link href="/">Return Home</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
