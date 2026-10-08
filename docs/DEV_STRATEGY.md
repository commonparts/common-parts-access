# Common Parts Access — Development Strategy & Process

**Project:** Common Parts Access (`partharbor`)
**Stack:** Next.js · TypeScript · Supabase · Railway
**Last updated:** October 2026

---

## What This Document Is

A living reference that captures the development strategy, the process we built, what has been implemented, and what remains. It is intended to be updated as the project evolves, and readable by agents operating on the codebase.

---

## The Goal

Build a solo-operated web project that runs like a small company — with structured development processes, automated quality gates, and an AI agent pipeline that handles feedback triage, task management, development, and documentation with minimal manual overhead.

The human (project owner) acts as director and final validator. No agent merges or deploys to production without explicit approval.

---

## Agent Pipeline Architecture

```
User feedback (in-app widget)
        ↓
[ Agent Triage ] — Mistral Small via Supabase Edge Function
        ↓ classifies, reformulates, creates GitHub issue
        ↓
GitHub Issues (structured, labelled)
        ↓
[ Agent PM ] — Claude Project in Claude.ai
        ↓ reads issues, proposes priorities, discusses with human
        ↓ generates gh CLI commands after human validation
[ You ] — validate priorities and roadmap
        ↓
[ Agent Dev ] — Claude Code
        ↓ reads issues via MCP, proposes approach, implements, opens PRs
        ↓ merges only when the human asks
[ Agent QA ] — GitHub Copilot code review (automatic on every PR)
        ↓ inline comments + summary, never approves
        ↓
[ Release ] — Claude Code following the `release` skill
        ↓ dev → staging: documentation check, then promotion PR
        ↓ staging → main: release PR with the release notes in its description
        ↓
CI/CD Pipeline (GitHub Actions → Railway)
        ↓ release.yml publishes the GitHub Release when staging is merged into main
        ↓
[ You ] — review, merge to staging, validate, merge to main
```

**Automation level by layer:**

| Layer | Mode | Tool |
|---|---|---|
| Feedback triage | Fully automatic | Supabase Edge Function + Mistral Small |
| GitHub issue creation | Fully automatic | GitHub API via Edge Function |
| PM prioritisation | Semi-automatic (human validates) | Claude Project in Claude.ai |
| Dev (bugs & features) | Dialogue — agent proposes, human validates | Claude Code |
| QA review | Fully automatic on every PR | GitHub Copilot code review |
| Merge to staging/main | Always manual | Human |
| Promotion & release notes | Agent prepares the PRs and the notes, human validates and merges | Claude Code following the `release` skill |
| GitHub Release | Fully automatic on merge to `main` | `.github/workflows/release.yml` |

---

## Development Process

### Branch Structure

```
main        → production (Railway production environment)
staging     → pre-production (Railway staging environment)
dev         → integration branch (changes land through PRs only)
feature/xxx → short-lived feature branches → PR to dev
```

### Commit Conventions

All commits follow the **Conventional Commits** standard, enforced locally via `commitlint` + `husky`.

```
feat(scope): short description
fix(scope): short description
chore(scope): short description
docs(scope): short description
refactor(scope): short description
ci(scope): short description
```

Commit messages must reference the related issue number: `fix(ui): correct button variant (#42)`

The repository is public: commit messages, PR descriptions, PR and issue comments, and release notes describe the change itself, carry no internal context and no links to claude.ai sessions (see `CLAUDE.md`).

Husky hooks:
- `commit-msg` — rejects commits that don't match the convention
- `pre-push` — blocks direct pushes to `main` and `staging`

### Pull Request Rules

- `main` and `staging` are protected: no direct push allowed
- All changes go through a PR toward `dev`
- CI must pass before merge is possible
- Copilot code review runs automatically on every PR
- All blocking Copilot findings must be resolved before merge

### CI Pipeline (GitHub Actions)

Triggered on:
- Every push to `dev`
- Every PR targeting `main`, `staging`, or `dev`

Steps:
1. Install dependencies (`npm ci`)
2. TypeScript check (`tsc --noEmit`) — excludes `supabase/` (Deno runtime)
3. Lint (`npm run lint`)
4. Unit tests with coverage threshold (`npm run test:coverage`, Vitest)

### Railway Environments

Railway deploys automatically on push to connected branches.

| Branch | Environment |
|---|---|
| `main` | `production` |
| `staging` | `staging` |
| Pull requests | `common-parts-access-pr-<number>`, generated per PR |

---

## Complete PR & Deploy Workflow

This is the full lifecycle of a change, from issue to production.

```
1. Agent PM promotes issue → agent:dev label
2. Agent Dev reads issue via GitHub MCP
3. Agent Dev proposes approach — human validates
4. Agent Dev implements on feature/issue-xxx branch
5. Agent Dev opens PR toward dev
         ↓
6. CI runs automatically (tsc + lint + tests)
7. Copilot code review runs automatically
8. Human reads findings, asks Agent Dev to fix blocking issues
9. Agent Dev pushes fixes — CI and Copilot re-run
10. Human merges feature/issue-xxx → dev  (squash)
         ↓
11. Railway deploys the PR environment automatically
12. When ready: documentation check, then open PR dev → staging
    (`release` skill)
13. CI + Copilot review run on the PR
14. Human merges dev → staging  (merge commit)
         ↓
15. Railway deploys staging automatically
16. Human runs staging validation checklist (see below)
17. When validated: open PR staging → main, with the release notes
    in its description (`release` skill)
18. CI + Copilot review run on the PR
19. Human merges staging → main  (merge commit)
         ↓
20. Railway deploys production automatically
21. release.yml tags the merge commit and publishes the GitHub Release
```

### Staging Validation Checklist

Before merging `staging` → `main`, run through every item below.
This is the only gate between staging and production.

**Deploy**
- [ ] Railway staging deploy is green (no build errors)
- [ ] No errors in Railway logs on staging (`railway logs --environment staging`)
- [ ] No errors in Supabase logs (auth, API, edge functions)

**Feedback pipeline**
- [ ] Feedback widget submits correctly from the staging URL
- [ ] Triage agent creates a GitHub issue within 5 seconds
- [ ] Issue has correct type, priority, and agent labels
- [ ] `feedback` row is updated with `github_issue_url` and `github_issue_number`

**Core flows**
- [ ] Sign up and login work correctly
- [ ] Browse page loads without errors
- [ ] Part detail page loads for a published part
- [ ] Upload flow works end to end (if applicable to this PR)

**CI & QA**
- [ ] CI passes on the `staging → main` PR
- [ ] Copilot code review has no blocking issues on the PR

Only merge to `main` when every item is checked.

---

## GitHub Label Taxonomy

Labels are the shared language between humans and agents. All issues must carry one label from each group.

**Type**

| Label | Colour | Meaning |
|---|---|---|
| `type:bug` | Red | Something is broken |
| `type:improvement` | Blue | Enhancement or new feature |
| `type:question` | Purple | Clarification needed |
| `type:chore` | Yellow | Maintenance, deps, config |
| `type:docs` | Green | Documentation only |

**Priority**

| Label | Colour | Meaning |
|---|---|---|
| `priority:critical` | Dark red | Drop everything |
| `priority:high` | Orange | Next thing to build |
| `priority:medium` | Yellow | Planned, not urgent |
| `priority:low` | Light blue | Nice to have |

**Agent**

| Label | Meaning |
|---|---|
| `agent:triage` | Awaiting triage agent processing |
| `agent:dev` | Assigned to dev agent, ready to build |
| `agent:pm` | Needs PM review with human |
| `status:blocked` | Blocked, waiting on something |
| `status:merged-staging` | Resolved in `dev` or `staging`, pending promotion to `main` |

---

## Agent Reference

### Agent Triage

**Tool:** Supabase Edge Function (`supabase/functions/triage-feedback/`)
**Model:** Mistral Small (`mistral-small-latest`) at temperature 0.1
**Trigger:** Supabase database webhook on `feedback` INSERT
**What it does:**
- Classifies the feedback (type + priority)
- Rewrites it in neutral third-person language — no solution language, no invented requirements
- Creates a GitHub issue with structured body (Problem + Context) and original feedback in a collapsible block
- Applies correct labels based on type and priority
- Updates the `feedback` row with issue URL, issue number, and triage notes
- Idempotency guard: skips processing if `github_issue_number` is already set

**Response time:** 2–5 seconds end to end
**Secrets required:** `MISTRAL_API_KEY`, `GITHUB_TOKEN`, `GITHUB_REPO`, `WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

---

### Agent PM

**Tool:** Claude Project in Claude.ai
**Model:** Claude Sonnet or Opus (human chooses per session)
**Trigger:** On-demand — human initiates the session
**Interface:** Conversation in Claude.ai — no separate app or infrastructure

**Session workflow:**
1. Human runs `gh issue list --label "agent:pm" --json ...` and pastes the result
2. Agent reads all issues, analyses each one against Common Parts mission
3. Proposes action (promote / defer / close / discuss) + priority + justification per issue
4. Human discusses, validates, or modifies proposals
5. Agent generates a single `gh` CLI command block to execute all decisions
6. Human copy-pastes and runs the commands

**Project files:** `docs/DEV_STRATEGY.md` + Common Parts institutional brief
**System prompt location:** Claude Project instructions (not in the repo)

---

### Agent Dev

**Tool:** Claude Code
**Trigger:** On-demand — human opens a Claude Code session on the repository and assigns an issue
**Interface:** Claude Code session, directly in the codebase

**Tools connected:**
- **GitHub MCP** — reads issues, checks existing PRs, opens PRs
- **Supabase MCP** — checks table schema, RLS policies, edge function logs
- **Railway CLI** (no MCP) — reads runtime logs with `railway logs --environment <name>`

**Instructions file:** `CLAUDE.md` at the repository root, loaded automatically by every Claude Code session
**What it does:**
- Reads the issue directly via GitHub MCP — no copy-pasting
- Proposes a technical approach before writing any code
- Implements following all conventions in `CLAUDE.md`
- Updates the affected `docs/` files in the same PR as the code change
- Runs self-review checklist (tsc + lint + tests) before committing
- Opens a PR toward `dev` via GitHub MCP

**What it never does:**
- Merges a PR unless the human asks for that merge
- Pushes to `main` or `staging`
- Installs dependencies without asking
- Modifies `design-tokens/`, `middleware.ts`, or core Supabase client files

---

### Agent QA

**Tool:** GitHub Copilot code review (native, agentic architecture as of March 2026)
**Trigger:** Automatic on every PR — no manual action required
**Instructions file:** `.github/copilot-instructions.md`

**What it checks (in priority order):**
1. Security — auth checks, input validation, RLS, data exposure
2. Logic and behavior — does the implementation match the issue?
3. Conventions — design tokens, component library, query patterns, TypeScript
4. Performance — unbounded queries, unnecessary re-renders
5. Maintainability — magic numbers, missing JSDoc, TODO comments

**How it reports:**
- Inline comments on specific lines in the PR (blocking / warning / suggestion)
- Summary comment with verdict and issue counts

**What it never does:**
- Approves a PR — only the human approves
- Merges a PR

---

### Release

**Tool:** Claude Code session following the `release` skill (`.claude/skills/release/SKILL.md`), plus the `.github/workflows/release.yml` GitHub Action
**Trigger:** The skill is used whenever a session is asked to promote `dev` to `staging` or to prepare a release; the workflow runs when a PR from `staging` is merged into `main`

**`dev` → `staging`:**
- Documentation check on the full diff, application code included: Agent Dev updates `docs/` in each PR, and this step catches what was missed. Corrections go through a PR toward `dev` before the promotion
- Opens the promotion PR, merged with a merge commit when the human asks

**`staging` → `main`:**
- Determines the next version from commit subjects since the last tag (`feat(` → minor bump, anything else → patch bump; never major)
- Writes the release notes in the release PR description, between `<!-- release-notes:start -->` and `<!-- release-notes:end -->`, so the human reviews them before production
- Promotion PR descriptions and release notes are written from commit subjects, PR titles and the diff, never from commit bodies or issue texts, because the repository and its releases are public

**`release.yml`, on merge to `main`:**
- Computes the same version, fails if the tag already exists
- Publishes the notes found between the markers as the GitHub Release; without markers, publishes a minimal note listing the commit subjects
- Can be run manually (`workflow_dispatch`), only with the number of a merged release PR
- The GitHub Release is the authoritative changelog; no changelog file is committed to the repository

---

## Database Schema (Supabase)

There is a single Supabase database: production. Development, staging, PR environments and production all run against it, because persistent branch databases require a paid Supabase plan. Schema changes are version-controlled as SQL files in `supabase/migrations/` and applied by the human when the feature PR lands on `dev`, so promotions to `staging` and `main` carry no migration step.

The full schema is described in [DATA_MODEL.md](./DATA_MODEL.md). The table below covers the pipeline entry point only.

**`feedback`** — user-submitted feedback, entry point of the pipeline

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `created_at` | timestamptz | Auto |
| `user_id` | uuid | FK to `user_profiles`, nullable |
| `email` | text | Optional, for anonymous users |
| `type` | text | `bug / improvement / question / other` |
| `title` | text | Short title (max 200) |
| `description` | text | Full description (max 5000) |
| `url` | text | Page where feedback was submitted |
| `user_agent` | text | Browser info |
| `status` | text | `pending / triaged / github_issue_created / closed` |
| `github_issue_url` | text | Set after triage |
| `github_issue_number` | integer | Set after triage |
| `triage_notes` | text | Internal classification note from agent |

RLS: anyone can insert, users can read their own rows only.

---

## What Has Been Built

### ✅ Development Process

- Conventional Commits enforced via `commitlint` + `husky`
- `pre-push` hook blocking direct pushes to `main` and `staging`
- Branch structure: `main`, `staging`, `dev`
- GitHub Actions CI: type check + lint + Vitest with coverage threshold on every push and PR
- Schema changes version-controlled in `supabase/migrations/`, applied by the human to the single production database
- `supabase/` excluded from tsc (Deno runtime)
- GitHub label taxonomy (13 labels across type, priority, agent)

### ✅ In-App Feedback System

- `feedback` table in Supabase with RLS
- `FeedbackForm` component using project design system
- `FeedbackButton` floating widget available on all pages (via `app/layout.tsx`)
- Captures: type, title, description, optional email, page URL, user agent, user ID
- Feedback insert extracted to `lib/supabase/queries/feedback.ts`

### ✅ Agent Triage

- Supabase Edge Function: `triage-feedback`
- Triggered by Supabase database webhook on `feedback` INSERT
- Classifies, reformulates, creates GitHub issue with correct labels
- Idempotency guard against webhook retries
- Env var validation with clear error messages
- Updates `feedback` row with issue URL, number, and triage notes
- All executions returning HTTP 200, 2–5s response time

### ✅ Agent PM

- Claude Project in Claude.ai with full system prompt
- Project files: `docs/DEV_STRATEGY.md` + institutional brief
- On-demand sessions via `gh issue list` + conversation
- Outputs ready-to-run `gh` CLI command blocks
- Decisions always validated by human before execution

### ✅ Agent Dev

- Claude Code
- Instructions in `CLAUDE.md`, loaded automatically by Claude Code
- Connected to GitHub and Supabase via MCP; Railway logs via CLI
- Dialogue mode: proposes approach → human validates → implements → opens PR
- Reads issues directly via GitHub MCP

### ✅ Agent QA

- GitHub Copilot code review with agentic architecture
- Automatic on every PR — no setup required per PR
- Custom instructions in `.github/copilot-instructions.md`
- Checks: security, logic, conventions, performance, maintainability
- Reports inline comments + summary on every PR

### ✅ Release

- `release` skill in `.claude/skills/release/SKILL.md`: documentation check before promotion to `staging`, release notes written in the release PR
- `.github/workflows/release.yml`: tag and GitHub Release published on merge to `main`
- Semver tagging: `feat(` → minor bump, anything else → patch bump
- Release notes published as GitHub Releases (the authoritative changelog; no changelog file is committed to the repository)

---

## What Remains to Build

### 🔲 Page `/roadmap` on the site

A public-facing roadmap page at `access.commonparts.org/roadmap`. To be built and maintained by the agents after the PM session produces a structured backlog.

### 🔲 Error Monitoring

- Connect Railway runtime logs to a structured alerting system
- Auto-create a `type:bug priority:high` GitHub issue when an unhandled error is detected in production

### 🔲 Domain & Environment Setup

- Configure `access.commonparts.org` on Railway production
- Set up `staging.commonparts.org` as a fixed preview environment

---

## Key Decisions & Rationale

**Why Supabase Edge Functions for triage?**
Zero infrastructure overhead. Triggered directly by the database. Free tier is sufficient for current volume.

**Why Mistral Small for triage?**
Classification and light reformulation — not reasoning. Fast, cheap, consistent at temperature 0.1.

**Why include the original feedback verbatim in the issue?**
Structural guarantee: the PM agent and human always have access to what the user actually said, regardless of reformulation quality.

**Why Claude Project for Agent PM?**
The PM session requires genuine back-and-forth reasoning. A conversation interface is the right medium. No infrastructure, no deployment.

**Why Claude Code for Agent Dev?**
It works directly in the repository and the terminal, so it can run the project's checks, read Railway logs through the CLI, and use the GitHub and Supabase MCP connections. That gives the agent the context it needs without additional tooling. The same tool also prepares promotions and releases, following the `release` skill.

**Why Copilot code review for Agent QA?**
Native to GitHub, agentic architecture since March 2026, configurable via a single instructions file, automatic on every PR. Zero infrastructure to maintain.

**Why squash merges into `dev` and merge commits for promotions?**
Each feature lands on `dev` as one squashed commit, so history stays readable and release notes list one line per change. Promotions (`dev` → `staging` → `main`) use merge commits: a squash would leave `staging` and `main` without `dev`'s history, and every later promotion would conflict.

**Why 0 required approvals on PRs?**
Solo project. The goal of PR protection is forcing CI + Copilot review to run. The human reviews and merges manually anyway.

---

## File Structure Reference

```
/
├── CLAUDE.md                       # Development conventions, loaded by Claude Code
├── .claude/
│   └── skills/release/SKILL.md     # Promotion and release procedure
├── .github/
│   ├── copilot-instructions.md     # Agent QA instructions (Copilot review)
│   └── workflows/
│       ├── ci.yml                  # Lint + type check + tests
│       ├── release.yml             # Tag + GitHub Release on merge to main
│       └── label-merged-issues.yml # Labels issues referenced by merged PRs
├── .husky/
│   ├── commit-msg                  # Commitlint hook
│   ├── pre-commit
│   └── pre-push                    # Block direct push to main/staging
├── app/
│   ├── (auth)/                     # Sign-up, login, password, account deletion
│   ├── (dashboard)/                # Protected: dashboard, my parts, publish, settings
│   ├── (legal)/                    # Privacy, terms, legal notice
│   ├── (public)/                   # Browse, brands, categories, product, parts, search
│   ├── api/                        # API routes (no Server Actions)
│   ├── layout.tsx                  # FeedbackButton mounted here
│   ├── robots.ts / sitemap.ts      # Crawler entry points
├── components/                     # UI by domain (ui/, browse/, part/, publish/, search/, …)
├── constants/
├── design-tokens/                  # Token sources (edit only with approval)
├── hooks/
├── lib/
│   ├── curation/ publish/ upload/  # Publish-flow logic per track
│   ├── storage/                    # Upload and download helpers
│   ├── supabase/queries/           # All Supabase queries, one file per domain
│   └── utils/                      # Validators, formatters, SEO, feature flags, …
├── supabase/
│   ├── functions/triage-feedback/  # Agent Triage edge function
│   └── migrations/                 # Version-controlled schema changes
├── types/
├── docs/                           # Technical documentation (index: docs/README.md)
└── commitlint.config.mjs           # Commit convention config
```
