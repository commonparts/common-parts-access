import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
