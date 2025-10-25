import { Button } from "@/components/ui/button";
import { CurrentUserAvatar } from "@/components/user/current-user-profile";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth/auth-button";
import { HarborMark } from "@/components/layout/hero";
import { SearchBar } from "@/components/layout/search-bar";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full flex justify-between items-center p-3 px-6 text-sm gap-6">
        <div className="flex items-center gap-4 font-heading font-bold text-lg">
          <Link href={"/"} className="flex items-center gap-2">
            <HarborMark width={24} height={24} />
            PartHarbor
          </Link>
        </div>
        
        <div className="flex-1 max-w-md hidden">
          <SearchBar />
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button asChild size="sm" variant={"default"}>
                <Link href="/upload">Dock a model</Link>
              </Button>
              <LogoutButton />
              <CurrentUserAvatar />
            </>
          ) : (
            <AuthButton />
          )}
        </div>
      </div>
    </nav>
  );
}
