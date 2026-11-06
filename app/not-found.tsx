"use client";

import NextError from "next/error";

// Unmatched requests outside the localized pages (an unknown /api/... path,
// a missing file) never reach app/[locale]/layout.tsx, so this page renders
// its own document.
export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <NextError statusCode={404} />
      </body>
    </html>
  );
}
