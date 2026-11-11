import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { passwordResetRetryReason } from "@/lib/schemas/auth";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function Page({ searchParams }: ForgotPasswordPageProps): Promise<React.JSX.Element> {
  const rejectedLink = passwordResetRetryReason.safeParse((await searchParams).error).success;

  return (
    <AuthShell>
      <ForgotPasswordForm rejectedLink={rejectedLink} />
    </AuthShell>
  );
}
