import { NextResponse } from "next/server";

import { AccountDeletionError, deleteAccount } from "@/lib/account/deletion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccountDeletionSteps } from "@/lib/supabase/queries/account-deletion";
import { createClient } from "@/lib/supabase/server";
import { getApiTranslations } from '@/lib/api/translations'

// DELETE /api/users - Delete current user account
// Published parts stay without an owner, likes and comments are anonymized,
// collections and unpublished parts are deleted (issue #178, see
// docs/ACCOUNT_DELETION_POLICY.md).
export async function DELETE(request: Request) {
  const t = await getApiTranslations(request)
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: t('signInRequired') }, { status: 401 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    console.error("Account deletion: admin client unavailable", err);
    return NextResponse.json(
      { error: t('accountDeletionUnavailable') },
      { status: 503 },
    );
  }

  try {
    await deleteAccount(user.id, createAccountDeletionSteps(adminClient));
  } catch (err) {
    // The stage names where deletion stopped; every stage is safe to retry.
    console.error("Account deletion failed", err instanceof AccountDeletionError ? err.stage : "unknown", err);
    return NextResponse.json(
      { error: t('accountDeletionFailed') },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
