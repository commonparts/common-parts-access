import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/layout/hero";
import { FeaturedParts } from "@/components/part/featured-parts";
import { localizedPageMetadata } from "@/lib/utils/seo";

export async function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/", await getLocale());
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeaturedParts />
      </main>
      <Footer />
    </div>
  );
}