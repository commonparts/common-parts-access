import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
