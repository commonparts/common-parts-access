# Technical Documentation — Index

Internal technical documentation for Common Parts Access. It is the source material for the future public documentation, so each file states facts about the code as it is. **Reference** files describe current behaviour; **historical** and **planning** files are kept for context and say so at the top.

Last reviewed: v1.2.0 (October 2026).

## Platform and process

| File | Type | Covers |
|---|---|---|
| [DEV_STRATEGY.md](./DEV_STRATEGY.md) | Reference | Agent pipeline, branches, CI, Railway environments, release process, labels |
| [DATA_MODEL.md](./DATA_MODEL.md) | Reference | Current database schema, tables, enums and database functions |
| [DATA_MODEL_EVOLUTION.md](./DATA_MODEL_EVOLUTION.md) | Historical | How the schema evolved to support curation |
| [SECURITY_GIT_HISTORY_AUDIT_2026-05-10.md](./SECURITY_GIT_HISTORY_AUDIT_2026-05-10.md) | Historical | Git history secrets audit, May 2026 |

## Product and features

| File | Type | Covers |
|---|---|---|
| [user-flows.md](./user-flows.md) | Planning | July 2026 flow plan (P1–P3), with an implementation status section |
| [PUBLISH_FLOW.md](./PUBLISH_FLOW.md) | Reference | `/publish`: shared entry, vocabulary (original / hosted / referenced), five-step shell |
| [UPLOAD_FLOW.md](./UPLOAD_FLOW.md) | Reference | Original track engine (`/api/upload/**`) |
| [CURATION_TOOL.md](./CURATION_TOOL.md) | Reference | Elsewhere track engine (`/api/curation/**`), checklist, prefill |
| [SEARCH.md](./SEARCH.md) | Reference | Autocomplete, `/search`, reference matching, zero-result logging |
| [BROWSE_NAVIGATION.md](./BROWSE_NAVIGATION.md) | Reference | `/browse`, category and brand pages, availability semantics |
| [PRODUCT_COMPATIBILITY.md](./PRODUCT_COMPATIBILITY.md) | Reference | Product references, regional names, evidence levels, print reports, compatible products on the part page |
| [FILE_DOWNLOADS.md](./FILE_DOWNLOADS.md) | Reference | Anonymous downloads, archive, storage |
| [PART_VIEWS.md](./PART_VIEWS.md) | Reference | Anonymous view counting |
| [PART_LIKES.md](./PART_LIKES.md) | Reference | Likes (hidden behind the social features flag) |
| [SEO.md](./SEO.md) | Reference | Metadata, structured data, sitemap, robots |
| [USER_PROFILE_SETUP.md](./USER_PROFILE_SETUP.md) | Reference | Profile creation trigger at sign-up |
| [ACCOUNT_DELETION_POLICY.md](./ACCOUNT_DELETION_POLICY.md) | Policy | Intended deletion and retention policy, with its implementation status |

## Design and brand

| File | Type | Covers |
|---|---|---|
| [NEW_IDENTITY_COMMON_PARTS_ACCESS.md](./NEW_IDENTITY_COMMON_PARTS_ACCESS.md) | Brief | Positioning, tone, language and brand rules (Feb 2026) |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Reference | Tokens, badges, component expectations |
| [CONTROL_SIZING.md](./CONTROL_SIZING.md) | Reference | Control recipe for inputs, buttons, selects, comboboxes |
| [LAYOUT_SYSTEM.md](./LAYOUT_SYSTEM.md) | Reference | Breakpoints, `Container`, `Grid`, `Section` |
| [HERO_SECTION.md](./HERO_SECTION.md) | Reference | Home page hero and featured parts |

## Elsewhere in the repository

- `README.md`, `CONTRIBUTING.md`: public-facing project and contribution rules
- `CLAUDE.md`: development conventions, loaded by every Claude Code session
- `.claude/skills/release/SKILL.md`: promotion and release procedure
- `.github/workflows/release.yml`: publishes the GitHub Release when `staging` is merged into `main`
- `.github/copilot-instructions.md`: code review rules
- `supabase/migrations/`: each migration opens with a comment explaining what it does and why
