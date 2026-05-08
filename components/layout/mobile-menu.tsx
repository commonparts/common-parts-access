"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="flex items-center md:hidden">
      <button
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-md p-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Outside-click overlay */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={close}
          />

          {/* Nav panel — top-full anchors to the bottom of the sticky nav */}
          <div
            id="mobile-nav-panel"
            className="absolute left-0 top-full z-50 w-full border-b border-border-default bg-bg-surface px-md py-sm shadow-sm"
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
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-medium"
                  onClick={close}
                >
                  <Link href="/dashboard">My dashboard</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-medium"
                  onClick={close}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              )}

              <Button
                asChild
                variant="default"
                size="sm"
                className="w-full font-medium"
                onClick={close}
              >
                <Link href="/upload">Publish a Part</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
