import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Browse Parts", href: "/browse" },
      { label: "Publish a Part", href: "/upload" },
      { label: "Registry", href: "" },
      { label: "API", href: "" },
    ],
  },
  {
    title: "Institution",
    links: [
      { label: "About Common Parts", href: "" },
      { label: "Governance", href: "" },
      { label: "CPSP Protocol", href: "" },
      { label: "Certification", href: "" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "" },
      { label: "Contact", href: "" },
      { label: "Press", href: "" },
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
          <div className="col-span-2 md:col-span-1">
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
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-body text-text-secondary transition-colors duration-fast hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
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
            © {new Date().getFullYear()} Common Parts Foundation
          </p>
        </div>
      </div>
    </footer>
  );
}