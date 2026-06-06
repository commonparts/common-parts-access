import type { Metadata } from "next";
import { plexSans, plexMono } from "./fonts";
import "./globals.css";
import { lightTheme, themeToCSSVars } from "@/design-tokens";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { APP_URL } from "@/lib/utils/constants";

const lightThemeCSSVars = themeToCSSVars(lightTheme);

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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