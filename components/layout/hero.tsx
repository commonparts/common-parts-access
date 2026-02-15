"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, Search, ShieldCheck, UploadCloud, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useModelUploadFormState } from "@/hooks/use-model-upload-form-state";
import { Container } from "@/components/layout/container";
import { Grid } from "@/components/layout/grid";
import { DropdownInput } from "@/components/ui/dropdown-input";

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-sm rounded-full border border-border-subtle bg-bg-surface px-sm py-xs text-xs font-semibold tracking-tight text-text-primary shadow-surface">
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

      <Container size="xl" className="relative">
        <Grid columns={12} className="items-center gap-2xl">
          <div className="col-span-12 lg:col-span-6 mx-auto flex w-full max-w-3xl flex-col items-center text-center text-text-primary space-y-lg">
          <div className="space-y-sm w-full max-w-xl">
            <h1 className="text-heading-lg font-heading leading-tight">
              Repair starts with access to the right part.
            </h1>
            <p className="text-body text-text-secondary">
              Common Parts Access is an open platform for publishing and accessing digital spare parts, built to keep everyday objects in use.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-sm text-caption text-text-secondary">
            <Badge>
              <Wrench className="size-md" /> Right-to-repair friendly
            </Badge>
            <Badge>
              <Database className="size-md" /> Structured library
            </Badge>
            <Badge>
              <ShieldCheck className="size-md" /> Open formats only
            </Badge>
          </div>

          <div className="w-full max-w-xl">
            <Card className="relative">
              <UploadCloud className="absolute right-sm top-sm size-md text-text-secondary" />
              <CardHeader className="text-center text-text-primary">
                <p className="text-caption uppercase tracking-wide text-text-secondary">Publish</p>
                <CardTitle className="text-heading-sm font-semibold">Share a repair part</CardTitle>
                <CardDescription className="text-caption">Start a new submission and include the details needed to make the part easy to find and print.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap justify-center gap-sm">
                  <Button asChild>
                    <a href="/upload">Publish a part</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>

          <div className="col-span-12 lg:col-span-6 relative mx-auto grid w-full max-w-xl gap-sm">
          <Card className="relative">
            <Search className="absolute right-sm top-sm size-md text-text-secondary" />
            <CardHeader className="text-center text-text-primary">
              <p className="text-caption uppercase tracking-wide text-text-secondary">Find parts</p>
              <CardTitle className="text-heading-sm font-semibold">Search by product</CardTitle>
              <CardDescription className="text-caption">Use the same brand, category, and product logic as the upload form to zero in on the right fit.</CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
            <form className="space-y-sm" onSubmit={handleSearch}>
              <div className="space-y-xs">
                <Label htmlFor="hero-brand" className="text-text-primary">Brand</Label>
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
                />
              </div>

              <div className="space-y-xs">
                <Label className="text-text-primary">Category</Label>
                <div className="flex flex-col gap-xs">
                  {categoryLevels.map((level, idx) => {
                    const placeholder = idx === 0 ? "Select a category" : "Keep parent category";
                    const value = categoryPath[idx] ?? "";
                    const disabled = loadingMeta || (idx > 0 && !categoryPath[idx - 1]);

                    return (
                      <DropdownInput
                        as="select"
                        key={level.parentId ?? `root-${idx}`}
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
                      </DropdownInput>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-xs">
                <Label htmlFor="hero-product" className="text-text-primary">Product</Label>
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
                />
              </div>

              <div className="flex items-center justify-between gap-sm">
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <div className="flex gap-sm">
                  <Button type="submit" disabled={!formData.productId}>
                    Find parts
                  </Button>
                </div>
              </div>
            </form>
            </CardContent>
          </Card>
          </div>
        </Grid>
      </Container>
    </section>
  );
};
