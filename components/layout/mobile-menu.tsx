"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { USER_PROFILE_MENU_ITEMS, UserProfileMenuAction } from "@/components/user/profile-menu-items";
import { signOut } from "@/lib/supabase/queries/auth.client";

interface NavLink {
  label: string;
  href: string;
}

interface MobileMenuProps {
  menuLinks: NavLink[];
  isLoggedIn: boolean;
}

/**
 * Mobile hamburger menu for the navbar.
 * Hidden on md+ breakpoints — the desktop nav handles those sizes.
 * Toggles a full-width dropdown panel containing all primary navigation actions.
 * Dismisses on Escape key press or outside click.
 */
export function MobileMenu({ menuLinks, isLoggedIn }: MobileMenuProps) {
  const t = useTranslations("Navbar");
  const userMenu = useTranslations("UserMenu");
  const [isOpen, setIsOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const router = useRouter();

  const close = () => {
    setIsOpen(false);
    setSignOutError(null);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      setSignOutError(userMenu("signOutFailed"));
      return;
    }
    close();
    router.push("/logout-success");
  };

  const handleDeleteAccount = () => {
    setIsOpen(false);
    router.push("/delete-account");
  };

  const handleUserMenuAction = async (action: UserProfileMenuAction) => {
    if (action === "deleteAccount") {
      handleDeleteAccount();
      return;
    }
    await handleSignOut();
  };

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="flex items-center md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? t("closeMenu") : t("openMenu")}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        onClick={() => {
          setSignOutError(null);
          setIsOpen((prev) => !prev);
        }}
      >
        {isOpen ? (
          <X aria-hidden="true" />
        ) : (
          <Menu aria-hidden="true" />
        )}
      </Button>

      {isOpen && (
        <>
          {/* Outside-click overlay */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={close}
          />

          {/* Nav panel — fixed below the navbar (h-16 = 4rem) so positioning is
               always relative to the viewport, not an ancestor's layout box. */}
          <div
            id="mobile-nav-panel"
            className="fixed left-0 top-16 z-50 max-h-[calc(100dvh-4rem)] w-full overflow-y-auto border-b border-border-default bg-bg-surface px-md py-sm shadow-xs"
          >
            <div className="flex flex-col gap-xs">
              {menuLinks.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-medium"
                  onClick={close}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}

              <div className="my-xs border-t border-border-subtle" />

              {isLoggedIn ? (
                <>
                  {USER_PROFILE_MENU_ITEMS.map((item) => {
                    if (item.type === "separator") {
                      return (
                        <div
                          key={item.key}
                          className="my-xs border-t border-border-subtle"
                        />
                      );
                    }

                    const Icon = item.icon;
                    if (item.type === "link") {
                      return (
                        <Button
                          key={item.key}
                          asChild
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start font-medium"
                          onClick={close}
                        >
                          <Link href={item.href} className="flex w-full items-center gap-md">
                            <Icon className="h-4 w-4" />
                            <span>{userMenu(item.label)}</span>
                          </Link>
                        </Button>
                      );
                    }

                    return (
                      <Button
                        key={item.key}
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start font-medium ${item.destructive ? "text-status-errorText hover:text-status-errorText" : ""}`}
                        onClick={() => {
                          void handleUserMenuAction(item.action);
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{userMenu(item.label)}</span>
                      </Button>
                    );
                  })}

                  {signOutError && (
                    <Alert>{signOutError}</Alert>
                  )}
                </>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-medium"
                  onClick={close}
                >
                  <Link href="/login">{t("signIn")}</Link>
                </Button>
              )}

              {!isLoggedIn && (
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="w-full font-medium"
                  onClick={close}
                >
                  <Link href="/publish">{t("publish")}</Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
