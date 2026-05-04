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
[ Agent QA ] — GitHub Copilot code review (automatic on every PR)
        ↓ inline comments + summary, never approves
        ↓
[ Agent Docs ] — GitHub Action + Mistral Medium
        ↓ generates release notes, creates GitHub Release, updates CHANGELOG.md
        ↓ analyses diff → opens PR toward dev with doc updates if needed
        ↓ PR requires human validation before merge
        ↓
CI/CD Pipeline (GitHub Actions → Vercel)
        ↓
[ You ] — review, merge to staging, validate, merge to main
```

**Automation level by layer:**

| Layer | Mode | Tool |
|---|---|---|
| Feedback triage | Fully automatic | Supabase Edge Function + Mistral Small |
| GitHub issue creation | Fully automatic | GitHub API via Edge Function |
| PM prioritisation | Semi-automatic (human validates) | Claude Project in Claude.ai |
| Dev (bugs & features) | Dialogue — agent proposes, human validates | GitHub Copilot agent in VS Code |
| QA review | Fully automatic on every PR | GitHub Copilot code review |
| Merge to staging/main | Always manual | Human |
| Docs & changelog | Semi-automatic (release notes fully auto, doc updates via PR) | GitHub Action + Mistral Medium |

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

Tests will be added when the MVP stabilises (Vitest, to be configured).

### Vercel Environments

| Branch | Environment | URL |
|---|---|---|
| `main` | Production | `access.commonparts.org` (future) |
| `staging` | Preview (fixed) | `staging-common-parts.vercel.app` |
| `dev` + feature branches | Preview (auto) | Generated per push |

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
6. CI runs automatically (tsc + lint)
7. Copilot code review runs automatically
8. Human reads findings, asks Agent Dev to fix blocking issues
9. Agent Dev pushes fixes — CI and Copilot re-run
10. Human merges feature/issue-xxx → dev  (squash)
         ↓
11. Vercel deploys dev preview automatically
12. When ready: open PR dev → staging
13. CI + Copilot review run on the PR
14. Human merges dev → staging  (squash)
         ↓
15. Vercel deploys staging automatically
16. Human runs staging validation checklist (see below)
17. When validated: open PR staging → main
18. CI + Copilot review run on the PR
19. Human merges staging → main  (squash)
         ↓
20. Vercel deploys production automatically
```

### Staging Validation Checklist

Before merging `staging` → `main`, run through every item below.
This is the only gate between staging and production.

**Deploy**
- [ ] Vercel staging deploy is green (no build errors)
- [ ] No errors in Vercel runtime logs on staging
- [ ] No errors in Supabase logs (auth, API, edge functions)

**Feedback pipeline**
- [ ] Feedback widget submits correctly from the staging URL
- [ ] Triage agent creates a GitHub issue within 5 seconds
- [ ] Issue has correct type, priority, and agent labels
- [ ] `feedback` row is updated with `github_issue_url` and `github_issue_number`

**Core flows**
- [ ] Sign up and login work correctly
- [ ] Model browse page loads without errors
- [ ] Model detail page loads for a published model
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

**Tool:** GitHub Copilot agent mode in VS Code
**Trigger:** On-demand — human opens a session in VS Code and assigns an issue
**Interface:** Chat panel in VS Code, directly in the codebase

**MCP servers connected:**
- **GitHub MCP** — reads issues, checks existing PRs, opens PRs
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

### Agent Docs

**Tool:** GitHub Actions workflow (`.github/workflows/docs.yml`)
**Model:** Mistral Medium (`mistral-medium-latest`) via Mistral API
**Trigger:** Automatic on every push to `main` (i.e. after every human-approved merge)
**Instructions file:** `.github/agents/docs.agent.md`

**What it does — always:**
- Determines the next semver tag from commits since the last tag (`feat(` → minor bump, anything else → patch bump)
- Generates a release note in plain English describing what changed and why
- Creates a GitHub Release with the generated note
- Prepends a new entry to `CHANGELOG.md` and commits it directly to `main`

**What it does — conditionally:**
- Reads the diff of the merge, scoped to `docs/`, `.github/agents/`, `.github/workflows/`, `.github/copilot-instructions.md`, and `supabase/`
- Decides whether any documentation file needs updating (new agent, schema change, new convention, file structure change, etc.)
- If yes: opens a PR toward `dev` with the proposed documentation changes
- If no: does nothing beyond the release note

**What it never does:**
- Modifies application code
- Pushes doc changes directly to `main` or `staging` — always via PR toward `dev`
- Invents facts not visible in the diff
- Merges its own PRs

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

- GitHub Copilot agent mode in VS Code
- Instructions in `.github/agents/dev.agent.md`
- Connected to GitHub, Supabase, and Vercel via MCP
- Dialogue mode: proposes approach → human validates → implements → opens PR
- Reads issues directly via GitHub MCP

### ✅ Agent QA

- GitHub Copilot code review with agentic architecture
- Automatic on every PR — no setup required per PR
- Custom instructions in `.github/copilot-instructions.md`
- Checks: security, logic, conventions, performance, maintainability
- Reports inline comments + summary on every PR

### ✅ Agent Docs

- GitHub Action: `docs.yml` — triggered on every push to `main`
- Automatic semver tagging: `feat(` → minor bump, anything else → patch bump
- Claude-generated release notes committed as GitHub Releases
- `CHANGELOG.md` auto-updated on every release
- Diff analysis on `docs/` + `.github/agents/` — opens PR toward `dev` when documentation is impacted
- Doc PRs labelled `type:docs`, `priority:low`, `agent:pm` — always require human approval

---

## What Remains to Build

### 🔲 Page `/roadmap` on the site

A public-facing roadmap page at `access.commonparts.org/roadmap`. To be built and maintained by the agents after the PM session produces a structured backlog.

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

**Why GitHub Copilot agent for Agent Dev?**
Native to the human's existing VS Code + Copilot workflow. MCP connections to GitHub, Supabase, and Vercel provide the context an agent needs without additional tooling.

**Why Copilot code review for Agent QA?**
Native to GitHub, agentic architecture since March 2026, configurable via a single instructions file, automatic on every PR. Zero infrastructure to maintain.

**Why squash merge only on `main` and `staging`?**
One commit per feature on the main branches. History stays readable. Changelogs can be generated cleanly.

**Why 0 required approvals on PRs?**
Solo project. The goal of PR protection is forcing CI + Copilot review to run. The human reviews and merges manually anyway.

---

## File Structure Reference

```
/
├── .github/
│   ├── agents/
│   │   ├── dev.agent.md            # Agent Dev instructions
│   │   └── docs.agent.md           # Agent Docs instructions
│   ├── copilot-instructions.md     # Agent QA instructions (Copilot review)
│   └── workflows/
│       ├── ci.yml                  # Lint + type check
│       └── docs.yml                # Agent Docs — releases + doc updates
├── CHANGELOG.md                    # Generated and maintained by Agent Docs
├── .husky/
│   ├── commit-msg                  # Commitlint hook
│   └── pre-push                    # Block direct push to main/staging
├── supabase/
│   └── functions/
│       └── triage-feedback/
│           └── index.ts            # Agent Triage edge function
├── docs/
│   └── DEV_STRATEGY.md             # This document
├── lib/
│   └── supabase/
│       └── queries/
│           └── feedback.ts         # Feedback query layer
├── app/
│   └── layout.tsx                  # FeedbackButton mounted here
├── components/
│   └── feedback/
│       ├── feedback-form.tsx       # Feedback form component
│       └── feedback-button.tsx     # Floating button
└── commitlint.config.mjs           # Commit convention config
```
