"use client";

import { useState } from "react";
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
 * Toggles a dropdown panel containing all primary navigation actions.
 */
export function MobileMenu({ menuLinks, isLoggedIn }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

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
        <div
          id="mobile-nav-panel"
          className="absolute left-0 top-16 z-50 w-full border-b border-border-default bg-bg-surface px-md py-sm shadow-sm"
        >
          <nav className="flex flex-col gap-xs">
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
          </nav>
        </div>
      )}
    </div>
  );
}
