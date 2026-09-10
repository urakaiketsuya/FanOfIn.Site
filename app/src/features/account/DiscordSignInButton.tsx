import { useState } from "react";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import { accountApi } from "../../lib/accountApi";

export default function DiscordSignInButton({ purpose = "sign-in", disabled = false }: { purpose?: "sign-in" | "link"; disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  return <div data-component="DiscordSignInButton">
    <Button
      type="button"
      variant="secondary"
      disabled={disabled || starting}
      onClick={() => {
        setStarting(true); setError(null);
        void accountApi.discordStart(purpose)
          .then(({ url }) => { window.location.assign(url); })
          .catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : "Discord sign-in could not be started"); setStarting(false); });
      }}
      className="border-[#5865f2] text-[#aeb7ff] hover:border-[#7983f5]"
    >
      {starting ? "Opening Discord…" : purpose === "link" ? "Connect Discord" : "Continue with Discord"}
    </Button>
    {error && <InlineState tone="danger" className="mt-2 text-sm">{error}</InlineState>}
  </div>;
}
