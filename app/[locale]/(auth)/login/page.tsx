import { Suspense } from "react";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      {/* EmailAuthForm reads useSearchParams(), which needs its own boundary. */}
      <Suspense>
        <EmailAuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
