import { AuthShell } from "@/components/layout/auth-shell";
import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccountConfirmPage() {
  return (
    <AuthShell>
      <Card className="shadow-overlay">
        <CardHeader className="space-y-xs text-center">
          <CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">
            Confirm deletion
          </CardTitle>
          <CardDescription className="text-body text-text-secondary">
            This action is permanent. Type DELETE to remove your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
