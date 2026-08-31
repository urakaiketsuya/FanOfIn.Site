import type { OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import { buildDecklistText } from "../events/DecklistView";

export default function UserDecklistPanel({ decklist, actions, children }: { decklist: OmnidexDecklist; actions?: ReactNode; children?: ReactNode }) {
  return <section className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-ctp-text">Decklist</h2>{actions}</div>
    {children ?? <pre className="mt-3 max-h-[42rem] overflow-auto whitespace-pre-wrap rounded-md bg-ctp-base p-4 text-sm text-ctp-subtext1">{buildDecklistText(decklist)}</pre>}
  </section>;
}
