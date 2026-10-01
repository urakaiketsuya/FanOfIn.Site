import { useMemo, useState, useTransition } from "react";
import { comparePackagePools, measurePackageRule, type PackageCandidateFamily, type PackageCandidateEvidence, type PackageReviewRule } from "@gatcg/shared";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useDeckCardIndexData } from "../archetypes/data";
import { approveReviewedPackage } from "../deckbuilder/localPackageApprovals";

export default function PackageFamilyReview({ family, families, candidates }: { family: PackageCandidateFamily; families: PackageCandidateFamily[]; candidates: PackageCandidateEvidence[] }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-4 border-t border-ctp-surface1"><summary className="min-h-12 cursor-pointer py-3 font-semibold text-ctp-teal">Review overlaps and conditions</summary>{open && <PackageRuleEditor family={family} families={families} candidates={candidates} />}</details>;
}

export function PackageRuleEditor({ family, families, candidates, hideRelated = false, packageId }: { family: PackageCandidateFamily; families: PackageCandidateFamily[]; candidates: PackageCandidateEvidence[]; hideRelated?: boolean; packageId?: string }) {
  const data = useDeckCardIndexData();
  const status = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json");
  const base = useMemo<PackageReviewRule>(() => ({ requiredCards: [family.anchorCard, ...family.coreCards], groups: [{ cards: family.optionCards, minimum: family.minOptions }] }), [family]);
  const key = `package-review:${family.anchorCard}:${family.optionCards.join("|")}`;
  const [rule, setRule] = useState<PackageReviewRule>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); if (saved && JSON.stringify(saved.requiredCards) === JSON.stringify(base.requiredCards) && Array.isArray(saved.groups) && saved.groups.every((g: { cards: unknown[]; minimum: number }) => Array.isArray(g.cards) && g.cards.every((c) => typeof c === "string") && Number.isInteger(g.minimum) && g.minimum >= 1)) return saved; } catch { /* Start a fresh draft if storage is unavailable. */ }
    return base;
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const related = families.filter((other) => {
    if (other === family) return false;
    const relationship = comparePackagePools(
      { id: "current", cards: [family.anchorCard, ...family.coreCards, ...family.optionCards] },
      { id: "other", cards: [other.anchorCard, ...other.coreCards, ...other.optionCards] },
    );
    return relationship && relationship.kind !== "loose";
  });
  const choices = [...new Set([...family.optionCards, ...related.flatMap((other) => [other.anchorCard, ...other.coreCards, ...other.optionCards])])].filter((card) => !base.requiredCards.includes(card)).sort();
  const decks = useMemo(() => data?.decks.map((deck) => new Set([...deck.main, ...deck.material].filter(([, quantity]) => quantity > 0).map(([index]) => data.cardNames[index]))), [data]);
  const evidence = useMemo(() => decks ? { base: measurePackageRule(decks, base), draft: measurePackageRule(decks, rule) } : null, [decks, base, rule]);
  const valid = rule.groups.length > 0 && rule.groups.every((group) => group.cards.length >= group.minimum);
  const update = (next: PackageReviewRule) => {
    setSaved(false);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
    startTransition(() => setRule(next));
  };
  const source = family.sourceFindings ?? candidates.filter((candidate) => candidate.anchorCard === family.anchorCard && candidate.memberCards.every((card) => [...family.coreCards, ...family.optionCards].includes(card)));
  return <div className="space-y-4 pb-2 text-sm">
    <p className="text-ctp-subtext1">Requires {base.requiredCards.join(" + ")}. Every group below must be satisfied. Counts refer to distinct card names, not copies. A card listed in multiple groups can satisfy each of them.</p>
    {!hideRelated && related.length > 0 && <div><h5 className="font-semibold">Related families</h5><ul className="mt-2 space-y-2">{related.map((other) => <li key={`${other.anchorCard}:${other.optionCards.join()}`} className="rounded-lg bg-ctp-base p-3"><strong>{other.anchorCard}</strong><p className="text-ctp-subtext1">Shared options: {other.optionCards.filter((card) => family.optionCards.includes(card)).join(", ")}</p><p className="mt-1">Original rule: { [other.anchorCard, ...other.coreCards].join(" + ")} AND {other.minOptions} of {other.optionCards.join(", ")}</p></li>)}</ul></div>}
    {rule.groups.map((group, index) => <fieldset key={index} className="min-w-0 rounded-lg border border-ctp-surface1 p-3"><legend className="px-1 font-semibold">{index ? "AND " : ""}Condition {index + 1}</legend><div className="flex flex-wrap items-center gap-2"><label>At least <input aria-label={`Minimum distinct cards for condition ${index + 1}`} type="number" min={1} max={Math.max(1, group.cards.length)} value={group.minimum} onChange={(event) => update({ ...rule, groups: rule.groups.map((g, i) => i === index ? { ...g, minimum: Math.max(1, Math.floor(Number(event.target.value) || 1)) } : g) })} className="min-h-12 w-20 rounded border border-ctp-surface1 bg-ctp-base px-3" /> of these cards</label>{rule.groups.length > 1 && <button className="min-h-12 px-3 text-ctp-red" onClick={() => update({ ...rule, groups: rule.groups.filter((_, i) => i !== index) })}>Remove condition {index + 1}</button>}</div><div className="mt-2 grid gap-x-3 sm:grid-cols-2">{choices.map((card) => <label key={card} className="flex min-h-12 items-center gap-3 py-2"><input type="checkbox" checked={group.cards.includes(card)} onChange={(event) => update({ ...rule, groups: rule.groups.map((g, i) => i === index ? { ...g, cards: event.target.checked ? [...g.cards, card].sort() : g.cards.filter((name) => name !== card) } : g) })} /><span className="min-w-0 break-words">{card}</span></label>)}</div></fieldset>)}
    <button className="min-h-12 rounded border border-ctp-surface1 px-4" onClick={() => update({ ...rule, groups: [...rule.groups, { cards: [], minimum: 1 }] })}>Add AND condition</button>
    {!valid && <p role="alert" className="text-ctp-peach">Select enough cards to satisfy every condition before approving.</p>}
    <div aria-live="polite" aria-busy={pending}>{pending ? "Recalculating…" : !evidence ? status.phase === "error" ? <p role="alert">{status.error}<button className="min-h-12 px-3 underline" onClick={status.retry}>Retry evidence</button></p> : "Loading deck evidence…" : <div className="grid gap-3 sm:grid-cols-2">{([["Original family", evidence.base], ["Draft rule", evidence.draft]] as const).map(([label, value]) => <div key={label} className="rounded-lg bg-ctp-base p-3"><h5 className="font-semibold">{label}</h5><p>{value.matchingDecks.toLocaleString()} / {value.anchorDecks.toLocaleString()} required-card decks</p><p>{value.confidence === null ? "No required-card sample" : `${(value.confidence * 100).toFixed(1)}% given required cards`} · {value.lift === null ? "Lift unavailable" : `${value.lift.toFixed(2)}× lift`}</p></div>)}</div>}</div>
    <p className="text-xs text-ctp-subtext0">Evidence uses all indexed main + material decks, excluding sideboards. Lift compares group prevalence within required-card decks with its prevalence across the whole index. It is an association, not a win-rate improvement. Extra conditions can reduce support.</p>
    <div className="flex flex-wrap gap-3"><button disabled={!valid || !evidence || pending} className="min-h-12 rounded bg-ctp-teal px-4 font-semibold text-ctp-base disabled:opacity-40" onClick={() => { try { approveReviewedPackage(`${family.anchorCard} reviewed package`, rule, packageId); setSaved(true); } catch { setStorageError(true); } }}>Approve draft locally</button><button className="min-h-12 px-4" onClick={() => update(base)}>Reset draft</button></div>
    {saved && <p role="status">Approved. Review or revoke it under My approvals.</p>}{storageError && <p role="alert">Browser storage is unavailable; your latest changes could not be saved.</p>}
    <div><h5 className="font-semibold">Original findings ({source.length})</h5><ul className="mt-2 max-h-64 space-y-2 overflow-auto" tabIndex={0} aria-label="Original package findings">{source.map((entry) => <li key={entry.memberCards.join("|")}>{entry.anchorCard} AND {entry.memberCards.join(" AND ")} – {entry.matchingDecks} matches</li>)}</ul></div>
  </div>;
}
