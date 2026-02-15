import type { Metadata } from "next";
import { inter, outfit, jetbrainsMono } from "./fonts";
import "./globals.css";
import { lightTheme, themeToCSSVars } from "@/design-tokens";

const lightThemeCSSVars = themeToCSSVars(lightTheme);

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Common Parts Access — Open platform for repair parts",
  description:
    "Common Parts Access is an open platform for publishing and accessing digital spare parts for everyday repairs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body style={lightThemeCSSVars}>{children}</body>
    </html>
  );
}