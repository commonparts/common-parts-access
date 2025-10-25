import Navbar from "@/components/layout/navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoriesPreview } from "@/components/model/categories-preview";
import { Hero } from "@/components/layout/hero";
import { FeaturedModels } from "@/components/model/featured-models";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        <div className="flex-1 flex flex-col w-full">
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 flex flex-col items-center text-center w-full px-6 gap-10 mt-6">
              <div className="bg-card rounded-2xl shadow-lg border border-border/50 backdrop-blur-sm w-full overflow-hidden">
                <Hero />
              </div>
              
              {/* Featured Models Section */}
              <div className="w-full">
                <FeaturedModels />
              </div>
            </div>
          </main>
        </div>
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-sm gap-8 py-8 bg-background/50 backdrop-blur-sm">
          <p>
            Footer content here. Made with ❤️ by me.
          </p>
        </footer>
      </div>
    </div>
  );
}