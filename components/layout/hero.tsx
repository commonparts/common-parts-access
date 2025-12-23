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
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,_rgba(89,199,155,0.16),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(249,115,22,0.16),_transparent_32%),radial-gradient(circle_at_50%_80%,_rgba(59,130,246,0.14),_transparent_42%)] px-lg py-xl sm:px-xl sm:py-2xl">
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.05)_1px,_transparent_1px),linear-gradient(240deg,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[length:40px_40px] opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-screen-xl flex-col gap-xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-2xl">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center text-text-inverse space-y-lg">
          <div className="space-y-sm">
            <h1 className="text-heading-lg font-heading leading-tight">
              Upload fast. Find the exact part faster.
            </h1>
            <p className="text-body text-text-inverse/80">
              PartHarbor connects makers who upload printable fixes with people searching by brand, category, or product. Drop a model or zero in on the device you need to repair.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-sm text-caption text-text-inverse/80">
            <Badge>
              <Anchor className="size-sm" /> Right-to-repair friendly
            </Badge>
            <Badge>
              <Compass className="size-sm" /> Curated by makers
            </Badge>
            <Badge>
              <ShieldCheck className="size-sm" /> Open formats only
            </Badge>
          </div>

          <div className="w-full max-w-xl">
            <div className="relative rounded-lg border border-border-subtle bg-bg-surface/40 p-lg shadow-overlay backdrop-blur">
              <UploadCloud className="absolute right-sm top-sm size-md text-text-inverse/70" />
              <div className="text-center space-y-xs">
                <p className="text-caption uppercase tracking-wide text-text-inverse/60">Upload lane</p>
                <h3 className="text-heading-sm font-semibold text-text-inverse">Shortcut to your model</h3>
                <p className="text-caption text-text-inverse/75">Jump straight into the upload flow and publish a printable fix with metadata that matters.</p>
              </div>
              <div className="mt-md flex flex-wrap justify-center gap-sm">
                <Button asChild className="bg-action-primary text-text-inverse shadow-raised hover:bg-action-primaryHover border-transparent">
                  <a href="/upload">Dock a model</a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-xl gap-sm">
          <div className="relative rounded-lg border border-border-subtle bg-bg-surface/30 p-lg shadow-overlay backdrop-blur">
            <Search className="absolute right-sm top-sm size-md text-text-inverse/70" />
            <div className="text-center space-y-xs">
              <p className="text-caption uppercase tracking-wide text-text-inverse/60">Find parts</p>
              <h3 className="text-heading-sm font-semibold text-text-inverse">Search by product</h3>
              <p className="text-caption text-text-inverse/75">Use the same brand, category, and product logic as the upload form to zero in on the right fit.</p>
            </div>

            <form className="mt-sm space-y-sm" onSubmit={handleSearch}>
              <div className="space-y-xs">
                <Label htmlFor="hero-brand" className="text-text-inverse">Brand</Label>
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
                  inputClassName="text-text-inverse placeholder:text-text-inverse/60 bg-bg-surface/30 border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                />
              </div>

              <div className="space-y-xs">
                <Label className="text-text-inverse">Category</Label>
                <div className="flex flex-col gap-xs">
                  {categoryLevels.map((level, idx) => {
                    const placeholder = idx === 0 ? "Select a category" : "Keep parent category";
                    const value = categoryPath[idx] ?? "";
                    const disabled = loadingMeta || (idx > 0 && !categoryPath[idx - 1]);

                    return (
                      <select
                        key={level.parentId ?? `root-${idx}`}
                        className="flex w-full rounded-lg border border-border-subtle bg-bg-surface/30 px-md py-sm text-sm text-text-inverse shadow-surface outline-none transition-colors focus:border-border-focus focus:ring-2 focus:ring-border-focus/40 disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
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

              <div className="space-y-xs">
                <Label htmlFor="hero-product" className="text-text-inverse">Product</Label>
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
                  inputClassName="text-text-inverse placeholder:text-text-inverse/60 bg-bg-surface/30 border-border-subtle focus-visible:ring-border-focus focus-visible:border-border-focus"
                />
              </div>

              <div className="flex items-center justify-between gap-sm">
                <Button type="button" variant="outline" className="border-border-subtle bg-bg-surface/30 text-text-inverse hover:border-border-default hover:bg-bg-hover/40 hover:text-text-inverse" onClick={resetFilters}>
                  Reset
                </Button>
                <div className="flex gap-sm">
                  <Button type="submit" className="bg-action-primary text-text-inverse shadow-raised hover:bg-action-primaryHover border-transparent" disabled={!formData.productId}>
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
