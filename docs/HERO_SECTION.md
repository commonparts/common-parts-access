# Hero Section (Home)

## Layout
- Two-column grid: left intro/upload lane, right product search card; stacks on small screens.
- Background gradient and grid lines live on the section; rounding handled by the parent card around the hero.
- Icons (UploadCloud, Search) are absolutely positioned at the top-right of their cards with matching offsets.

## Upload Lane
- CTA: "Dock a model" links to `/upload` via the shared Button component.
- Purely navigational; no form state. Uses the `use client` hero wrapper.

## Search Card
- Uses `useModelUploadFormState` to share brand/category/product state with the upload flow.
- Brand combobox filters products; selecting a product can backfill category path via `setCategoryPathFromCategoryId`.
- Product selection is required to enable the "Find parts" submit button; submit pushes to `/browse?productId={id}`.
- Reset clears brand/product/category selections and search terms, resetting dependent combobox state.

## Styling Notes
- Combobox inputs use dark-friendly classes via `inputClassName` for contrast on the gradient background.
- Buttons use the orange primary styles and rounded-lg from the shared Button component.
- Spacing and alignment are centered within each card to keep the upload and search lanes visually balanced.

## Key Files
- Hero component: `components/layout/hero.tsx`
- Shared form state: `hooks/use-model-upload-form-state.ts`
- Combobox UI: `components/ui/combobox.tsx`
- Button UI: `components/ui/button.tsx`
