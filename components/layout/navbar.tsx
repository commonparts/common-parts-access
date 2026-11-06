import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { UserProfileMenu } from "@/components/user/user-avatar";
import { getCurrentUser } from "@/lib/supabase/queries/auth.server";
import { Logo } from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchBar } from "@/components/layout/search-bar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default async function Navbar() {
  const {
    data: { user },
  } = await getCurrentUser();
  const t = await getTranslations("Navbar");

  const menuLinks = [
    { label: t("browse"), href: "/browse" },
    { label: t("contribute"), href: "/contributing" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-default bg-bg-surface">
      <div className="mx-auto flex h-16 max-w-container-xl items-center justify-between px-md">
        <Logo asLink />

        {/* Primary search — grouped autocomplete; hidden on mobile */}
        <div className="hidden flex-1 justify-center px-lg md:flex">
          <SearchBar
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-xl"
          />
        </div>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden items-center gap-sm md:flex">
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
                <Link href="/login">{t("signIn")}</Link>
              </Button>
            </div>
          )}

          <Button asChild variant="default" size="sm" className="font-medium">
            <Link href="/publish">{t("publish")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-3xs md:ml-sm">
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          {/* Mobile nav — hamburger menu, hidden on md+ */}
          <MobileMenu menuLinks={menuLinks} isLoggedIn={!!user} />
        </div>
      </div>
    </nav>
  );
}