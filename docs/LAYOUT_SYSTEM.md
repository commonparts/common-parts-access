# Layout System

Layout is not spacing, and spacing is not layout. Standardize breakpoints, containers, grids, gutters, and vertical rhythm so pages share the same structure.

## Breakpoints
Use Tailwind defaults (familiar and intent-based):

- `sm` 640px
- `md` 768px
- `lg` 1024px
- `xl` 1280px
- `2xl` 1536px

## Container Tokens
Container widths are defined in `tailwind.config.ts` via `max-w-container-sm/md/lg/xl`:

| Token           | Max width | Recommended use              |
| --------------- | --------- | ---------------------------- |
| `container-sm`  | 480px     | Auth, small forms            |
| `container-md`  | 680px     | Content pages                |
| `container-lg`  | 1100px    | Listings (default size)      |
| `container-xl`  | 1200px    | Dashboards / wide surfaces   |

`Container` defaults to `lg` and adds `mx-auto w-full px-md`.

Use the `Container` component instead of ad-hoc `max-w-*`:

```tsx
import { Container } from "@/components/layout/container"

<Container size="lg">
  {/* content */}
</Container>
```

## Grid Helper
Grids are constrained to approved column counts via `Grid`:

```tsx
import { Grid } from "@/components/layout/grid"

<Grid columns={12}>
  <div className="col-span-12 md:col-span-8 lg:col-span-9" />
  <div className="col-span-12 md:col-span-4 lg:col-span-3" />
</Grid>
```

Allowed column sets: `12`, `6`, `4`. Use responsive `col-span-*` only within grid contexts; avoid raw `grid-cols-*` elsewhere.

A raw grid that sets its columns only from a breakpoint (`sm:grid-cols-2`) also sets `grid-cols-1` below it (`grid grid-cols-1 gap-sm sm:grid-cols-2`). Without a column template, the grid has one implicit `auto` column that grows to its widest content, so a long name or a `truncate` line makes the page wider than the screen (#399).

Gutters use spacing tokens; default is `gap-lg`. Adjust with `className` (e.g., `gap-md`) when needed.

Below `sm`, `Grid` always narrows the column gap to `sm` (`max-sm:gap-x-sm`), including when a `gap-*` class is passed; the row gap is unchanged. The eleven column gaps of a 12-column grid otherwise set a minimum width (352px with `gap-lg`) wider than small phones, even when every child spans the full row (#393). Every current `Grid` child spans the full row below `sm`, so the narrower column gap is not visible there.

## Section Wrapper
Use `Section` to normalize vertical rhythm:

```tsx
import { Section } from "@/components/layout/section"

<Section>
  {/* section content */}
</Section>
```

`Section` applies `py-2xl` by default; override or extend via `className` sparingly.

## Approved Page Patterns
Use the shared scaffold: `<Navbar />` → `<main className="flex-1">` with `Section` + `Container` + `Grid` as needed → `<Footer />`.

- Listing page
  ```tsx
  <Section>
    <Container size="xl">
      <Grid>
        <aside className="col-span-12 lg:col-span-3" />
        <section className="col-span-12 lg:col-span-9" />
      </Grid>
    </Container>
  </Section>
  ```

- Product page
  ```tsx
  <Section>
    <Container size="lg">
      <Grid>
        <div className="col-span-12 md:col-span-6" />
        <div className="col-span-12 md:col-span-6" />
      </Grid>
    </Container>
  </Section>
  ```

- Dashboard shell
  ```tsx
  <Section>
    <Container size="xl">
      <Grid>
        <nav className="col-span-12 lg:col-span-2" />
        <main className="col-span-12 lg:col-span-10" />
      </Grid>
    </Container>
  </Section>
  ```

## Discipline and Checks
- Avoid inventing new `max-w-*` or `grid-cols-*`; route through `Container` and `Grid`.
- Keep gutters on the spacing scale.
- Wrap distinct vertical blocks in `Section` to keep rhythm consistent.
- Consider linting to ban stray `grid-cols-*` outside layout helpers if drift appears.
