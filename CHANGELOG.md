# v1.1.0 — 2026-05-14

```markdown
## Common Parts Access v1.1.0 Release Notes

### What changed

This release introduces a user dashboard for managing published parts, adds static legal pages (Privacy Policy, Terms of Use, Legal Notice), and implements workflow improvements for part deletion and UI consistency. The footer and navigation elements have been updated to reflect the project's current phase, and backend validations have been strengthened.

### Changes

#### Features
- **Dashboard**: Added "My Parts" section with delete functionality for published models (#149)
- **Legal**: Implemented static legal pages at `/privacy`, `/terms`, and `/legal-notice` (#148)
- **UI**: Standardized sentence case for all UI microcopy and normalized card title heights (#151, #150)

#### Improvements
- **Footer**: Restructured footer content for Phase 0, removing institutional references (#145, #146)
- **Workflow**: Added GitHub MCP defaults for agent documentation workflows (#147)
- **Validation**: Enforced 200-character limit for model titles matching database constraints

#### Documentation
- Aligned public positioning and contribution model in README (#155)
- Updated contribution policy to match public model (#154)
- Standardized commit message format for agent-docs workflow (#143)

#### Fixes
- **UI**: Fixed card title overflow by limiting to 2 lines (#150)
- **Navigation**: Removed broken links from footer and navbar
- **Backend**: Addressed review feedback on PR #158 and related validation improvements

### Technical details

The dashboard implementation introduces a new route group under `/dashboard` with Row-Level Security (RLS) policies ensuring users only access their own models. Legal pages are served as static routes without the `/legal` prefix for better discoverability. UI components now enforce consistent sentence casing through centralized validation utilities.
```

---

# v1.0.2 — 2026-05-13

```markdown
## Common Parts Access v1.0.2 Release Notes

### What changed

This release improves type safety across API and UI modules, hardens CI workflows, and resolves minor UI inconsistencies in form controls and model interactions. No breaking changes are introduced. Error handling for abort operations and content-type detection is now more robust.

### Changes

- **Type Safety & API**
  - Corrected TypeScript types for API request/response bodies, including proper `Content-Type` handling for JSON vs. binary/form data.
  - Replaced `any` types with explicit interfaces in model routes, utilities, and upload workflows.
  - Tightened utility typings for `debounce`, `throttle`, and request body guards.
  - Fixed abort error detection to handle `DOMException` (non-`Error` subclass).

- **UI & Forms**
  - Added loading indicator to the *Download Files* button in model views.
  - Resolved mobile input overflow in form controls.
  - Standardized product form controls using shared primitives.
  - Replaced empty avatar interfaces with concrete types.

- **CI & Linting**
  - Hardened documentation workflow release baseline.
  - Enforced stricter linting rules for `unknown`/`any` usage in utilities and model details.

### Technical details

The refactoring of API body guards and request payload alignment introduces stricter compile-time checks for route handlers, reducing runtime type errors. No changes to the public interface or data schemas were made.
```

---

# Changelog

All notable changes to Common Parts Access are documented in this file.

## [1.0.0] - 2026-05-04

Initial MVP release of Common Parts Access, the public platform for publishing and accessing digital spare parts.

### Added

- Public browsing flows for models, brands, products, collections, and user profiles, with shared public layouts, breadcrumbs, pagination, and featured models on the homepage.
- Authentication flows for sign up, login, password reset, logout, and account deletion, plus protected dashboard routing for authenticated areas.
- Model publishing workflow with validated upload forms, richer 3D file support, direct storage uploads, success states, and server-side APIs for creating models and related products.
- File delivery flows for single-file downloads and ZIP downloads, along with download tracking, view tracking, and like management.
- Reusable layout primitives and shells across the app, including Container, Grid, Section, AuthShell, DashboardShell, Navbar, Footer, and shared logo components.
- A token-based design system covering spacing, typography, color semantics, buttons, cards, inputs, comboboxes, dropdown inputs, textarea, and other shared UI primitives.
- Feedback collection in the product through a floating feedback button and structured feedback form backed by Supabase.
- Initial Supabase schema, storage bucket configuration, seed data, and row-level security policies needed to support the MVP data model.
- Project automation for linting, type checks, commit conventions, branch protection hooks, and agent-oriented documentation and workflows.

### Changed

- Rebranded the product from PartHarbor to Common Parts Access, including package metadata, navigation copy, documentation, and the overall institutional tone of the interface.
- Refined the visual identity with a new logo, favicon, typography system, sharper radius and spacing tokens, flatter surfaces, and updated navbar, hero, footer, and auth page presentation.
- Narrowed the public MVP scope by hiding unfinished surfaces such as the model-page share action, nonessential search affordances, tags on model cards, and placeholder dashboard sections.
- Reorganized model and auth query logic into shared Supabase query modules and centralized domain types to keep API routes and components aligned.
- Simplified the app structure around route groups for public, auth, and dashboard experiences, with standardized page shells and layout discipline documented in the repository.

### Fixed

- Corrected upload edge cases across validation, redirects, image handling, signed URLs, body-size limits, and storage path construction.
- Fixed download persistence and analytics issues, including model download row inserts, trigger behavior, ZIP folder structure, and hashed IP collection for downloads.
- Resolved multiple type, lint, and runtime issues in model routes, pagination, auth flows, image rendering, and Next.js configuration.
- Improved account creation and email confirmation reliability, plus better avatar fallbacks and clearer auth success and error states.
- Removed verbose logging, unused routes, unused components, and outdated placeholder code to stabilize the shipped surface.

### Notes

- This is the first public MVP release.
- The release was cut from `origin/main` via `Release: MVP — staging → main (#75)`.