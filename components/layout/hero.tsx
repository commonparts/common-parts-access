"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useModelUploadFormState } from "@/hooks/use-model-upload-form-state";
import { Container } from "@/components/layout/container";
import { Grid } from "@/components/layout/grid";
import { DropdownInput } from "@/components/ui/dropdown-input";
import { Section } from '@/components/layout/section';

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
    const selectedProductId = formData.productIds[0];
    if (!selectedProductId) return;

    const params = new URLSearchParams();
    params.set("productId", selectedProductId);

    const href = `/browse?${params.toString()}`;
    router.push(href);
  };

  const resetFilters = () => {
    handleCategorySelect(0, "");
    setFormData((prev) => ({ ...prev, brandId: "", productIds: [], categoryId: "" }));
    setBrandSearch("");
    setProductSearch("");
  };

  return (
    <Section>
      <Container size="xl">
        <Grid columns={12} className="items-center gap-2xl">
          <div className="col-span-12 mx-auto flex w-full max-w-xl flex-col space-y-lg lg:col-span-6">
            <div className="space-y-sm">
              <h1 className="text-heading-lg font-heading leading-tight">
                Repair starts with access to the right part.
              </h1>
              <p className="text-body text-text-secondary">
                Common Parts Access is an open platform for publishing and accessing digital spare
                parts, built to keep everyday objects in use.
              </p>
            </div>

            <div>
              <Card>
                <CardHeader className="text-center">
                  <p className="text-caption uppercase tracking-wide text-text-secondary">Publish</p>
                  <CardTitle className="text-heading-sm font-semibold">Share a repair part</CardTitle>
                  <CardDescription className="text-caption">
                    Start a new submission and include the details needed to make the part easy to
                    find and print.
                  </CardDescription>
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

          <div className="col-span-12 mx-auto w-full max-w-xl lg:col-span-6">
            <Card>
              <CardHeader className="text-center">
                <p className="text-caption uppercase tracking-wide text-text-secondary">Find parts</p>
                <CardTitle className="text-heading-sm font-semibold">Search by product</CardTitle>
                <CardDescription className="text-caption">
                  Filter by brand, category, and product to quickly find the part that fits.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <form className="space-y-sm" onSubmit={handleSearch}>
                  <div className="space-y-xs">
                    <Label htmlFor="hero-brand">Brand</Label>
                    <Combobox
                      id="hero-brand"
                      placeholder={loadingMeta ? "Loading brands..." : "Search or select a brand"}
                      options={brands.map((b) => ({ id: b.id, name: b.name }))}
                      searchTerm={brandSearch}
                      onSearchChange={setBrandSearch}
                      onSelect={(option) => {
                        setFormData((prev) => ({ ...prev, brandId: option.id, productIds: [] }));
                        setBrandSearch(option.name);
                        setProductSearch("");
                      }}
                      isOpen={brandOpen}
                      onOpenChange={setBrandOpen}
                      disabled={loadingMeta}
                      emptyMessage={brandSearch ? "No matching brands" : "No brands found"}
                    />
                  </div>

                  <div className="space-y-xs">
                    <Label>Category</Label>
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
                    <Label htmlFor="hero-product">Product</Label>
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
                      searchTerm={productSearch}
                      onSearchChange={setProductSearch}
                      onSelect={(option) => {
                        setFormData((prev) => ({ ...prev, productIds: [option.id] }));
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
                    <Button type="submit" disabled={formData.productIds.length === 0}>
                      Find parts
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </Grid>
      </Container>
    </Section>
  );
};
