import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { CODE_LICENSE, DATA_LICENSE } from "@/lib/utils/licenses";

type FooterLinkKey =
  | "browse"
  | "publish"
  | "commonParts"
  | "github"
  | "contribute"
  | "support"
  | "contact"
  | "privacy"
  | "terms"
  | "legalNotice"

interface FooterColumn {
  title: "platform" | "resources"
  links: { key: FooterLinkKey; href: string }[]
}

const footerColumns: FooterColumn[] = [
  {
    title: "platform",
    links: [
      { key: "browse", href: "/browse" },
      { key: "publish", href: "/publish" },
      { key: "commonParts", href: "https://commonparts.org" },
      { key: "github", href: "https://github.com/commonparts" },
    ],
  },
  {
    title: "resources",
    links: [
      { key: "contribute", href: "/contributing" },
      { key: "support", href: "/support" },
      { key: "contact", href: "mailto:contact@commonparts.org" },
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
      { key: "legalNotice", href: "/legal-notice" },
    ],
  },
];

const footerLinkClassName =
  "rounded-sm underline transition-colors duration-fast hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-subtle";

export function Footer() {
  const t = useTranslations("Footer");
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
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div className="mb-sm text-micro font-medium uppercase tracking-caps text-text-tertiary">
                {t(col.title)}
              </div>
              <div className="flex flex-col gap-2xs">
                {col.links.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="text-body text-text-secondary transition-colors duration-fast hover:text-text-primary"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-sm border-t border-border-default pt-md md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-sm gap-y-3xs font-mono text-micro text-text-tertiary">
            <p>{t("copyright", { year: new Date().getFullYear() })}</p>
            <p>
              {t.rich("licenses", {
                codeLicense: CODE_LICENSE.shortName,
                dataLicense: DATA_LICENSE.shortName,
                code: (chunks) => (
                  <a href={CODE_LICENSE.url} className={footerLinkClassName}>
                    {chunks}
                  </a>
                ),
                data: (chunks) => (
                  <a href={DATA_LICENSE.url} className={footerLinkClassName}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <p className="basis-full">
              {t.rich("ords", {
                standard: (chunks) => (
                  <a href="https://standard.openrepair.org/" className={footerLinkClassName}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
