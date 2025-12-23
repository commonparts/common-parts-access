# PartHarbor Design System Notes

Use this as a quick-reference for building or updating UI. It captures the current tokens, sizing, and component expectations so new work stays consistent.

## Foundations
- **Typography**: Use the configured font tokens (`font-body`, `font-heading`, `font-mono`). Default body text at `text-sm`; headings leverage the predefined `text-heading-*` scales. Keep tracking/weight consistent with existing sections (e.g., hero and cards).
- **Color tokens**: Prefer semantic classes (e.g., `bg-bg-surface`, `bg-bg-subtle`, `text-text-primary`, `text-text-secondary`, `border-border-subtle`, `border-border-focus`, action colors `bg-action-primary`, `hover:bg-action-primaryHover`). Do not hard-code hex values.
- **Spacing scale**: Rely on tokenized spacing utilities: `px-md py-sm` for controls, `gap-sm`/`space-y-sm` for small stacks, `gap-md`/`space-y-md` for medium groupings, `p-lg`/`p-xl` for larger containers. Avoid raw numbers.
- **Radii**: Default radius is `rounded-lg` for controls and cards. Only increase radius when a specific pattern (e.g., pills) calls for it.
- **Shadows**: Use semantic shadows: `shadow-surface` for inputs/cards, `shadow-overlay` for popovers/dropdowns, `shadow-raised` for primary CTAs. Avoid ad-hoc shadow definitions.
- **Focus**: Use the shared focus recipe: `focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface` and `focus-visible:border-border-focus`.
- **States**: Disabled elements should reflect `disabled:bg-bg-disabled disabled:text-text-disabled disabled:border-border-subtle disabled:cursor-not-allowed`. Hover states use semantic `hover:bg-bg-hover` or component-specific action hovers.

## Controls (single source of truth)
Refer to [CONTROL_SIZING.md](./CONTROL_SIZING.md) for the detailed control recipe. Highlights:
- **Standard control size**: `px-md py-sm`, `text-sm`, `rounded-lg` across buttons, inputs, selects, combobox rows, and navbar/hero actions.
- **Buttons**: Use default size unless explicitly using the `icon` variant. Keep contextual colors only (e.g., action primary in hero, outline in filters). Avoid `size="sm"`/`"lg"` for general layout consistency.
- **Inputs/Textareas**: Inputs follow the standard control recipe. Textareas mirror input styling; adjust only vertical padding/rows if needed.
- **Selects**: Plain `<select>` elements should match input styling (`px-md py-sm text-sm rounded-lg border-border-subtle bg-bg-surface`).
- **Combobox**: Input inherits Input styling; dropdown rows (options/empty/create) use `px-md py-sm text-sm` with `shadow-overlay` surface.
- **File uploader**: Surface uses `p-lg`, `rounded-lg`, `border-dashed border-border-subtle`, `bg-bg-surface`, `shadow-surface`. Drag-over uses action tint; disabled reduces opacity and blocks pointer events.

## Layout & Components
- **Cards**: Use the shared `Card` primitives; default padding and `rounded-lg` with `shadow-surface`. Respect existing spacing patterns (`space-y-*` inside content).
- **Navbar**: Buttons (auth/upload/logout) use default size; maintain `gap-sm` for the cluster. Preserve backdrop blur and `border-border-subtle`.
- **Hero**: Buttons now use default size; inputs/selects/comboboxes use the standard control recipe to align with the upload form.
- **Search bar**: Input + button share control height; button is default size with `rounded-l-none` when attached to the input.
- **Stacks and gaps**: Use `gap-sm` for tight clusters (icons with labels, inline button groups) and `gap-md` for primary layout sections. For vertical rhythm in forms, prefer `space-y-sm` or `space-y-md`.

## Do/Don’t Checklist
- Do use semantic tokens for color, spacing, radius, shadows—avoid ad-hoc values.
- Do keep controls at the standard size unless there is a clear pattern (e.g., icon-only buttons).
- Do reuse focus styles and disabled states.
- Don’t introduce new spacing/radius scales without aligning to tokens.
- Don’t mix server/client Supabase imports in UI components.

## Useful References
- Control sizing recipe: [CONTROL_SIZING.md](./CONTROL_SIZING.md)
- Tokens: see `design-tokens/` sources and Tailwind semantic classes used throughout components.
- Patterns: navbar, hero, search-bar, and model upload form demonstrate current canonical control usage.
