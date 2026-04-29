import { UserProfileMenu } from "@/components/user/user-avatar";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { Logo } from "@/components/layout/logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Navbar() {
  const {
    data: { user },
  } = await getCurrentUser();

  const menuLinks = [
    { label: "Browse Parts", href: "/browse" },
    { label: "Registry", href: "/browse/latest" },
    { label: "About", href: "/about" },
    { label: "Common Parts", href: "https://commonparts.org" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-default bg-bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-container-xl items-center justify-between px-md">
        <Logo asLink />

        <div className="hidden items-center gap-lg md:flex">
          {menuLinks.map((item) => (
            <Button
              key={item.label}
              asChild
              variant="ghost"
              size="sm"
              className="font-medium"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}

          {user ? (
            <UserProfileMenu />
          ) : (
            <div className="flex items-center gap-xs">
              <Button asChild variant="ghost" size="sm" className="font-medium">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="default" size="sm" className="font-medium">
                <Link href="/upload">Publish a Part</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}