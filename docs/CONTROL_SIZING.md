# Control Sizing Guidelines

Use this reference when adding or updating interactive controls so they stay visually aligned across forms, hero, navbar, and search. Radii are intentionally modest (6px `rounded-lg` token) to keep surfaces squared-off.

## Default Control Recipe
- Container: `flex w-full rounded-lg border border-border-subtle bg-bg-surface` (or contextual surface tint) + `text-sm text-text-primary shadow-surface transition-colors`
- Padding: **`px-md py-sm`** for inputs, select tags, combobox rows, buttons (default size)
- Radius: `rounded-lg` (6px token)
- Gaps: `gap-sm` when aligning icons/labels inside controls; `space-y-sm` for stacked form groups
- Focus: `focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface` and `focus-visible:border-border-focus`

## Buttons
- Default size only (no `size="sm"`/`"lg"`) for navbar, hero, search bar, and forms to keep heights consistent.
- Icon-only buttons: use the existing `icon` size variant if needed; otherwise keep default.

## Inputs & Textareas
- Inputs use the default recipe above (`px-md py-sm`).
- Textareas: mirror input styling; adjust only `rows` or vertical padding if needed.

## Combobox
- Input field: inherits Input styles.
- Dropdown rows (options, empty state, create row): `px-md py-sm text-sm`.
- Dropdown surface: `rounded-lg border border-border-subtle bg-bg-surface shadow-overlay` with `mt-sm`.

## Select Elements (plain `<select>`)
- Match inputs: `rounded-lg border border-border-subtle px-md py-sm text-sm shadow-surface transition-colors`.

## File Uploader
- Surface: `rounded-lg border border-dashed border-border-subtle bg-bg-surface p-lg text-center shadow-surface transition-colors`.
- States: drag-over uses action tint; disabled should reduce opacity and block pointer events.

## Navbar & Hero
- Navbar auth/upload/logout buttons: default button size.
- Hero buttons (upload CTA, Reset/Find parts): default button size; keep contextual colors only.

## Quick Checklist for New Controls
- [ ] Use `px-md py-sm` and `rounded-lg` for touch targets.
- [ ] Keep text at `text-sm` unless a larger heading is intended.
- [ ] Apply `gap-sm` for inline icon/label spacing.
- [ ] Use default button size unless an icon-only or compact chip is needed.
- [ ] Ensure focus ring matches inputs/buttons (`ring-border-focus`).

## Examples
- Input: `className="flex w-full rounded-lg border border-border-subtle bg-bg-surface px-md py-sm text-sm ... focus-visible:ring-2 focus-visible:ring-border-focus ..."`
- Button: `<Button className="bg-action-primary text-text-inverse shadow-raised hover:bg-action-primaryHover border-transparent">Label</Button>`
- Combobox option row: `className="w-full cursor-pointer border-b border-border-subtle px-md py-sm text-left text-sm ..."`
- Select: `className="flex w-full rounded-lg border border-border-subtle bg-bg-surface px-md py-sm text-sm ..."`
