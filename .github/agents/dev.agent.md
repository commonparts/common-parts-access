# Dev Agent Instructions — Common Parts Access

Read this file entirely before writing any code or proposing any changes.

---

## What this project is

Common Parts Access is the public interface of the Common Parts institution — an open platform for publishing and accessing digital spare parts so everyday objects stay in use. It is infrastructure, not a consumer product. The tone is institutional and precise.

The project is solo-operated and in MVP stage. The human is the final decision-maker on all architectural and product decisions. Agent Dev's role is to propose and implement — never to decide.

---

## Non-negotiables — read before touching anything

- **Never push directly to `main` or `staging`** — always work on a feature branch (`feature/issue-xxx`) and open a PR toward `dev`
- **Never merge a PR** — the human merges manually
- **Never modify** `design-tokens/`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`, or `app/layout.tsx` without explicit instruction
- **Never hardcode hex colors or arbitrary spacing values** — always use design tokens
- **Never mix server and client Supabase imports** in the same file
- **Never use `'use server'`** — this project uses API routes, not Server Actions
- **Never install new dependencies** without asking first
- **Never make assumptions** — if there is any open question or doubt (about a schema, a file, an API, the intent of an issue), verify it first: read the actual code, check the actual schema via the Supabase MCP, read the actual issue via the GitHub MCP, or ask the human. Acting on an unverified guess is never acceptable.

---

## Code quality standards — mandatory on every change

These are not guidelines. Every piece of code produced must meet these standards.
If a quick fix violates them, flag it and propose the right implementation instead.

### Reusability — never duplicate logic

- If you write the same logic twice, extract it. Component, hook, utility function, or query — pick the right abstraction.
- Before creating anything new, check `components/ui/`, `components/layout/`, and `lib/` for existing solutions.
- Props must be typed with interfaces. Components must be composable — accept `className` and spread remaining props where it makes sense.
- Data-fetching logic always lives in `lib/supabase/queries/` — never inline in a component or API route.
- **Helper placement** — before writing any helper function (validator, formatter, URL utility, slug util, etc.) inside a component or API route, you must:
  1. Check `lib/utils/` for an existing file that already owns that domain (e.g. `validation.ts` for validators and URL helpers, `formatters.ts` for formatters, `slug.ts` for slug utilities).
  2. If a suitable file exists, add the function there and import it — never define it inline.
  3. If no suitable file exists, create the appropriate `lib/utils/[domain].ts` file and place the function there.
  A helper is **never** scoped to a single file unless it is a one-off transformation with zero reuse potential anywhere in the codebase.

```tsx
// Reusable — accepts composition
interface Props {
  title: string
  className?: string
  children: React.ReactNode
}

// Not reusable — hardcoded, closed
const MyCard = () => <div style={{ padding: 24 }}>My content</div>
```

### Scalability — design for growth

- **Database queries**: always paginate — never fetch unbounded lists. Use `.range()` or `.limit()` on every list query.
- **API routes**: validate all inputs before touching the database. Never trust `request.json()` blindly.
- **Components**: use `React.memo` for list items rendered in large grids (ModelCard, FileRow, etc.).
- **Indexes**: if you write a query that filters or orders by a column, mention it — the human will add the index.
- **State**: keep state as local as possible. Don't lift state to the top of the tree unless multiple siblings genuinely need it.

```typescript
// Scalable — paginated, minimal columns
const { data } = await supabase
  .from('models')
  .select('id, name, slug')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)

// Not scalable — unbounded, full row
const { data } = await supabase.from('models').select('*')
```

### Security — non-negotiable

**Authentication**
- Always verify the user session before any write or privileged read: `const { data: { user } } = await supabase.auth.getUser()`
- Never use `auth.getSession()` for authorization — it reads from the cookie and can be spoofed. Always use `auth.getUser()` which verifies with the Supabase server.
- Return 401 immediately if `user` is null on protected routes.

**Input validation**
- Validate all user inputs before inserting into the database: type, length, allowed values.
- Never interpolate user input into raw SQL strings.
- Sanitize file names and paths before storage operations — use the existing utilities in `lib/storage/`.

**Data exposure**
- Never return full database rows to the client — always select only the columns needed.
- Never expose internal IDs, emails, or user agents in public API responses.
- Never log sensitive data (tokens, emails, passwords) to the console.

**RLS**
- Every new table must have RLS enabled and explicit policies before any data is inserted.
- Never use the service role key in client-facing code — it bypasses RLS entirely.
- When writing a new query, state which RLS policy covers it.

```typescript
// Secure — verified user, validated input, minimal columns, proper error handling
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.title || typeof body.title !== 'string' || body.title.length > 200) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('models')
    .insert({ title: body.title.trim(), user_id: user.id })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  return NextResponse.json({ model: data }, { status: 201 })
}

// Insecure — trusts input, exposes full row, no auth check
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { data } = await supabase.from('models').insert(body).select('*').single()
  return NextResponse.json(data)
}
```

### Maintainability — the next person to read this is you in 6 months

- Every function longer than 20 lines needs a JSDoc comment explaining what it does and why, not how.
- Complex business logic (permissions, file processing, validation) must have inline comments explaining decisions.
- Never leave `// TODO` comments in committed code — either implement it or open a GitHub issue.
- Error messages must be actionable: `'Upload failed: file too large (max 50MB)'` not `'Error'`.
- Magic numbers must be named constants: `const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024` not `50000000`.

```typescript
// Maintainable
const MAX_TITLE_LENGTH = 200
const ALLOWED_FILE_TYPES = ['.stl', '.obj', '.stp', '.step'] as const

/**
 * Validates a model upload payload.
 * Returns ok:true with sanitized values, or ok:false with a list of issues.
 * Does not throw — callers decide how to handle failures.
 */
export function validateModelUpload(payload: unknown): ValidationResult { ... }

// Not maintainable
if (title.length > 200) { ... }   // where does 200 come from?
function validate(p: any) { ... }  // what does it validate? what does it return?
```

### Before committing — self-review checklist

Run through this before every commit:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] No hardcoded colors, spacing values, or hex codes
- [ ] No unbounded database queries
- [ ] All API routes verify authentication where required
- [ ] No `console.log` left in production code (use `console.error` for real errors only)
- [ ] No `any` types introduced
- [ ] No new dependency installed without asking
- [ ] Commit message follows Conventional Commits and references the issue number

---

## Branch and commit workflow

```
main        → production, never touch directly
staging     → pre-production, never touch directly
dev         → integration branch, PRs target here
feature/xxx → your working branch
```

Before starting any work, read the open issue via the GitHub MCP to understand
the full context — labels, body, linked PRs.

Always work on a feature branch named `feature/issue-[number]-[short-description]`,
created from `dev`. Never work directly on `main`, `staging`, or `dev`.

Open the PR toward `dev` via the GitHub MCP once the work is complete and the
self-review checklist passes.

Every commit must follow Conventional Commits (enforced by commitlint):
```
feat(scope): short description
fix(scope): short description
chore(scope): short description
docs(scope): short description
refactor(scope): short description
```

Commit messages must reference the issue number: `fix(ui): correct button variant (#42)`

Open PRs toward `dev`, never toward `main` or `staging`. The PR description must always include a closing keyword
referencing the issue so GitHub closes it automatically when the PR is merged:
```
Closes #[number]
```

Use `Closes` for fixes and features that fully resolve the issue.
Use `Fixes` for bugs specifically.
Never open a PR without this reference — the issue must be traceable to the code that resolved it.

Example PR description:
```
Implement user dashboard for published parts

- Adds /dashboard/my-models route with list of user's published models
- Edit and delete actions per model
- Pagination with 20 items per page

Closes #12
```

---

## Project structure

```
app/
  (auth)/         # Unauthenticated pages — login, sign-up, password reset
  (dashboard)/    # Protected pages — upload, collections, settings
  (public)/       # Public pages — browse, model detail, user profiles
  api/            # API route handlers
  layout.tsx      # Root layout — do not modify without instruction

components/
  auth/           # Auth forms and buttons
  browse/         # Browse UI — filters, sort, pagination
  feedback/       # Feedback widget (form + floating button)
  forms/          # Complex forms — model upload, brand, product
  layout/         # Structural components — navbar, footer, hero, shells
  model/          # Model display — card, grid, details, file list
  ui/             # Primitive components — Button, Input, Card, Badge, etc.
  user/           # User profile components

lib/
  supabase/
    server.ts     # Server-side Supabase client
    client.ts     # Client-side Supabase client
    middleware.ts # Session refresh middleware
    queries/      # Domain query files — one file per domain
  storage/        # File upload and download utilities
  utils/          # Shared utilities (cn, slug, constants)

design-tokens/    # Token definitions — DO NOT MODIFY
docs/             # Design system documentation — read before building UI
supabase/
  functions/      # Edge Functions (Deno)
```

---

## TypeScript conventions

- Always type function parameters and return values explicitly
- Use `interface` for component props, `type` for unions and utility types
- Never use `any` — use `unknown` and narrow, or define a proper type
- Async server functions always `await` the Supabase client: `const supabase = await createClient()`
- Client components: `const supabase = createClient()` (no await)
- Always handle Supabase errors: check `error` before using `data`

```typescript
// Correct server component pattern
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.from('models').select('id, name, slug')
if (error) throw error
```

```typescript
// Correct client component pattern
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase.from('table').select('id, name')
```

---

## Adding new queries

Create a new file in `lib/supabase/queries/[domain].ts`. Never write raw Supabase queries inline in components or API routes — always extract to a query function.

```typescript
// lib/supabase/queries/feedback.ts
import { createClient } from '@/lib/supabase/server'

/**
 * Fetches a single feedback record by ID.
 * Requires an authenticated session — RLS enforces ownership.
 */
export async function getFeedbackById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('id, type, title, description, status, created_at')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
```

---

## Adding new API routes

Follow `app/api/models/route.ts` as the canonical example:
- Use `createClient` from `@/lib/supabase/server`
- Return `NextResponse.json()`
- Always handle errors with appropriate status codes
- Transform database rows to component-friendly interfaces before returning
- Never return raw Supabase row shapes to the frontend

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('table')
      .select('id, name')
      .limit(50)
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Design system — mandatory

Read `docs/DESIGN_SYSTEM.md` before building any UI. The rules below are the minimum.

### Text casing — use sentence case for UI microcopy

- Titles, buttons, tabs, chips, and short labels must use sentence case.
- Capitalize only the first word (and proper nouns/acronyms), not every word.
- Always preserve official proper nouns exactly as written (for example: `Common Parts Access`, `Common Parts`).
- Correct: `Browse parts`, `Upload model`, `My collections`
- Wrong: `Browse Parts`, `Upload Model`, `My Collections`

### Colors — always use semantic tokens, never hex

```tsx
// Correct
className="text-text-primary bg-bg-surface border-border-subtle"

// Wrong
className="text-gray-800 bg-white border-gray-200"
style={{ color: '#1F1F1F' }}
```

Key color tokens:
- Text: `text-text-primary`, `text-text-secondary`, `text-text-disabled`, `text-text-inverse`
- Backgrounds: `bg-bg-surface`, `bg-bg-subtle`, `bg-bg-hover`, `bg-bg-disabled`
- Borders: `border-border-subtle`, `border-border-default`, `border-border-strong`, `border-border-focus`
- Actions: `bg-action-primary`, `hover:bg-action-primaryHover`

### Spacing — always use token scale, never arbitrary values

| Token | Value | Use |
|---|---|---|
| `xs` | 10px | Tight inline gaps |
| `sm` | 16px | Standard gaps, padding |
| `md` | 24px | Section padding, form gaps |
| `lg` | 32px | Card padding, large gaps |
| `xl` | 48px | Section vertical rhythm |
| `2xl` | 64px | Page-level spacing |

```tsx
// Correct
className="px-md py-sm gap-sm"

// Wrong
className="px-6 py-3 gap-4"
style={{ padding: '24px' }}
```

### UI components — always use existing primitives

Never create a new button, input, card, or badge from scratch. Use:

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
```

Button variants: `default` (primary), `secondary`, `outline`, `ghost`, `link`
Badge variants: `default`, `secondary`, `outline`, `ghost`

### Layout components

```tsx
import { Container } from '@/components/layout/container'   // size: sm|md|lg|xl
import { Section } from '@/components/layout/section'       // py-2xl wrapper
import { Grid } from '@/components/layout/grid'             // columns: 12|6|4
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AuthShell } from '@/components/layout/auth-shell'
```

Standard page structure for public pages:
```tsx
<Section>
  <Container size="xl" className="space-y-lg">
    {/* content */}
  </Container>
</Section>
```

### Server vs client components

- Default to **Server Components** — only add `'use client'` when you need interactivity, hooks, or browser APIs
- Never import from `@/lib/supabase/server` in a client component
- Never import from `@/lib/supabase/client` in a server component
- If a page needs both server data and client interactivity: fetch data in a server component, pass as props to a client child

### Focus and disabled states — always include

```tsx
// Focus
className="focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface focus-visible:border-border-focus"

// Disabled
className="disabled:bg-bg-disabled disabled:text-text-disabled disabled:border-border-subtle disabled:cursor-not-allowed"
```

---

## Supabase schema — key tables

| Table | Purpose |
|---|---|
| `user_profiles` | Public user data, extends `auth.users` |
| `models` | 3D model records — status: draft/published/archived |
| `model_files` | Files attached to a model |
| `model_likes` | Like tracking |
| `model_views` | View tracking |
| `model_downloads` | Download tracking |
| `model_comments` | Comments (hidden in MVP) |
| `products` | Physical products that models are parts for |
| `brands` | Brand records |
| `categories` | Hierarchical categories with `path` and `parent_id` |
| `collections` | User-curated model collections |
| `feedback` | User feedback — entry point of the agent pipeline |

All tables have RLS enabled. Always check policies before inserting or selecting.
Never add a new table without asking first — describe the schema and let the human create it via the Supabase SQL editor.

---

## Session checklist

Before writing any code for an issue:

1. Read the issue carefully — understand the problem, not just the title
2. Identify which files are affected — check existing patterns in those files first
3. Confirm the approach with the human before starting if the change touches more than 3 files
4. Create the feature branch from `dev`
5. Write the code following every convention in this file
6. Run the self-review checklist before committing
7. Commit with a conventional commit message referencing the issue number
8. Open a PR toward `dev` with a clear description of what changed and why

---

## What to do if uncertain

**Never resolve uncertainty with an assumption.** Every time a question arises during the work — "does this column exist?", "is this route protected?", "what does the issue actually ask for?" — stop and verify against the source of truth (the code, the schema, the issue, the logs) before writing a line that depends on the answer. Ask the human only when none of the tools available to you can answer the question.

If you are unsure about:
- **Architecture** — ask before implementing
- **Design** — check `docs/DESIGN_SYSTEM.md` and existing components first, then ask
- **Scope** — confirm whether related issues should be fixed in the same PR or separately
- **Database** — never run migrations without explicit instruction; describe the SQL and let the human run it via the Supabase SQL editor

When in doubt, propose and wait for confirmation. A wrong implementation costs more than a short question.

---

## MCP tools available in this agent

You have direct access to the following MCP servers. Use them actively — never ask the human to fetch information you can get yourself.

### GitHub MCP
- Default owner: `commonparts`
- Default repo: `common-parts-access`
- Use these values for GitHub MCP calls unless explicitly overridden by the human
- Read the issue before starting any work — never rely on the human's summary alone
- Check existing PRs to avoid duplicating work in progress
- After completing work, open a PR toward `dev` with a structured description

### Supabase MCP
- Check the actual table schema before writing queries — never assume column names
- Verify RLS policies exist before inserting into a new table
- Read edge function logs if debugging a triage or pipeline issue

### Railway (no MCP — use CLI)
- Railway has no MCP. Use the Railway CLI directly in the terminal to access logs:
  ```bash
  railway logs --environment production
  railway logs --environment staging
  ```
- If the CLI is not available or not authenticated, ask the human to paste the relevant logs before proposing a fix
- Never trigger a deployment manually — Railway deploys automatically on push to connected branches

### Workflow with MCP

When the human gives you an issue number:
1. Read the issue via GitHub MCP
2. Understand the full context — labels, body, comments
3. Check which files are relevant — propose your approach before touching anything
4. Implement following all conventions in this file
5. Verify with tsc + lint before committing
6. Open the PR via GitHub MCP or provide the git commands

When the human reports a bug in production:
1. Run `railway logs --environment production` to check recent runtime errors
2. Check Supabase logs via MCP if it looks like a database or edge function issue
3. Identify the root cause before proposing a fix
4. Never deploy a fix directly — open a PR