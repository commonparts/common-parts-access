# Common Parts Access — Development Strategy & Process

**Project:** Common Parts Access (`partharbor`)
**Stack:** Next.js · TypeScript · Supabase · Vercel
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
[ Agent PM ] — Claude Project in Claude.ai
        ↓ reads issues, proposes priorities, discusses with human
        ↓ generates gh CLI commands after human validation
[ You ] — validate priorities and roadmap
        ↓
[ Agent Dev ] — GitHub Copilot agent in VS Code
        ↓ reads issues via MCP, proposes approach, implements, opens PRs
        ↓ never merges
[ Agent QA ] — (planned)
        ↓
CI/CD Pipeline (GitHub Actions → Vercel)
        ↓
[ You ] — merge to staging → main
        ↓
[ Agent Comms ] — (planned) updates docs, changelog, public roadmap
```

**Automation level by layer:**

| Layer | Mode | Tool |
|---|---|---|
| Feedback triage | Fully automatic | Supabase Edge Function + Mistral Small |
| GitHub issue creation | Fully automatic | GitHub API via Edge Function |
| PM prioritisation | Semi-automatic (human validates) | Claude Project in Claude.ai |
| Dev (bugs & features) | Dialogue — agent proposes, human validates | GitHub Copilot agent in VS Code |
| Merge to staging/main | Always manual | Human |
| Docs & changelog | Planned | — |

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
ci(scope): short description
```

Commit messages must reference the related issue number: `fix(ui): correct button variant (#42)`

Husky hooks:
- `commit-msg` — rejects commits that don't match the convention
- `pre-push` — blocks direct pushes to `main` and `staging`

### Pull Request Rules

- `main` and `staging` are protected: no direct push allowed
- All changes go through a PR toward `dev`
- CI must pass before merge is possible
- PR comments must be resolved before merge

### CI Pipeline (GitHub Actions)

Triggered on:
- Every push to `dev`
- Every PR targeting `dev`, `main`, or `staging`

Steps:
1. Install dependencies (`npm ci`)
2. TypeScript check (`tsc --noEmit`)
3. Lint (`npm run lint` → `eslint .`)

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

**Tool:** GitHub Copilot agent mode in VS Code
**Model:** GPT-4o / Claude Sonnet depending on Copilot configuration
**Trigger:** On-demand — human opens a session in VS Code and assigns an issue
**Interface:** Chat panel in VS Code, directly in the codebase

**MCP servers connected:**
- **GitHub MCP** — reads issues, opens PRs, checks existing work
- **Supabase MCP** — checks table schema, RLS policies, edge function logs
- **Vercel MCP** — checks deployment status and runtime logs

**Instructions file:** `.github/agents/dev.agent.md` (read automatically by the agent)
**What it does:**
- Reads the issue directly via GitHub MCP — no copy-pasting
- Proposes a technical approach before writing any code
- Implements following all conventions in `dev.agent.md`
- Runs self-review checklist (tsc + lint) before committing
- Opens a PR toward `dev` via GitHub MCP

**What it never does:**
- Merges a PR
- Pushes to `main` or `staging`
- Installs dependencies without asking
- Modifies `design-tokens/`, `middleware.ts`, or core Supabase client files

---

## Database Schema (Supabase)

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
- Classifies, reformulates, creates GitHub issue with correct labels
- Updates `feedback` row with issue URL, number, and triage notes
- All executions returning HTTP 200, 2–5s response time

### ✅ Agent PM

- Claude Project in Claude.ai with full system prompt
- Project files: `docs/DEV_STRATEGY.md` + institutional brief
- On-demand sessions via `gh issue list` + conversation
- Outputs ready-to-run `gh` CLI command blocks
- Decisions always validated by human before execution

### ✅ Agent Dev

- GitHub Copilot agent mode in VS Code
- Instructions in `.github/agents/dev.agent.md`
- Connected to GitHub, Supabase, and Vercel via MCP
- Dialogue mode: proposes approach → human validates → implements → opens PR
- Reads issues directly via GitHub MCP — no manual copy-paste

### ✅ Agent Dev — Instructions (`dev.agent.md`)

Covers: project structure, TypeScript conventions, Supabase patterns, design system tokens, component library, security requirements, scalability rules, reusability rules, maintainability rules, self-review checklist, branch and commit workflow, MCP tool usage.

---

## What Remains to Build

### 🔲 Page `/roadmap` on the site

A public-facing roadmap page at `access.commonparts.org/roadmap`. Reads from GitHub issues (issues labelled `priority:high` and `priority:medium` with `agent:dev`) or from a `ROADMAP.md` file maintained by the Agent PM after each session. Language should be user-facing, not developer-facing.

### 🔲 Agent QA

Reviews PRs opened by Agent Dev:
- Checks for type errors and lint issues (CI already does this)
- Reviews logic, edge cases, and security concerns
- Leaves review comments on the PR
- Does not approve — human approves and merges

### 🔲 Agent Comms

After a PR is merged to `main`:
- Updates `CHANGELOG.md` from commit history
- Updates the public roadmap page
- Could be a GitHub Action triggered on merge to `main`

### 🔲 Testing Infrastructure

- Add Vitest for unit and integration tests
- Add test script to `package.json`
- Add test step to CI workflow
- Define minimum coverage threshold before merge

### 🔲 Supabase Migrations Workflow

Currently all schema changes are made via the Supabase SQL Editor UI. To formalise:
- Add `supabase/migrations/` folder to repo
- Version-control all schema changes as `.sql` files
- Document the process for applying migrations

### 🔲 Error Monitoring

- Connect Vercel runtime logs to a structured alerting system
- Auto-create a `type:bug priority:high` GitHub issue when an unhandled error is detected in production

### 🔲 Domain & Environment Setup

- Configure `access.commonparts.org` on Vercel production
- Set up `staging.commonparts.org` as a fixed preview environment
- Manage environment variables cleanly across dev / staging / production

---

## Key Decisions & Rationale

**Why Supabase Edge Functions for triage, not a separate server?**
Zero infrastructure overhead. Triggered directly by the database. Free tier is sufficient for current volume. No latency from polling.

**Why Mistral Small and not a larger model for triage?**
The triage task is classification and light reformulation — not reasoning or generation. Mistral Small handles it in under 3 seconds at a fraction of the cost.

**Why temperature 0.1 for triage?**
Classification tasks benefit from low temperature. We want consistent, deterministic outputs. Creative interpretation is exactly what we want to avoid at this stage.

**Why include the original feedback verbatim in the issue?**
The agent's reformulation is never perfect. Including the source in a collapsible block means the PM agent and human always have access to what the user actually said. It's a structural guarantee, not a workaround.

**Why Claude Project for Agent PM, not a custom app?**
The PM session requires genuine back-and-forth reasoning with the human. A conversation interface is the right medium. No infrastructure, no deployment, immediate to use.

**Why GitHub Copilot agent for Agent Dev, not Claude Code?**
The human's primary editor is VS Code with GitHub Copilot already integrated. Using Copilot agent mode keeps the workflow native, avoids installing a separate CLI tool, and allows direct MCP connections to GitHub, Supabase, and Vercel from the same interface.

**Why squash merge only on `main`?**
One commit per feature or fix. `main`'s history stays readable. Changelogs can be generated cleanly. Agents reading commit history get unambiguous signals.

**Why 0 required approvals on PRs?**
The project is solo. The goal of PR protection is not human review — it's forcing the CI pipeline to run before anything reaches `main`. The human reviews and merges manually anyway.

---

## File Structure Reference

```
/
├── .github/
│   ├── agents/
│   │   └── dev.agent.md            # Agent Dev instructions (read by Copilot)
│   └── workflows/
│       └── ci.yml                  # Lint + type check
├── .husky/
│   ├── commit-msg                  # Commitlint hook
│   └── pre-push                    # Block direct push to main/staging
├── supabase/
│   └── functions/
│       └── triage-feedback/
│           └── index.ts            # Agent Triage edge function
├── docs/
│   └── DEV_STRATEGY.md             # This document
├── app/
│   └── layout.tsx                  # FeedbackButton mounted here
├── components/
│   └── feedback/
│       ├── feedback-form.tsx       # Feedback form component
│       └── feedback-button.tsx     # Floating button
└── commitlint.config.mjs           # Commit convention config
```
