# Hero Section (Home)

The home page (`app/page.tsx`) is `Navbar` → `Hero` → `FeaturedParts` → `Footer`. Since issue #308 the hero is a single centred column built around the global search bar; the earlier two-lane layout (publish lane + product-picker search card) was removed.

## Layout
- `Section` → `Container size="xl"` → `Grid columns={12}`, with one centred column capped at `max-w-xl`.
- Headline: "Repair starts with access to the right part." (`text-heading-lg`).
- Subheading: the canonical one-line definition of Common Parts Access (`text-body text-text-secondary`).
- Below the copy: `SearchBar` with the placeholder "Search a brand, product or reference...".

## Search bar
- `components/layout/search-bar.tsx`, in its default grouped-autocomplete mode.
- From 2 characters (`SEARCH_MIN_QUERY_LENGTH` in `hooks/use-search-autocomplete.ts`), it queries `GET /api/search` and shows grouped suggestions (products, parts, brands) with a "see all results" footer.
- Keyboard navigation follows the `aria-activedescendant` combobox pattern: DOM focus stays on the input, options are not tab stops.
- Submitting goes to `/search?q=…`; choosing a suggestion goes straight to its page. Search behaviour is described in [SEARCH.md](./SEARCH.md).

## Featured parts
- `components/part/featured-parts.tsx` fetches `GET /api/parts/featured`, which returns the 8 most recently added published parts (`fetchFeaturedPartCards(8)`), rendered as part cards under the heading "Recently added parts" (#373).

## Not in the hero
- The "Publish a part" call to action lives in the navbar, mobile menu, footer and profile menu (all targeting `/publish`), not in the hero.

## Key files
- Hero component: `components/layout/hero.tsx`
- Search bar: `components/layout/search-bar.tsx`, `hooks/use-search-autocomplete.ts`
- Featured parts: `components/part/featured-parts.tsx`, `app/api/parts/featured/route.ts`
