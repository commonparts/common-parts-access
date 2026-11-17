# Sign-in and Post-login Redirect

## Overview
This document describes how a visitor reaches a protected page, signs in, and returns to the page they asked for. Authentication uses Supabase Auth with email and password; the session is stored in `sb-*` cookies managed by `@supabase/ssr`.

## Protected routes
`proxy.ts` runs `updateSession` (`lib/supabase/middleware.ts`) on every page request, then the locale routing (see [I18N.md](./I18N.md#request-pipeline)). API routes are outside the proxy matcher and refresh the session through the server client. `updateSession` refreshes the session with `supabase.auth.getUser()` and protects the routes listed in `PROTECTED_ROUTE_PREFIXES`: `/publish`, `/dashboard`, `/downloads`, `/my-parts`, `/notifications`, `/settings` (each prefix and its sub-paths), under a locale prefix (`/fr/publish`, `/en/settings/profile`). An unprefixed URL is first redirected to its prefixed URL by the locale routing, then checked.

An unauthenticated request to a protected route is redirected to the login page of the same locale, `/<locale>/login?redirect=<pathname>`, the pathname including its prefix. Only the pathname is kept: the original query string is dropped so protected-route parameters do not end up in the login URL, browser history or logs. Refreshed or cleared auth cookies are copied onto the redirect response.

Other entry points build the same URL from the client, for example a like on a part page that returns `401` (`components/part/part-details.tsx`).

## The `redirect` parameter
`parseRedirectParam` (`lib/utils/validation.ts`) reads the parameter and returns it only when `isSafeRedirect` accepts it; otherwise it returns `null` and the caller uses its default destination. `isSafeRedirect` accepts only a relative in-app path that starts with a single `/` and contains no whitespace, backslash or control character, checked both as written and after percent-decoding. This rejects absolute URLs, protocol-relative URLs (`//host`) and encoded bypasses such as `/%5c%5chost`.

The login and sign-up forms pass a validated `redirect` to each other through their cross-links, so it survives a switch between the two forms.

## Sign-in
`components/auth/login-form.tsx` signs in from the browser with `signInWithPassword` (`lib/supabase/queries/auth.client.ts`). On success it navigates with `window.location.replace` to the validated `redirect`, or to `/` when there is none. On failure it shows the error and re-enables the form; on success the button keeps its loading state until the next page loads. The auth forms show the message of the Supabase Auth error code in the locale of the page (`authErrorKey()`, see [I18N.md](./I18N.md#auth-errors-and-emails)).

### Why a full document navigation (#110, #112)
A soft navigation (`router.push`, with or without `router.refresh`) sent users back to `/login` after a successful sign-in (#110). Before sign-in, the client holds state built for an anonymous visitor: server-rendered layouts such as the navbar, the App Router cache, and routes prefetched while signed out. A full document load discards that state and renders every segment with the new session cookie. Its cost is one document load per sign-in.

`replace` is used instead of assigning `window.location.href` so `/login` is not kept in the history: the back button does not return to the login form.

A server-side sign-in handler that sets the cookies and answers with a redirect was considered and not adopted (#112). Supabase Auth rate-limits sign-in requests by client IP address; requests sent from the server would all share the server's address, so a burst of failed attempts would block sign-in for every user. Avoiding this requires forwarding the end-user IP in the `Sb-Forwarded-For` header with a secret API key and enabling IP address forwarding in the Supabase project, which the gain of one document load does not justify.

## Sign-up and email confirmation
The form checks the hosted Auth password rules as the user types: at least eight characters and one lowercase letter, uppercase letter, digit and supported symbol. Supabase enforces the account policy when the form is submitted.

After sign-up, `/sign-up-success` accepts a six-digit code from the confirmation email (#542). The sign-up form hands the email to the confirmation page in memory. A visitor can also enter the email manually or reopen the confirmation page after a sign-in attempt with an unconfirmed address. The optional `redirect` travels to the confirmation page and is validated there. The browser calls Supabase Auth directly to preserve its per-IP rate limits and uses a full navigation to the safe destination or `/` once Supabase returns a session. Supabase handles code expiry, single use and the resend limits.

Sign-up and resend require no Supabase Auth redirect URL. An unconfirmed user who received a link before the switch can request a code from the confirmation page.

### Confirmation email rollout (#542)

1. Verify the flow on an isolated Supabase stack. The local CLI config enables email confirmation and uses [the signup template](../supabase/templates/signup-confirmation.html). Read the emails in Mailpit. Use the subject from `[auth.email.template.confirmation]` in [config.toml](../supabase/config.toml).
2. Prepare the versioned **Confirm signup** subject and HTML in Supabase and check that email OTPs have six digits. Save the current subject and body for rollback. Staging and production share the hosted template.
3. Deploy the confirmation page to production, then publish the prepared template in the same release. The previous confirmation links stop working when the new code goes live. For a rollback, restore the previous application release and the previous template together.
4. Verify one sign-up in each language, opening the email on a second device and entering the code on the first. Check that a valid code opens the requested protected page, that a wrong, expired or used code leaves a fresh browser signed out, and that resend works after the provider's wait period.

## Password reset

`/forgot-password` requests a reset email through Supabase Auth with `/update-password` as the return path. The home and password update pages check the query string and the browser fragment for `error=access_denied` and `error_code=otp_expired`. When either contains both codes, the visitor is redirected to `/forgot-password?error=password-reset-link` in the active locale. The form explains that the link expired or is invalid and lets the visitor request a new one.

## Manual QA checklist
Run on a preview or staging deployment after any change to the login form, the proxy, or the redirect helpers.

- [ ] Signed out, open `/en/publish`: the browser lands on `/en/login?redirect=%2Fen%2Fpublish`. Repeat with `/fr/publish`.
- [ ] Sign in with valid credentials: the browser lands on `/en/publish`, signed in, with no second visit to `/login`.
- [ ] On `/en/publish` after sign-in, press back: the browser does not return to the login form.
- [ ] The navbar shows the profile menu, not "Sign in", right after the redirect.
- [ ] Repeat with `/dashboard` and `/my-parts`.
- [ ] Open `/en/login` directly and sign in: the browser lands on `/`, which redirects to `/en`.
- [ ] Sign in with a wrong password: an error is shown, the form is usable again, the URL is unchanged.
- [ ] Open `/login?redirect=//evil.com`, `/login?redirect=https://evil.com` and `/login?redirect=/%5c%5cevil.com`, then sign in: the browser lands on `/` each time.
- [ ] From `/login?redirect=%2Fpublish`, follow "Sign up": the sign-up URL keeps `redirect=%2Fpublish`.

The redirect validation is covered by unit tests in `lib/utils/validation.test.ts`.
