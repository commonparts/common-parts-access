import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function CategoriesPreview() {
  const supabase = await createClient();
  
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .limit(4);

  if (!categories) return null;

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold">Browse by Category</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {categories.map((category) => (
          <Card key={category.id} className="p-6 flex flex-col items-center gap-4 cursor-default">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image 
                src={category.icon} 
                alt={category.name}
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h3 className="text-lg font-medium">{category.name}</h3>
          </Card>
        ))}
      </div>
      <Button asChild variant="outline">
        <Link href="/browse/categories">
          See all categories
        </Link>
      </Button>
    </div>
  );
}
