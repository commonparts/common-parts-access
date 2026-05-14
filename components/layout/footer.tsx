import Link from "next/link";
import { Logo } from "@/components/layout/logo";

interface FooterLink {
  label: string
  href: string | null
}

interface FooterColumn {
  title: string
  links: FooterLink[]
}

const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Browse Parts", href: "/browse" },
      { label: "Publish a Part", href: "/upload" },
      { label: "Common Parts", href: "https://commonparts.org" },
      { label: "GitHub", href: "https://github.com/commonparts" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Contact", href: "mailto:contact@commonparts.org" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Legal Notice", href: "/legal-notice" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-subtle px-md py-xl">
      <div className="mx-auto max-w-container-lg">
        {/* Columns */}
        <div className="mb-xl grid grid-cols-2 gap-xl md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2">
            <div className="mb-xs">
              <Logo showInterface={false} />
            </div>
            <p className="max-w-[280px] text-caption leading-normal text-text-secondary">
              Infrastructure for digital spare parts. Standards, protocols, and
              the public registry.
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div className="mb-sm text-micro font-medium uppercase tracking-caps text-text-tertiary">
                {col.title}
              </div>
              <div className="flex flex-col gap-2xs">
                {col.links.map((link) =>
                  link.href ? (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-body text-text-secondary transition-colors duration-fast hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <span
                      key={link.label}
                      className="text-body text-text-disabled cursor-default"
                    >
                      {link.label}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-sm border-t border-border-default pt-md md:flex-row md:items-center">
          <p className="max-w-[480px] text-caption italic leading-normal text-text-tertiary">
            Common Parts Access is an official interface of the Common Parts
            Infrastructure.
          </p>
          <p className="font-mono text-micro text-text-tertiary">
            © {new Date().getFullYear()} Common Parts
          </p>
        </div>
      </div>
    </footer>
  );
}