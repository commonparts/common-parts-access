import { UserProfileMenu } from "@/components/user/user-avatar";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { AuthButton } from "@/components/auth/auth-button";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EXTERNAL_URLS } from "@/lib/utils/constants";

export default async function Navbar() {
  const { data: { user } } = await getCurrentUser();
  const menuLinks = [
    { label: "Browse", href: "/browse" },
    { label: "Contribute", href: "/upload" },
    { label: "Documentation", href: EXTERNAL_URLS.DOCUMENTATION },
  ];

  return (
    <nav className="w-full border-b border-border-strong bg-background-surface shadow-surface">
      <Container
        size="xl"
        className="flex items-center justify-between gap-md py-xs"
      >
        <div className="flex items-center gap-sm text-logo">
          <Logo asLink />
        </div>

        <div className="flex items-center gap-xs text-body">
          {menuLinks.map((item) => (
            <Button asChild key={item.label} variant="link">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}

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
