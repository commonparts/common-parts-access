import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/layout/hero";
import { FeaturedParts } from "@/components/part/featured-parts";

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