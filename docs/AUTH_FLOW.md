# Sign-in and Post-login Redirect

## Overview
This document describes how a visitor reaches a protected page, signs in, and returns to the page they asked for. Authentication uses Supabase Auth with email and password; the session is stored in `sb-*` cookies managed by `@supabase/ssr`.

## Protected routes
`proxy.ts` runs `updateSession` (`lib/supabase/middleware.ts`) on every request. It refreshes the session with `supabase.auth.getUser()` and protects the routes listed in `PROTECTED_ROUTE_PREFIXES`: `/publish`, `/dashboard`, `/downloads`, `/my-parts`, `/notifications`, `/settings` (each prefix and its sub-paths).

An unauthenticated request to a protected route is redirected to `/login?redirect=<pathname>`. Only the pathname is kept: the original query string is dropped so protected-route parameters do not end up in the login URL, browser history or logs. Refreshed or cleared auth cookies are copied onto the redirect response.

Other entry points build the same URL from the client, for example a like on a part page that returns `401` (`components/part/part-details.tsx`).

## The `redirect` parameter
`parseRedirectParam` (`lib/utils/validation.ts`) reads the parameter and returns it only when `isSafeRedirect` accepts it; otherwise it returns `null` and the caller uses its default destination. `isSafeRedirect` accepts only a relative in-app path that starts with a single `/` and contains no whitespace, backslash or control character, checked both as written and after percent-decoding. This rejects absolute URLs, protocol-relative URLs (`//host`) and encoded bypasses such as `/%5c%5chost`.

The login and sign-up forms pass a validated `redirect` to each other through their cross-links, so it survives a switch between the two forms.

## Sign-in
`components/auth/login-form.tsx` signs in from the browser with `signInWithPassword` (`lib/supabase/queries/auth.client.ts`). On success it navigates with `window.location.replace` to the validated `redirect`, or to `/` when there is none. On failure it shows the error and re-enables the form; on success the button keeps its loading state until the next page loads.

### Why a full document navigation (#110, #112)
A soft navigation (`router.push`, with or without `router.refresh`) sent users back to `/login` after a successful sign-in (#110). Before sign-in, the client holds state built for an anonymous visitor: server-rendered layouts such as the navbar, the App Router cache, and routes prefetched while signed out. A full document load discards that state and renders every segment with the new session cookie. Its cost is one document load per sign-in.

`replace` is used instead of assigning `window.location.href` so `/login` is not kept in the history: the back button does not return to the login form.

A server-side sign-in handler that sets the cookies and answers with a redirect was considered and not adopted (#112). Supabase Auth rate-limits sign-in requests by client IP address; requests sent from the server would all share the server's address, so a burst of failed attempts would block sign-in for every user. Avoiding this requires forwarding the end-user IP in the `Sb-Forwarded-For` header with a secret API key and enabling IP address forwarding in the Supabase project, which the gain of one document load does not justify.

## Sign-up and email confirmation
`components/auth/sign-up-form.tsx` sends the validated `redirect` to Supabase as part of the confirmation link: `/confirm?next=<redirect>`. `app/(auth)/confirm/route.ts` validates `next` again with `isSafeRedirect` on the server, since anyone can request `/confirm` directly, verifies the token and redirects to `next`, or to `/` when it is missing or unsafe.

## Manual QA checklist
Run on a preview or staging deployment after any change to the login form, the proxy, or the redirect helpers.

- [ ] Signed out, open `/publish`: the browser lands on `/login?redirect=%2Fpublish`.
- [ ] Sign in with valid credentials: the browser lands on `/publish`, signed in, with no second visit to `/login`.
- [ ] On `/publish` after sign-in, press back: the browser does not return to the login form.
- [ ] The navbar shows the profile menu, not "Sign in", right after the redirect.
- [ ] Repeat with `/dashboard` and `/my-parts`.
- [ ] Open `/login` directly and sign in: the browser lands on `/`.
- [ ] Sign in with a wrong password: an error is shown, the form is usable again, the URL is unchanged.
- [ ] Open `/login?redirect=//evil.com`, `/login?redirect=https://evil.com` and `/login?redirect=/%5c%5cevil.com`, then sign in: the browser lands on `/` each time.
- [ ] From `/login?redirect=%2Fpublish`, follow "Sign up": the sign-up URL keeps `redirect=%2Fpublish`.

The redirect validation is covered by unit tests in `lib/utils/validation.test.ts`.
