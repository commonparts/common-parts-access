import { UserProfileMenu } from "@/components/user/user-avatar";
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
        className="flex items-center justify-between gap-md py-md text-body text-text-inverse"
      >
        <div className="flex items-center gap-sm font-heading text-heading-sm font-medium">
          <Link
            href={"/"}
            className="flex items-center gap-xs rounded-md px-sm py-xs transition-colors hover:text-action-primary"
          >
            Common Parts Access
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <SearchBar />
        </div>

        <div className="flex items-center gap-sm">
          {user ? (
            <UserProfileMenu />
          ) : (
            <AuthButton />
          )}
        </div>
      </Container>
    </nav>
  );
}
