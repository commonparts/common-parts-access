import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/users - List users (admin only)
export async function GET(_request: NextRequest) {
  // TODO: Implement user listing (admin only)
  return NextResponse.json({ message: "Users API endpoint" });
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  // TODO: Implement user creation
  const body = await request.json();
  return NextResponse.json({ message: "User created", user: body }, { status: 201 });
}

// DELETE /api/users - Delete current user account
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("deleteUser failed", deleteError);
      return NextResponse.json(
        { error: "Unable to delete account right now." },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("deleteUser admin client error", err);
    return NextResponse.json(
      { error: "Account deletion is not configured." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}