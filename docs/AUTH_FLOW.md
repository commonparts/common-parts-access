# Sign-in and sessions

Common Parts uses six-digit email codes through Supabase Auth for sign-in and sign-up. An existing member signs in with the same email address and keeps their account, profile and parts. During sign-up, the database trigger creates a profile with a generated username. The app saves the chosen username after email verification, so a visitor can correct their email address before verification and keep their choice. If the name becomes unavailable in the meantime, the visitor can choose another without requesting a new code. Only sign-up can create accounts. The login form shows the same inbox instructions for known and unknown addresses.

After checking the code, Supabase writes the session cookies. The form uses `window.location.replace` to load the requested page with a fresh navbar and route cache (#110, #112). Code requests go directly from the browser to Supabase, which applies its rate limits without putting all users behind the application's server IP.

## Protected routes and redirects

`proxy.ts` calls `updateSession` before locale routing, refreshing the session and checking the user with `getUser()`. In each locale, `/publish`, `/dashboard`, `/downloads`, `/my-parts`, `/notifications` and `/settings` require a user. A signed-out visitor goes to `/<locale>/login?redirect=<pathname>`; only the pathname is preserved. API routes use the server client and check authorization separately.

The login and sign-up forms preserve a valid `redirect` when switching between them. `parseRedirectParam` and `isSafeRedirect` only accept same-site paths and reject absolute or protocol-relative URLs, whitespace, backslashes and control characters, including after URL decoding. The fallback is `/`, which resolves to the visitor's locale. The previous `/sign-up-success` page sends visitors to sign-in so they can request a fresh code and keep their destination.

## Session policy

- Use the Supabase session defaults with no inactivity timeout or fixed session age. Keep refresh token rotation enabled and the access token at its existing short lifetime (Supabase default: one hour).
- `@supabase/ssr` writes persistent `sb-*` cookies with a 400-day browser lifetime and `SameSite=Lax`. The app sets `Secure` in production for sign-in and refresh. Browser Supabase clients need to read these cookies, so they are not `HttpOnly`; changing that requires moving all authenticated browser access to the server.
- Regular sign-out revokes the current session. **Sign out on all devices** under Settings revokes every refresh session. Already issued access tokens can remain valid until their short expiry.
- This change does not grant privileges or implement MFA. X11 tracks requiring `aal2` for future curator and admin actions separately.

## Staging and rollout

1. Use an isolated Supabase project or branch for the preview. Check that it is not pointed at production before changing Auth settings. Keep email authentication and confirmation enabled.
2. In Supabase Auth, paste [sign-in-code.html](../supabase/templates/sign-in-code.html) into the **Magic Link** template body. **Confirm signup** can keep its existing template if it already displays `{{ .Token }}`. The local stack uses [email-code.html](../supabase/templates/email-code.html) for signup. Set the email code length to six, expiry to 900 seconds and minimum send interval to 60 seconds. Apply these values separately to hosted projects. The code emails contain no sign-in link for email scanners to open.
3. Verify Brevo SMTP, then test delivery to Gmail, Outlook and iCloud. The verification step must receive and accept the code for both an existing account and a new account. Check the email-send and verification limits against the Brevo quota before rollout.
4. Keep the hosted session defaults and refresh token rotation enabled. Verify cookie attributes on both an OTP sign-in and a server refresh over HTTPS.
5. On the isolated environment, apply the migration and select `public.reject_password_sessions` as the **Custom Access Token** hook. It refuses new password sessions without deleting credentials, and preserves the claims for OTP and refresh. Check for an existing hook before selecting it; if one exists, integrate this check into it. Confirm new sessions with an old password are refused, and existing members can sign in with a code. Only activate this hook on the hosted production project once the replacement app and emails work there. Disabling the hook can restore the password grant during rollback; restore the old app and email templates together. Permanent removal of historical password hashes is a separate, irreversible operation.

## Manual QA checklist

- [ ] As an existing member, visit `/fr/publish` while signed out. Request a code and sign in: the app returns to `/fr/publish`, with the signed-in navbar and the same account. Repeat in English.
- [ ] Start sign-up with a username and a mistyped email. Correct the address, verify the code and check that the profile has the chosen username. Repeat with a duplicate username, an expired code, and a resend.
- [ ] A missing email account at login shows the same instructions without creating an account.
- [ ] With an external or encoded unsafe `redirect`, a successful sign-in lands on the home page.
- [ ] Close the browser after sign-in and reopen it the next day: a protected page opens without asking for a new code. Verify session refresh after the access token expires.
- [ ] Sign in on two devices. A normal sign-out ends only one session. “Sign out on all devices” ends both as their access tokens expire.
