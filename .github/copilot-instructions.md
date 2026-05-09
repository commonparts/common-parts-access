# Copilot code review instructions — Common Parts Access

When reviewing a pull request in this repository, apply the following checks
in order of priority. Be direct and specific. Reference the exact line and
explain why it is a problem. Do not generate noise — if something is correct,
stay silent on it.

---

## 1. Security — always check, flag everything

- Every API route that writes or reads protected data must call
  `supabase.auth.getUser()` and return 401 if user is null.
  Never use `auth.getSession()` for authorization — it can be spoofed.

- Every API route must validate user inputs before touching the database.
  Flag any insert or update that trusts raw `request.json()` without
  checking type, length, and allowed values.

- Flag any query that uses `select('*')` — always select only the
  columns actually needed.

- Flag any new table that does not have RLS enabled.

- Flag any hardcoded secret, token, API key, or credential in the diff.

- Flag any use of the Supabase service role key in client-facing code.

## 2. Logic and behavior

- Read the PR title and description. Does the implementation solve what
  was described? Flag if the scope is incomplete or misaligned.

- Flag any async function that does not handle error cases — every
  Supabase call must check `error` before using `data`.

- Flag any `console.log` left in production code.

- Flag missing loading or empty states in UI components that fetch data.

## 3. Codebase conventions

- Flag any hardcoded color, hex value, or arbitrary Tailwind spacing
  (e.g. `px-6`, `py-3`, `text-gray-800`) instead of design tokens
  (`px-md`, `py-sm`, `text-text-primary`).

- Flag any new UI element built from scratch instead of using existing
  components from `components/ui/` (Button, Input, Card, Badge, etc.).

- Flag any Supabase query written inline in a component or API route
  instead of extracted to a function in `lib/supabase/queries/`.

- Flag any utility function (validator, formatter, URL helper, slug util,
  or any other general-purpose helper) defined inside a component or API
  route file instead of extracted to the appropriate file under `lib/utils/`.
  Validators belong in `lib/utils/validation.ts`, formatters in
  `lib/utils/formatters.ts`, and so on. The only exception is a one-off
  transformation with zero reuse potential anywhere in the codebase.

- Flag any use of the `any` type in TypeScript.

- Flag any `'use server'` directive — this project uses API routes only,
  never Server Actions.

- Flag any import of `@/lib/supabase/server` inside a file that has
  `'use client'` at the top, or vice versa.

- Flag any direct push pattern toward `main` or `staging` — all changes
  must go through a PR toward `dev`.

## 4. Performance

- Flag any list query without `.limit()` or `.range()` — unbounded
  queries are not acceptable.

- Flag any component that fetches data unconditionally on every render
  without memoization or caching.

## 5. Maintainability

- Flag any magic number that should be a named constant.

- Flag any function longer than 30 lines with no JSDoc comment.

- Flag any `// TODO` comment — these should be GitHub issues, not
  comments left in committed code.

---

## What not to flag

- Style preferences that are not in the conventions above.
- Minor formatting issues already handled by the linter.
- Anything that works correctly and follows the conventions.

The goal is signal, not volume. A review with two real findings
is more useful than one with ten marginal ones.