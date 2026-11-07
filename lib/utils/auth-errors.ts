/**
 * Errors of the auth flows, as message keys (#500): Supabase Auth answers in
 * English, so the forms show the `AuthErrors` message of its error code.
 */

/** `error` query value the email confirmation callback sends to /error. */
export const CONFIRMATION_ERROR = 'confirmation'

/** Supabase Auth error codes the forms explain, and their `AuthErrors` message. */
const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'userExists',
  email_exists: 'userExists',
  username_taken: 'usernameTaken',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  email_address_invalid: 'invalidEmail',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
} as const

export type AuthErrorKey = (typeof AUTH_ERROR_MESSAGES)[keyof typeof AUTH_ERROR_MESSAGES] | 'generic'

/** The `AuthErrors` message of an auth failure, from its `code`; `generic` for any other. */
export function authErrorKey(error: unknown): AuthErrorKey {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  return typeof code === 'string' && Object.hasOwn(AUTH_ERROR_MESSAGES, code)
    ? AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES]
    : 'generic'
}
