"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Anchor, Compass, MapPin, Printer, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useModelUploadFormState } from "@/hooks/use-model-upload-form-state";

// ---- Wordmark as a React component ----
export const PartHarborWordmark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width={props.width || 220}
      height={props.height || 36}
      viewBox="0 0 880 144"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PartHarbor wordmark"
      {...props}
    >
      <g transform="translate(8,10)">
        <rect x="0" y="24" width="24" height="80" rx="6" className="fill-foreground" />
        <rect x="28" y="0" width="24" height="104" rx="6" className="fill-foreground" />
        <circle cx="40" cy="-2" r="6" className="fill-primary" />
        <rect x="58" y="62" width="16" height="16" rx="2" className="fill-primary" />
      </g>
      <text
        x="100"
        y="96"
        className="font-heading fill-foreground"
        fontSize="84"
        fontWeight="700"
        letterSpacing="0.5"
      >
        PartHarbor
      </text>
    </svg>
  );
};

// ---- Minimal mark-only SVG (for favicons, badges) ----
export const HarborMark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width={props.width || 40}
      height={props.height || 40}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PartHarbor mark"
      {...props}
    >
      <rect x="8" y="20" width="12" height="36" rx="4" className="fill-foreground" />
      <rect x="24" y="8" width="12" height="48" rx="4" className="fill-foreground" />
      <circle cx="30" cy="6" r="4" className="fill-primary" />
      <rect x="42" y="34" width="10" height="10" rx="2" className="fill-primary" />
    </svg>
  );
};

// ---- Feature Card ----
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, desc }) => (
  <li className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur shadow-lg shadow-foreground/10 transition-transform hover:-translate-y-0.5 hover:shadow-xl">
    <div className="flex items-start gap-3">
      <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 shadow-inner">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold font-body text-white">{title}</h3>
        <p className="mt-1 text-xs text-white/80 leading-relaxed">{desc}</p>
      </div>
    </div>
  </li>
);

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-tight text-white/90 ring-1 ring-white/15">
    {children}
  </span>
);

// ---- HERO SECTION ----
export const Hero: React.FC = () => {
  const router = useRouter();

  const {
    formData,
    setFormData,
    categoryLevels,
    categoryPath,
    handleCategorySelect,
    brands,
    brandSearch,
    setBrandSearch,
    brandOpen,
    setBrandOpen,
    products,
    productSearch,
    setProductSearch,
    productOpen,
    setProductOpen,
    loadingProducts,
    loadingMeta,
    setCategoryPathFromCategoryId,
  } = useModelUploadFormState();

  const selectedBrandName = React.useMemo(
    () => brands.find((b) => b.id === formData.brandId)?.name ?? "",
    [brands, formData.brandId]
  );

  const selectedProductName = React.useMemo(() => {
    const match = products.find((p) => p.id === formData.productId);
    if (!match) return "";
    return match.model_number ? `${match.name} (${match.model_number})` : match.name;
  }, [products, formData.productId]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.productId) return;

    const params = new URLSearchParams();
    params.set("productId", formData.productId);

    const href = `/browse?${params.toString()}`;
    router.push(href);
  };

  const resetFilters = () => {
    handleCategorySelect(0, "");
    setFormData((prev) => ({ ...prev, brandId: "", productId: "", categoryId: "" }));
    setBrandSearch("");
    setProductSearch("");
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c182f] via-[#0a1224] to-[#050915] px-6 py-12 sm:px-8 sm:py-16">
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(125, 255, 196, 0.2), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255, 168, 76, 0.18), transparent 30%), radial-gradient(circle at 50% 80%, rgba(80, 163, 255, 0.15), transparent 40%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.05)_1px,_transparent_1px),linear-gradient(240deg,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[length:40px_40px] opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-14 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="space-y-8 text-white w-full max-w-3xl mx-auto flex flex-col items-center text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-heading font-black leading-tight sm:text-4xl md:text-5xl">
              Upload fast. Find the exact part faster.
            </h1>
            <p className="max-w-3xl text-base text-white/85 sm:text-lg">
              PartHarbor connects makers who upload printable fixes with people searching by brand, category, or product. Drop a model or zero in on the device you need to repair.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
            <Badge>
              <Anchor className="h-4 w-4" /> Right-to-repair friendly
            </Badge>
            <Badge>
              <Compass className="h-4 w-4" /> Curated by makers
            </Badge>
            <Badge>
              <ShieldCheck className="h-4 w-4" /> Open formats only
            </Badge>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-foreground/10 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60">Upload lane</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Shortcut to your model</h3>
                  <p className="mt-2 text-sm text-white/75">Jump straight into the upload flow and publish a printable fix with metadata that matters.</p>
                </div>
                <UploadCloud className="h-5 w-5 text-white/70" />
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <Button asChild size="lg" className="bg-[#ff8a3d] text-foreground shadow-md shadow-orange-500/20 hover:bg-[#ff9d5c] border-transparent">
                  <a href="/upload">Dock a model</a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 w-full max-w-xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">Find parts</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Search by product</h3>
                <p className="mt-2 text-sm text-white/75">Use the same brand, category, and product logic as the upload form to zero in on the right fit.</p>
              </div>
              <Search className="h-5 w-5 text-white/70" />
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSearch}>
              <div className="space-y-2">
                <Label htmlFor="hero-brand" className="text-white">Brand</Label>
                <Combobox
                  id="hero-brand"
                  placeholder={loadingMeta ? "Loading brands..." : "Search or select a brand"}
                  options={brands.map((b) => ({ id: b.id, name: b.name }))}
                  value={formData.brandId}
                  searchTerm={brandSearch}
                  onSearchChange={setBrandSearch}
                  onSelect={(option) => {
                    setFormData((prev) => ({ ...prev, brandId: option.id, productId: "" }));
                    setBrandSearch(option.name);
                  }}
                  isOpen={brandOpen}
                  onOpenChange={setBrandOpen}
                  disabled={loadingMeta}
                  emptyMessage={brandSearch ? "No matching brands" : "No brands found"}
                  inputClassName="text-white placeholder:text-white/60 bg-white/5 border-white/20 focus-visible:ring-white/60 focus-visible:border-white/60"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Category</Label>
                <div className="flex flex-col gap-2">
                  {categoryLevels.map((level, idx) => {
                    const placeholder = idx === 0 ? "Select a category" : "Keep parent category";
                    const value = categoryPath[idx] ?? "";
                    const disabled = loadingMeta || (idx > 0 && !categoryPath[idx - 1]);

                    return (
                      <select
                        key={level.parentId ?? `root-${idx}`}
                        className="flex h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white shadow-sm outline-none transition-colors focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/30 disabled:cursor-not-allowed"
                        value={value}
                        onChange={(e) => handleCategorySelect(idx, e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">{loadingMeta ? "Loading categories..." : placeholder}</option>
                        {level.options.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-product" className="text-white">Product</Label>
                <Combobox
                  id="hero-product"
                  placeholder={
                    loadingProducts
                      ? "Loading products..."
                      : !formData.brandId && !formData.categoryId
                        ? "Select brand/category to filter products"
                        : "Search or select a product"
                  }
                  options={products.map((p) => ({
                    id: p.id,
                    name: p.model_number ? `${p.name} (${p.model_number})` : p.name,
                    categoryId: p.category_id ?? "",
                  }))}
                  value={formData.productId}
                  searchTerm={productSearch}
                  onSearchChange={setProductSearch}
                  onSelect={(option) => {
                    setFormData((prev) => ({ ...prev, productId: option.id }));
                    setProductSearch(option.name);
                    setCategoryPathFromCategoryId((option as { categoryId?: string }).categoryId);
                  }}
                  allowCreate={false}
                  isOpen={productOpen}
                  onOpenChange={setProductOpen}
                  disabled={loadingProducts || (!formData.brandId && !formData.categoryId)}
                  emptyMessage={productSearch ? "No matching products" : "No products found"}
                  inputClassName="text-white placeholder:text-white/60 bg-white/5 border-white/20 focus-visible:ring-white/60 focus-visible:border-white/60"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button type="button" size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white" onClick={resetFilters}>
                  Reset
                </Button>
                <div className="flex gap-2">
                  <Button type="submit" size="lg" className="bg-[#ff8a3d] text-foreground shadow-md shadow-orange-500/20 hover:bg-[#ff9d5c] border-transparent" disabled={!formData.productId}>
                    Find parts
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
