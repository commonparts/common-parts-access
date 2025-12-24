import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <SignUpForm />
      </div>
    </AuthShell>
  );
}
