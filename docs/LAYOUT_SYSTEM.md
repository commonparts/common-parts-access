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
| `container-sm`  | 640px     | Auth, small forms            |
| `container-md`  | 768px     | Content pages                |
| `container-lg`  | 1024px    | Marketplace listings         |
| `container-xl`  | 1280px    | Dashboards / wide surfaces   |

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

Gutters use spacing tokens; default is `gap-md`. Adjust with `className` (e.g., `gap-lg`) when needed.

## Section Wrapper
Use `Section` to normalize vertical rhythm:

```tsx
import { Section } from "@/components/layout/section"

<Section>
  {/* section content */}
</Section>
```

`Section` applies `py-xl` by default; override or extend via `className` sparingly.

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
