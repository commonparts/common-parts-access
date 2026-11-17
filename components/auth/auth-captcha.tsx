"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";

interface Turnstile {
  render(element: HTMLElement, options: {
    sitekey: string;
    language: string;
    size: "flexible";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => boolean;
  }): string;
  remove(widgetId: string): void;
}

interface Props {
  siteKey: string;
  onToken: (token: string | undefined) => void;
}

export function AuthCaptcha({ siteKey, onToken }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const locale = useLocale();
  const t = useTranslations("AuthErrors");

  useEffect(() => {
    const { turnstile } = window as Window & { turnstile?: Turnstile };
    if (!ready || !turnstile || !container.current) return;
    const widgetId = turnstile.render(container.current, {
      sitekey: siteKey,
      language: locale,
      size: "flexible",
      callback: (token) => {
        setFailed(false);
        onToken(token);
      },
      "expired-callback": () => onToken(undefined),
      "error-callback": () => {
        onToken(undefined);
        setFailed(true);
        return true;
      },
    });
    return () => turnstile.remove(widgetId);
  }, [locale, onToken, ready, siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={container} />
      {failed && <p role="alert" className="text-sm text-status-errorText">{t("captcha")}</p>}
    </>
  );
}
