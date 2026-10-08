import { NextResponse } from "next/server";

import { AccountDeletionError, deleteAccount } from "@/lib/account/deletion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccountDeletionSteps } from "@/lib/supabase/queries/account-deletion";
import { createClient } from "@/lib/supabase/server";

// GET /api/users - List users (admin only)
export async function GET() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Admin user listing is not implemented yet. Track this work in a GitHub issue.",
    },
    { status: 501 },
  );
}

// POST /api/users - Create user
export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Admin user creation is not implemented yet. Track this work in a GitHub issue.",
    },
    { status: 501 },
  );
}

// DELETE /api/users - Delete current user account
// Published parts stay without an owner, likes and comments are anonymized,
// collections and unpublished parts are deleted (issue #178, see
// docs/ACCOUNT_DELETION_POLICY.md).
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    console.error("Account deletion: admin client unavailable", err);
    return NextResponse.json(
      { error: "Automated account deletion is not available yet. To delete your account, please email contact@commonparts.org." },
      { status: 503 },
    );
  }

  try {
    await deleteAccount(user.id, createAccountDeletionSteps(adminClient));
  } catch (err) {
    // The stage names where deletion stopped; every stage is safe to retry.
    console.error("Account deletion failed", err instanceof AccountDeletionError ? err.stage : "unknown", err);
    return NextResponse.json(
      { error: "Unable to delete your account right now. Please try again, or email contact@commonparts.org if it keeps failing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
