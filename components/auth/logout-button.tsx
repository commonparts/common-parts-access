"use client";

import { signOut } from "@/lib/supabase/queries/auth.client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await signOut();
    router.push("/logout-success");
  };

  return <Button variant={"secondary"} onClick={logout}>Logout</Button>;
}
