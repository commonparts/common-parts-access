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
    <nav className="w-full border-b border-border-strong bg-text-primary text-text-inverse shadow-surface">
      <Container
        size="xl"
        className="flex items-center justify-between gap-md py-sm text-body text-text-inverse"
      >
        <div className="flex items-center gap-sm font-heading text-heading-sm font-bold">
          <Link
            href={"/"}
            className="flex items-center gap-xs rounded-md px-sm py-xs transition-colors hover:text-action-primary"
          >
            PartHarbor
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <SearchBar />
        </div>

        <div className="flex items-center gap-sm">
          <Link
            href="/browse"
            className="hidden rounded-md px-sm py-xs text-body text-text-inverse transition-colors hover:text-action-primary lg:inline-flex"
          >
            Browse
          </Link>
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
