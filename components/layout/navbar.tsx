import { UserProfileMenu } from "@/components/user/user-avatar";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { AuthButton } from "@/components/auth/auth-button";
import { SearchBar } from "@/components/layout/search-bar";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";

export default async function Navbar() {
  const { data: { user } } = await getCurrentUser();

  return (
    <nav className="w-full border-b border-border-strong bg-text-primary text-text-inverse shadow-surface">
      <Container
        size="xl"
        className="flex items-center justify-between gap-md py-md text-body text-text-inverse"
      >
        <div className="flex items-center gap-sm">
          <Logo asLink />
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
