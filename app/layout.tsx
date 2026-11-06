// The document root (<html>, fonts, global styles, metadata) is
// app/[locale]/layout.tsx. This layout only exists because app/not-found.tsx
// needs one; it renders its own document.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
