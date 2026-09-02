import { useEffect, useRef, useState } from "react";
import { accountApi } from "../../lib/accountApi";
import { InlineState } from "../../components/ui/ContentState";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize(config: { client_id: string; nonce: string; callback: (response: { credential: string }) => void }): void; renderButton(parent: HTMLElement, options: Record<string, unknown>): void } } };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGoogleIdentity(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in could not be loaded"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleSignInButton({ onCredential }: { onCredential: (credential: string, nonce: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const credentialHandler = useRef(onCredential);
  credentialHandler.current = onCredential;
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !container.current) return;
    let active = true;
    void Promise.all([loadGoogleIdentity(), accountApi.googleNonce()]).then(([, { nonce }]) => {
      if (!active || !container.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, nonce, callback: (value) => credentialHandler.current(value.credential, nonce) });
      window.google.accounts.id.renderButton(container.current, { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" });
    }).catch((reason: Error) => setError(reason.message));
    return () => { active = false; };
  }, [clientId]);

  if (!clientId) return <p className="text-sm text-ctp-yellow">Google sign-in needs VITE_GOOGLE_CLIENT_ID configuration.</p>;
  return <div>{error && <InlineState tone="danger" className="mb-2 text-sm">{error}</InlineState>}<div ref={container} /></div>;
}
