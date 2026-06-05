import type { Metadata } from "next";
import { plexSans, plexMono } from "./fonts";
import "./globals.css";
import { lightTheme, themeToCSSVars } from "@/design-tokens";
import { FeedbackButton } from "@/components/feedback/feedback-button";

const lightThemeCSSVars = themeToCSSVars(lightTheme);

function resolveAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return "http://localhost:3000";
  try {
    return new URL(raw).href;
  } catch {
    // Bare hostname without scheme — add https://
    return `https://${raw}`;
  }
}

const defaultUrl = resolveAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Common Parts Access — Open platform for digital spare parts",
  description:
    "Common Parts Access is an open platform for publishing and accessing digital spare parts, helping extend the life of everyday objects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body style={lightThemeCSSVars}>
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}