import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </AuthShell>
  );
}
