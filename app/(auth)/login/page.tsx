import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      {/* LoginForm reads useSearchParams(), which needs its own boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
