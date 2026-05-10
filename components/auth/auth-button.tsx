import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function AuthButton() {
  return (
    <div className="flex gap-sm">
      <Button asChild variant={"link"}>
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
