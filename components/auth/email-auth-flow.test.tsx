// @vitest-environment jsdom
import { act, type AnchorHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import fr from "@/messages/fr.json";

const { signInWithOtp, verifyOtp, checkUsernameAvailability, searchParams } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  checkUsernameAvailability: vi.fn(),
  searchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams: searchParams }));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp, verifyOtp } }),
}));
vi.mock("@/lib/supabase/queries/users", () => ({ checkUsernameAvailability }));

describe("email authentication", () => {
  let container: HTMLElement;
  let root: Root;

  async function renderForm(mode: "login" | "sign-up") {
    await act(async () => root.render(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <EmailAuthForm mode={mode} />
      </NextIntlClientProvider>,
    ));
  }

  async function type(id: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`Missing ${id}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function submit() {
    await act(async () => container.querySelector("form")?.requestSubmit());
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    searchParams.mockReturnValue(new URLSearchParams("redirect=%2Ffr%2Fpublish"));
    signInWithOtp.mockReset().mockResolvedValue({ error: null });
    verifyOtp.mockReset();
    checkUsernameAvailability.mockReset().mockResolvedValue({ available: true, error: null });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("does not create an account or reveal a missing account at login", async () => {
    signInWithOtp.mockResolvedValue({ error: { code: "otp_disabled" } });
    await renderForm("login");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/sign-up?redirect=%2Ffr%2Fpublish");
    await type("email", "qa@example.test");
    await submit();

    expect(signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "qa@example.test",
      options: expect.objectContaining({ shouldCreateUser: false }),
    });
    expect(container.querySelector("[autocomplete=one-time-code]")).not.toBeNull();
    expect(container.querySelector("[role=alert]")).toBeNull();
  });

  it("passes a new account's profile data and allows resending to the same address without signing up again", async () => {
    await renderForm("sign-up");
    expect(container.querySelector("[type=password]")).toBeNull();
    await type("email", "qa@example.test");
    await type("username", "bad name");
    await submit();
    expect(signInWithOtp).not.toHaveBeenCalled();
    await type("username", "qa-541");
    await submit();

    expect(signInWithOtp).toHaveBeenNthCalledWith(1, {
      email: "qa@example.test",
      options: expect.objectContaining({
        shouldCreateUser: true,
        data: { username: "qa-541", locale: "fr" },
      }),
    });

    const resend = [...container.querySelectorAll("button")].find((button) => button.textContent === fr.AuthForms.resend);
    await act(async () => resend?.click());
    expect(signInWithOtp).toHaveBeenNthCalledWith(2, {
      email: "qa@example.test",
      options: expect.objectContaining({ shouldCreateUser: false }),
    });
    expect(checkUsernameAvailability).toHaveBeenCalledExactlyOnceWith("qa-541");
  });

  it("requires six digits and keeps the form usable when Supabase rejects a code", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: { code: "otp_expired" } });
    await renderForm("login");
    await type("email", "qa@example.test");
    await submit();
    await type("email-code", "12345");
    await submit();
    expect(verifyOtp).not.toHaveBeenCalled();

    await type("email-code", "012345");
    await submit();
    expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({
      email: "qa@example.test", token: "012345", type: "email",
    });
    expect(container.querySelector("[role=alert]")?.textContent).toBe(fr.AuthErrors.invalidCode);
    expect(container.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled).toBe(false);
  });
});
