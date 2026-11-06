import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { CODE_LICENSE, DATA_LICENSE } from "@/lib/utils/licenses";

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
      { label: "Browse parts", href: "/browse" },
      { label: "Publish a part", href: "/publish" },
      { label: "Common Parts", href: "https://commonparts.org" },
      { label: "GitHub", href: "https://github.com/commonparts" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Contribute", href: "/contributing" },
      { label: "Contact", href: "mailto:contact@commonparts.org" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
      { label: "Legal notice", href: "/legal-notice" },
    ],
  },
];

const licenseLinkClassName =
  "rounded-sm underline transition-colors duration-fast hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-subtle";

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
              Infrastructure for digital spare parts. An open, public registry of
              replacement parts.
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
          <p className="max-w-container-sm text-caption italic leading-normal text-text-tertiary">
            Common Parts Access is an official interface of the Common Parts
            Infrastructure.
          </p>
          <div className="flex flex-wrap items-center gap-x-sm gap-y-3xs font-mono text-micro text-text-tertiary">
            <p>© {new Date().getFullYear()} Common Parts</p>
            <p>
              Code under{" "}
              <a href={CODE_LICENSE.url} className={licenseLinkClassName}>
                {CODE_LICENSE.shortName}
              </a>
              . Data under{" "}
              <a href={DATA_LICENSE.url} className={licenseLinkClassName}>
                {DATA_LICENSE.shortName}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}