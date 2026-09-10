import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render(element: HTMLElement, options: { sitekey: string; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void }): string; remove(widgetId: string): void };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Human verification could not load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function TurnstileWidget({ onToken }: { onToken(token: string): void }) {
  const container = useRef<HTMLDivElement>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  useEffect(() => {
    if (!siteKey || !container.current) { if (import.meta.env.DEV) onToken("local-development"); return; }
    let widgetId: string | null = null;
    void loadTurnstile().then(() => {
      if (container.current && window.turnstile) widgetId = window.turnstile.render(container.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    });
    return () => { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); };
  }, [onToken, siteKey]);
  if (!siteKey && import.meta.env.PROD) return <p className="text-xs text-ctp-red">Password sign-in needs Turnstile configuration.</p>;
  return <div ref={container} />;
}
