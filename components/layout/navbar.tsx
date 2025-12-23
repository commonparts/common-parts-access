import { Button } from "@/components/ui/button";
import { CurrentUserAvatar } from "@/components/user/current-user-profile";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { AuthButton } from "@/components/auth/auth-button";
import { HarborMark } from "@/components/layout/hero";
import { SearchBar } from "@/components/layout/search-bar";

export default async function Navbar() {
  const { data: { user } } = await getCurrentUser();

  return (
    <nav className="flex w-full justify-center border-b border-border-subtle bg-bg-surface backdrop-blur">
      <div className="flex w-full max-w-screen-xl items-center justify-between gap-md px-lg py-sm text-body">
        <div className="flex items-center gap-sm font-heading font-bold text-heading-sm text-text-primary">
          <Link href={"/"} className="flex items-center gap-xs text-text-primary">
            <HarborMark width={24} height={24} />
            PartHarbor
          </Link>
        </div>
        
        <div className="hidden flex-1">
          <SearchBar />
        </div>
        
        <div className="flex items-center gap-sm">
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
