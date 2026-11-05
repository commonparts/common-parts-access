import localFont from "next/font/local";

// The font files are committed under assets/fonts/ibm-plex so that the build
// never downloads fonts: a build host that cannot reach Google Fonts would
// otherwise fail the build (#486). Latin subset, the one preloaded before.
// Every style reaches the fonts through the --font-body and --font-mono
// variables set on <html> (app/layout.tsx), which name the families
// next/font generates.
export const plexSans = localFont({
  src: [
    { path: "../assets/fonts/ibm-plex/ibm-plex-sans-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/ibm-plex/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/ibm-plex/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/ibm-plex/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const plexMono = localFont({
  src: [
    { path: "../assets/fonts/ibm-plex/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/ibm-plex/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});
