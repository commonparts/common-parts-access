// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider, type Locale } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/[locale]/page";
import ForgotPasswordPage from "@/app/[locale]/(auth)/forgot-password/page";
import UpdatePasswordPage from "@/app/[locale]/(auth)/update-password/page";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const { replace, resetPasswordForEmail } = vi.hoisted(() => ({
  replace: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ replace }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}));
vi.mock("@/components/layout/navbar", () => ({ default: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("@/components/layout/hero", () => ({ Hero: () => null }));
vi.mock("@/components/part/featured-parts", () => ({ FeaturedParts: () => null }));

let container: HTMLDivElement;
let root: Root;

async function render(page: React.JSX.Element, locale: Locale): Promise<void> {
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en}>
        {page}
      </NextIntlClientProvider>,
    );
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  replace.mockClear();
  resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("password reset links", () => {
  const denial = "error=access_denied&error_code=otp_expired&error_description=Untrusted";

  it.each([
    [Home, "fr", `/fr?${denial}#${denial}`],
    [Home, "en", `/en#${denial}`],
    [UpdatePasswordPage, "en", `/en/update-password?${denial}`],
    [UpdatePasswordPage, "fr", `/fr/update-password#${denial}`],
  ] as const)("routes %s in %s from %s to the retry form", async (Page, locale, path) => {
    window.history.replaceState(null, "", path);
    await render(<Page />, locale);

    expect(replace).toHaveBeenCalledExactlyOnceWith(
      `/${locale}/forgot-password?error=password-reset-link`,
    );
  });

  it.each([
    [Home, "/en"],
    [Home, "/en?error=access_denied&error_code=unknown"],
    [Home, "/en?error=confirmation"],
    [UpdatePasswordPage, "/en/update-password?code=valid-recovery-code"],
    [UpdatePasswordPage, "/en/update-password#access_token=valid-recovery-token&type=recovery"],
  ] as const)("leaves %s at %s", async (Page, path) => {
    window.history.replaceState(null, "", path);
    await render(<Page />, "en");

    expect(replace).not.toHaveBeenCalled();
  });

  it.each(["fr", "en"] as const)("offers to send a new link in %s", async (locale) => {
    window.history.replaceState(null, "", `/${locale}/forgot-password?error=password-reset-link`);
    const messages = (locale === "fr" ? fr : en).ForgotPasswordForm;
    await render(await ForgotPasswordPage({
      searchParams: Promise.resolve({ error: "password-reset-link" }),
    }), locale);

    expect(container.textContent).toContain(messages.rejectedLinkTitle);
    expect(container.querySelector("button")?.textContent).toBe(messages.resend);

    const email = container.querySelector("input");
    if (!email) throw new Error("Expected an email input");
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setValue?.call(email, "visitor@example.test");
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("form")?.requestSubmit();
    });

    expect(resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith("visitor@example.test", {
      redirectTo: `${window.location.origin}/update-password`,
    });
    expect(container.textContent).toContain(messages.sentTitle);
  });

  it("keeps the standard request form for a direct visit", async () => {
    window.history.replaceState(null, "", "/en/forgot-password");
    await render(await ForgotPasswordPage({ searchParams: Promise.resolve({}) }), "en");

    expect(container.textContent).toContain(en.ForgotPasswordForm.title);
    expect(container.textContent).not.toContain(en.ForgotPasswordForm.rejectedLinkTitle);
  });
});
