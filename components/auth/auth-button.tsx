import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { LogoutButton } from "@/components/auth/logout-button";

export async function AuthButton() {
  const {
    data: { user },
  } = await getCurrentUser();

  return user ? (
    <div className="flex items-center gap-md">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-sm">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
