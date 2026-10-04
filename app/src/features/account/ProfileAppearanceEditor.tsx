import { useState } from "react";
import { PROFILE_ELEMENTS, type Card, type ProfileShowcase } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import CardResult from "../../components/CardResult";
import ElementIcon from "../../components/ElementIcon";
import DisclosureChevron from "../../components/DisclosureChevron";
import { profileAppearanceStyle } from "../../lib/elementAppearance";

export default function ProfileAppearanceEditor({ draft, catalog, onChange }: { draft: ProfileShowcase; catalog?: Card[]; onChange: (value: ProfileShowcase) => void }) {
  const [query, setQuery] = useState("");
  const matches = query.trim() ? (catalog ?? []).filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12) : [];
  return <details className="group mt-4 rounded-xl border border-ctp-surface1 p-3">
    <summary className="flex min-h-control cursor-pointer list-none items-center justify-between font-semibold">Appearance<DisclosureChevron className="group-open:rotate-180" /></summary>
    <fieldset><legend className="mt-3 text-sm">Element theme</legend><div className="mt-2 grid grid-cols-2 gap-2">
      <label className="flex min-h-control items-center gap-2 rounded-lg border border-ctp-surface1 px-3"><input type="radio" name="profile-element" checked={!draft.element} onChange={() => onChange({ ...draft, element: undefined })} />Default</label>
      {PROFILE_ELEMENTS.map(element => <label key={element} style={profileAppearanceStyle(element)} className={`identity-surface flex min-h-control cursor-pointer items-center gap-2 rounded-lg border px-2 text-sm ${draft.element === element ? "border-ctp-text" : "border-ctp-surface1"}`}><input type="radio" name="profile-element" checked={draft.element === element} onChange={() => onChange({ ...draft, element })} /><span aria-hidden="true"><ElementIcon element={element} size={20} /></span>{element[0] + element.slice(1).toLowerCase()}</label>)}
    </div></fieldset>
    <label className="mt-5 block text-sm">Profile portrait<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a champion or card" className="mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>
    <p className="mt-2 text-xs text-ctp-subtext1">Choose any catalog card. Your portrait is separate from your six favorite cards.</p>
    {draft.portraitCardId && <Button className="mt-2" onClick={() => onChange({ ...draft, portraitCardId: undefined })}>Remove portrait</Button>}
    {query.trim() && <><p className="mt-2 text-sm" role="status">{!catalog ? "Loading cards…" : matches.length ? "Showing up to 12 cards. Refine your search for more." : "No matching cards."}</p><div className="mt-3 grid grid-cols-2 gap-3">{matches.map(card => <CardResult key={card.uuid} card={card} name={card.name} selected={draft.portraitCardId === card.uuid} onSelect={() => onChange({ ...draft, portraitCardId: card.uuid })} />)}</div></>}
  </details>;
}
