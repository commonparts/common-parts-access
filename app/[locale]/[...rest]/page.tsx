import { notFound } from "next/navigation";

// Unknown paths under a locale render app/[locale]/not-found.tsx, in the
// visitor's language, instead of the bare root not-found page.
export default function CatchAllPage() {
  notFound();
}
