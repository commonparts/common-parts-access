let pendingEmail = "";

/** Hand the address to the next page during client navigation. */
export function takePendingSignUpEmail(): string {
  const email = pendingEmail;
  pendingEmail = "";
  return email;
}

export function setPendingSignUpEmail(email: string): void {
  pendingEmail = email;
}

export function signUpConfirmationPath(redirectPath: string | null): string {
  return redirectPath
    ? `/sign-up-success?redirect=${encodeURIComponent(redirectPath)}`
    : "/sign-up-success";
}
