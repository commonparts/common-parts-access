import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      {/* SignUpForm reads useSearchParams(), which needs its own boundary. */}
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
