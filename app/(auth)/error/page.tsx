import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/layout/auth-shell";
import Link from "next/link";

const EXPIRED_PHRASES = ["expired", "invalid", "already used", "no token"];

function isExpiredOrInvalidLink(error: string) {
  const lower = error.toLowerCase();
  return EXPIRED_PHRASES.some((phrase) => lower.includes(phrase));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const error = params?.error ?? "";
  const linkIssue = !error || isExpiredOrInvalidLink(error);

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Sorry, something went wrong.
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {linkIssue ? (
              <p className="text-sm text-muted-foreground">
                Your confirmation link has expired or is no longer valid. Please{" "}
                <Link href="/sign-up" className="underline">
                  sign up again
                </Link>{" "}
                to receive a new confirmation email.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                An authentication error occurred. Please try again or{" "}
                <Link href="/sign-up" className="underline">
                  create a new account
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
