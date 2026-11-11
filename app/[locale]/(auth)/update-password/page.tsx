import { PasswordResetLinkRedirect } from "@/components/auth/password-reset-link-redirect";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <PasswordResetLinkRedirect />
      <UpdatePasswordForm />
    </AuthShell>
  );
}
