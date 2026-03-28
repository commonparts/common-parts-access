# Common Parts Access — Development Strategy & Process

**Project:** Common Parts Access (`partharbor`)
**Stack:** Next.js 16 · TypeScript · Supabase · Vercel
**Last updated:** March 2026

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
[ Agent PM ] — prioritises, maintains roadmap, surfaces improvements for discussion
        ↓ bugs/tasks → auto-assigned
        ↓ improvements → reviewed with human first
[ You ] — validate priorities and roadmap
        ↓
[ Agent Dev ] — resolves issues, opens PRs (never merges)
        ↓
[ Agent QA ] — reviews PRs, runs tests, checks logs
        ↓
CI/CD Pipeline (GitHub Actions → Vercel)
        ↓
[ You ] — merge to staging → main
        ↓
[ Agent Comms ] — updates docs, changelog, public roadmap
```

**Automation level by layer:**

| Layer | Mode |
|---|---|
| Feedback triage | Fully automatic |
| GitHub issue creation | Fully automatic |
| PM prioritisation | Semi-automatic (human validates improvements) |
| Dev (bug fixes) | Automatic → PR opened for review |
| Dev (features) | Human-validated before agent starts |
| Merge to staging/main | Always manual |
| Docs & changelog | Fully automatic |

---

## Development Process

### Branch Structure

```
main        → production (Vercel production deploy)
staging     → pre-production (Vercel preview, fixed URL)
dev         → integration branch (push directly OK)
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
test(scope): short description
ci(scope): short description
```

Husky hooks:
- `commit-msg` — rejects commits that don't match the convention
- `pre-push` — blocks direct pushes to `main` and `staging`

### Pull Request Rules

- `main` and `staging` are protected: no direct push allowed
- All changes go through a PR
- CI must pass before merge is possible
- PR comments must be resolved before merge

### CI Pipeline (GitHub Actions)

Triggered on:
- Every push to `dev`
- Every PR targeting `main` or `staging`

Steps:
1. Install dependencies (`npm ci`)
2. TypeScript check (`tsc --noEmit`)
3. Lint (`next lint`)

Tests will be added when the MVP stabilises (Vitest, to be configured).

### Vercel Environments

| Branch | Environment | URL |
|---|---|---|
| `main` | Production | `access.commonparts.org` (future) |
| `staging` | Preview (fixed) | `staging-common-parts.vercel.app` |
| `dev` + feature branches | Preview (auto) | Generated per push |

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
| `priority:high` | Orange | Next sprint |
| `priority:medium` | Yellow | Planned |
| `priority:low` | Light blue | Nice to have |

**Agent**

| Label | Meaning |
|---|---|
| `agent:triage` | Awaiting triage agent processing |
| `agent:dev` | Assigned to dev agent |
| `agent:pm` | Needs PM review with human |
| `status:blocked` | Blocked, waiting on something |

---

## Database Schema (Supabase)

Core tables relevant to the agent pipeline:

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
- GitHub Actions CI: type check + lint on every push and PR
- GitHub label taxonomy (13 labels across type, priority, agent)

### ✅ In-App Feedback System

- `feedback` table in Supabase with RLS
- `FeedbackForm` component using project design system
- `FeedbackButton` floating widget available on all pages (via `app/layout.tsx`)
- Captures: type, title, description, optional email, page URL, user agent, user ID

### ✅ Agent Triage

- Supabase Edge Function: `triage-feedback`
- Triggered by Supabase database webhook on `feedback` INSERT
- Calls Mistral Small (`mistral-small-latest`) at temperature 0.1
- Prompt instructs: neutral third-person reformulation, no solution language, no invented requirements
- Creates GitHub issue with structured body (Problem + Context sections) and original feedback in collapsible block
- Applies correct labels based on type and priority
- Updates `feedback` row with issue URL, issue number, and triage notes
- Response time: 2–5 seconds end to end
- All executions returning HTTP 200 ✅

---

## What Remains to Build

### 🔲 Agent PM

The PM agent reads GitHub issues labelled `agent:pm` and:
- Proposes a priority ranking for improvements
- Presents improvements to the human for discussion
- Maintains a public roadmap (published on the site)
- Creates or updates GitHub issues based on decisions made
- Does not act on `type:bug` issues — those go directly to Agent Dev

Implementation approach: likely a scheduled script or Claude-powered interface rather than a Supabase Edge Function, since it requires back-and-forth with the human.

### 🔲 Agent Dev

The dev agent reads GitHub issues labelled `agent:dev` and:
- Understands the codebase structure and conventions
- Implements the fix or feature on a new branch (`feature/issue-xxx`)
- Opens a PR with a conventional commit message and issue reference
- Never merges

Tooling to evaluate: Claude Code (CLI), GitHub Copilot Workspace, or a custom orchestrator using the Anthropic API with file access tools.

Key constraint: the agent must follow commit conventions, write TypeScript, and respect the existing component library.

### 🔲 Agent QA

Reviews PRs opened by Agent Dev:
- Checks for type errors and lint issues (CI already does this)
- Reviews logic and edge cases
- Leaves review comments on the PR
- Does not approve — human approves

### 🔲 Agent Comms

After a PR is merged to `main`:
- Updates `CHANGELOG.md` from commit history
- Updates the public roadmap page on the site
- Optionally posts a summary somewhere (email, internal log)

### 🔲 Testing Infrastructure

- Add Vitest for unit and integration tests
- Add test script to `package.json`
- Add test step to CI workflow
- Define minimum coverage threshold before merge

### 🔲 Supabase Migrations Workflow

Currently all schema changes are made via the Supabase SQL Editor UI. This is fine for now but needs to be formalised:
- Add `supabase/migrations/` folder to repo
- Version-control all schema changes
- Document the process for applying migrations in CI

### 🔲 Error Monitoring

- Connect Vercel runtime logs to a structured alerting system
- Optionally: auto-create a `type:bug priority:high` GitHub issue when an unhandled error is detected in production

### 🔲 Domain & Environment Setup

- Configure `access.commonparts.org` on Vercel
- Set up `staging.commonparts.org` as a fixed preview environment
- Manage environment variables cleanly across dev / staging / production

---

## Key Decisions & Rationale

**Why Supabase Edge Functions for triage, not a separate server?**
Zero infrastructure overhead. Triggered directly by the database. Free tier is sufficient for the current volume. No latency from polling.

**Why Mistral Small and not a larger model?**
The triage task is classification and light reformulation — not reasoning or generation. Mistral Small handles it in under 3 seconds at a fraction of the cost. The PM agent will use a more capable model for nuanced decisions.

**Why temperature 0.1 for triage?**
Classification tasks benefit from low temperature. We want consistent, deterministic outputs. Creative interpretation is exactly what we want to avoid at this stage.

**Why include the original feedback verbatim in the issue?**
The agent's reformulation is never perfect. Including the source in a collapsible block means the PM agent and human always have access to what the user actually said, regardless of reformulation quality. It's a structural guarantee, not a workaround.

**Why squash merge only on main?**
One commit per feature or fix. `main`'s history stays readable. Changelogs can be generated cleanly. Agents reading commit history get unambiguous signals.

**Why 0 required approvals on PRs?**
The project is solo. The goal of PR protection is not human review — it's forcing the CI pipeline to run before anything reaches `main`. The human reviews and merges manually anyway.

---

## File Structure Reference

```
/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Lint + type check
├── .husky/
│   ├── commit-msg                  # Commitlint hook
│   └── pre-push                    # Block direct push to main/staging
├── supabase/
│   └── functions/
│       └── triage-feedback/
│           └── index.ts            # Agent Triage edge function
├── app/
│   └── layout.tsx                  # FeedbackButton mounted here
├── components/
│   └── feedback/
│       ├── feedback-form.tsx       # Form component
│       └── feedback-button.tsx     # Floating button
└── commitlint.config.mjs           # Commit convention config
```
