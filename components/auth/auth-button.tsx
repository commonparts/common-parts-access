import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";

export async function AuthButton() {
  const {
    data: { user },
  } = await getCurrentUser();

  return (
    <div className="flex gap-sm">
      <Button asChild variant={"link"}>
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
