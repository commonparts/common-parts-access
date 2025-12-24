import { Button } from "@/components/ui/button";
import { CurrentUserAvatar } from "@/components/user/current-user-profile";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { AuthButton } from "@/components/auth/auth-button";
import { SearchBar } from "@/components/layout/search-bar";
import { Container } from "@/components/layout/container";

export default async function Navbar() {
  const { data: { user } } = await getCurrentUser();

  return (
    <nav className="w-full border-b border-border-subtle bg-bg-surface backdrop-blur">
      <Container size="xl" className="flex items-center justify-between gap-md py-sm text-body">
        <div className="flex items-center gap-sm font-heading text-heading-sm font-bold text-text-primary">
          <Link href={"/"} className="flex items-center gap-xs text-text-primary">
            PartHarbor
          </Link>
        </div>

        <div className="hidden flex-1">
          <SearchBar />
        </div>

        <div className="flex items-center gap-sm">
          {user ? (
            <>
              <Button asChild variant={"default"}>
                <Link href="/upload">Dock a model</Link>
              </Button>
              <LogoutButton />
              <CurrentUserAvatar />
            </>
          ) : (
            <AuthButton />
          )}
        </div>
      </Container>
    </nav>
  );
}
