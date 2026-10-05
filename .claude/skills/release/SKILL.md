---
name: release
description: Promotion and release procedure for Common Parts Access. Use when asked to promote dev to staging, open or merge a release PR from staging to main, write release notes, check the documentation before a release, or publish a version (for example "passe dev en staging", "ouvre une PR vers main", "promote dev", "release").
---

# Release — promotion and release notes

Branch flow: feature branches → `dev` (squash) → `staging` (merge commit) → `main` (merge commit). Railway deploys `staging` and `main` automatically on push. There is a single Supabase database behind every environment, so a promotion never carries a migration step.

A promotion is always a PR. Open it, keep it green, and merge it only when the human asks for that merge, with a merge commit, never a squash: a squash would leave `staging` and `main` without `dev`'s history and every later promotion would conflict.

## What is public

The repository is public. PR titles and descriptions, commit messages and GitHub Releases are readable by anyone.

Write promotion PR descriptions and release notes from **commit subjects, PR titles and the diff**. Never copy or paraphrase commit bodies, issue bodies or PR descriptions: they can carry internal context that is not meant for publication. Describe the effect a user or a contributor can observe, not the reason it was needed internally. Re-read every description and release note before publishing it with that rule in mind.

## Promote `dev` to `staging`

1. `git fetch origin`, then list what will be promoted: `git log --oneline --no-merges origin/staging..origin/dev`. If the list is empty, stop and say so.
2. **Documentation check.** Read the full diff, application code included: `git diff origin/staging...origin/dev`. For each behaviour, schema or convention change, check that the documents named in the Documentation section of `CLAUDE.md` describe it. When a document is missing or inaccurate, fix it first through a feature branch and a PR toward `dev` (`docs(scope): ...`), then restart from step 1. When unsure whether a change needs documenting, do not invent content: leave it and mention it to the human.
3. Open the PR `dev` → `staging`.
   - Title: `Promote dev to staging (#a, #b, …)`, listing the PR numbers being promoted.
   - Description: one line per promoted PR, stating its effect, then `No migration.` (or the migration files present in the diff, for information), then `Merge with a merge commit, per docs/DEV_STRATEGY.md.`
4. Wait for CI (`Lint & Type Check`) and the Copilot review. Address findings through PRs toward `dev`: the promotion PR picks them up when they are merged.
5. When the human asks for the merge: merge with a merge commit, then check that the Railway `staging` deployment of the merge commit succeeds.

## Release `staging` to `main`

1. `git fetch origin --tags`, then list the release content: `git log --oneline --no-merges origin/main..origin/staging`.
2. **Version.** The number starts from the highest `v*` tag in the repository; the commits considered are those since the latest `v*` tag reachable from `origin/main` (older tags are not all reachable since a history rewrite). Any of those commit subjects starting with `feat(` bumps the minor version (`v1.2.1` → `v1.3.0`); otherwise bump the patch version. Never bump the major version: that is a human decision. The release workflow computes the version the same way and does not read it from the PR.
3. Open the PR `staging` → `main`.
   - Title: `Release: promote staging to main (#first–#last)`.
   - Description: a summary of the promoted changes grouped by area, `No migration.`, a "Before merging" checklist (Railway staging deploy green, staging validation checklist from `docs/DEV_STRATEGY.md` passed, plus one line per behaviour worth checking by hand), and the release notes between the two markers below. The workflow publishes exactly what is between them.

```markdown
<!-- release-notes:start -->
## What changed

[2–4 sentences: what exists now that did not exist before, or what works now that did not work before. If the release contains only fixes, say so plainly.]

## Changes

- [commit subject, as written]
- [commit subject, as written]

## Technical details

[1–2 sentences on schema, pipeline or convention impact. Omit the section when there is none.]
<!-- release-notes:end -->
```

   Release note style: institutional, precise and calm; English; present tense for states, past tense for changes; no "we", no promotional or emotional wording ("exciting", "enhanced", "improved experience").
4. Wait for CI and the Copilot review. A finding that needs a code change goes through a PR toward `dev` and a new promotion to `staging`; the release PR picks it up. Update the release notes when the content changes.
5. When the human asks for the merge: merge with a merge commit. `.github/workflows/release.yml` then creates the tag and the GitHub Release on the merge commit. Check that the release exists and that the Railway `production` deployment succeeds.

Claude Code sessions cannot create GitHub Releases themselves. If the workflow fails, read its log; the fix is either a rerun of the failed job or a manual run of the `Release` workflow (`workflow_dispatch`) with the number of the merged release PR. If no `Release` run appears after the merge, go straight to that manual run.

## Release workflow behaviour

- Runs when a PR from `staging` into `main` is merged, or manually.
- Computes the version from commit subjects, as in step 2 above, and fails if that tag already exists.
- Publishes the release notes found between the markers in the PR description. Without a complete start/end pair, it publishes a minimal note listing the commit subjects only, never their bodies.
- A manual run requires the number of a merged `staging` → `main` PR and releases that PR's merge commit.
