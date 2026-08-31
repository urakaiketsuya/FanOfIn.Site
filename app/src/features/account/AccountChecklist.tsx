import { useState } from "react";
import type { AccountUser, SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";

interface Props {
  user: AccountUser;
  decks: SavedDeck[];
}

export default function AccountChecklist({ user, decks }: Props) {
  const [dismissed, setDismissed] = useState(user.deckChecklistDismissed);
  const [reviewedDisplayName, setReviewedDisplayName] = useState(user.displayNameReviewed);
  const importedDecks = decks.some((deck) => deck.sources.some((source) => source.provider !== "manual"));
  const tasks = [
    { label: "Open your display-name settings", complete: reviewedDisplayName, to: "/account", action: "Open" },
    { label: "Import your public deck history", complete: importedDecks, to: "/my-decks", action: "Import" },
    { label: "Create or save your first deck", complete: decks.length > 0, to: "/my-decks", action: "Add deck" },
  ];
  const remaining = tasks.filter((task) => !task.complete).length;

  if (dismissed || remaining === 0) return null;

  return <section className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-blue/5 p-4" aria-labelledby="account-checklist-title">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="account-checklist-title" className="font-semibold text-ctp-text">Finish setting up your deck library</h2><p className="mt-1 text-xs text-ctp-subtext1">{remaining} optional step{remaining === 1 ? "" : "s"} remaining</p></div>
      <button type="button" onClick={() => { setDismissed(true); void accountApi.updateAccountPreferences({ deckChecklistDismissed: true }).catch(() => setDismissed(false)); }} className="text-xs text-ctp-subtext1 hover:text-ctp-text">Hide</button>
    </div>
    <ul className="mt-3 grid gap-2 sm:grid-cols-3">
      {tasks.map((task) => <li key={task.label} className="flex items-center justify-between gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3 text-sm">
        <span className={task.complete ? "text-ctp-green" : "text-ctp-text"}>{task.complete ? "✓ " : "○ "}{task.label}</span>
        {!task.complete && <Link to={task.to} onClick={() => { if (task.to === "/account") { setReviewedDisplayName(true); void accountApi.updateAccountPreferences({ displayNameReviewed: true }).catch(() => setReviewedDisplayName(false)); } }} className="shrink-0 text-xs text-ctp-blue hover:underline">{task.action}</Link>}
      </li>)}
    </ul>
  </section>;
}
