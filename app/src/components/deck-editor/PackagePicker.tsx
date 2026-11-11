import { useEffect, useState } from "react";
import type { Card, EditorialPackage, SharedPackage } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { packageAdditions, editDeck, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import EditorialPackageCards from "../../features/packages/EditorialPackageCards";
import DialogSheet from "../ui/DialogSheet";
import Button from "../ui/Button";

export default function PackagePicker({ deck, catalog, onEdit }: { deck: EditableDeck; catalog: Map<string, Card>; onEdit: (edit: DeckEdit) => void }) {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Add package</Button>{open && <PackageSheet deck={deck} catalog={catalog} onEdit={onEdit} onDismiss={() => setOpen(false)} />}</>;
}
function PackageSheet({ deck, catalog, onEdit, onDismiss }: { deck: EditableDeck; catalog: Map<string, Card>; onEdit: (edit: DeckEdit) => void; onDismiss: () => void }) {
  const [packages, setPackages] = useState<EditorialPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void accountApi.publishedPackages().then(result => { if (active) setPackages(result.packages); }).catch(() => { if (active) setError("Packages could not load."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const matches = packages.filter(({ definition }) => [definition.name, definition.champion ?? "", ...definition.cards.map(card => card.name)].some(text => text.toLowerCase().includes(query.trim().toLowerCase())));
  function add(definition: SharedPackage) {
    const additions = packageAdditions(deck, definition.cards);
    const edit: DeckEdit = { type: "add-many", additions };
    if (editDeck(deck, edit, catalog) === deck) { setError("This package contains cards that cannot be added to their listed sections."); return; }
    onEdit(edit); onDismiss();
  }
  return <DialogSheet title="Add package" onDismiss={onDismiss}>
    <label className="grid gap-1">Search packages<input className="min-h-12 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {loading && <p role="status">Loading packages…</p>}
    {error && <div role="alert">{error}<Button onClick={() => setAttempt(value => value + 1)}>Retry</Button></div>}
    {!loading && !error && !matches.length && <p className="py-4">{packages.length ? "No matching packages." : "No published packages yet."}</p>}
    {matches.map(pkg => <section key={pkg.id} className="my-4 rounded-xl border border-ctp-surface1 p-3"><h3 className="break-words font-semibold">{pkg.definition.name}</h3><p className="text-sm text-ctp-subtext1">Exact card list</p><EditorialPackageCards definition={pkg.definition} /><Button variant="primary" disabled={!packageAdditions(deck, pkg.definition.cards).length} onClick={() => add(pkg.definition)}>{packageAdditions(deck, pkg.definition.cards).length ? `Add ${pkg.definition.name}` : "Already in deck"}</Button></section>)}
  </DialogSheet>;
}
