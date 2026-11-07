import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { plexSans, plexMono } from "../fonts";
import "../globals.css";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { routing } from "@/i18n/routing";
import { APP_URL } from "@/lib/utils/constants";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    metadataBase: new URL(APP_URL),
    title: t("title"),
    description: t("description"),
  };
}

// The document root lives under [locale] so that switching language, which
// changes this segment, renders <html lang> and the client messages again.
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <NextIntlClientProvider>
          {children}
          <FeedbackButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
