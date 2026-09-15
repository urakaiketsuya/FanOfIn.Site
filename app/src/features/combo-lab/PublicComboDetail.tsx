import { useEffect, useState } from "react";
import type { PublicCombo } from "@gatcg/shared";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function PublicComboDetail() {
  const { publicSlug = "" } = useParams<{ publicSlug: string }>();
  const [combo, setCombo] = useState<PublicCombo | null>();
  const [notice, setNotice] = useState<string | null>(null);
  useDocumentTitle(combo?.name ?? "Shared Combo", "View and test a shared combo recipe.");
  useEffect(() => { let active = true; void accountApi.publicCombo(publicSlug).then(({ combo: next }) => { if (active) setCombo(next); }).catch(() => { if (active) setCombo(null); }); return () => { active = false; }; }, [publicSlug]);
  if (combo === undefined) return <PageLayout><InlineState className="mt-10">Loading combo…</InlineState></PageLayout>;
  if (combo === null) return <PageLayout><InlineState tone="danger" className="mt-10">This combo is unavailable.</InlineState></PageLayout>;
  const params = new URLSearchParams({ recipe: JSON.stringify(combo.definition.requirements), label: combo.name, tab: "calculations" });
  return <PageLayout width="standard" data-component="PublicComboDetail"><Link to="/combo-lab" className="text-sm text-ctp-blue">← Combo Lab</Link><Panel className="mt-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold text-ctp-text">{combo.name}</h1><p className="mt-1 text-sm text-ctp-subtext1">by {combo.owner.displayName} · saved by {combo.saveCount} user{combo.saveCount === 1 ? "" : "s"}</p></div>{combo.definition.damage > 0 && <span className="rounded bg-ctp-red/10 px-3 py-1.5 text-sm font-bold text-ctp-red">{combo.definition.damage} damage</span>}</div>{combo.description && <p className="mt-4 text-ctp-subtext1">{combo.description}</p>}<div className="mt-5 space-y-2">{combo.definition.requirements.map((requirement, index) => <div key={`${requirement.kind}-${index}`} className="rounded-lg border border-ctp-surface1 p-3 text-sm"><span className="font-semibold text-ctp-text">{index > 0 ? "AND " : ""}{requirement.required} of </span>{requirement.kind === "cards" ? requirement.cards.join(" or ") : `${requirement.kind}: ${requirement.value}`}</div>)}</div><div className="mt-5 flex flex-wrap gap-2"><Link to={`/combo-lab?${params.toString()}`} className="rounded-md bg-ctp-blue px-4 py-2 text-sm font-semibold text-ctp-base">Test with my deck</Link><button type="button" onClick={() => void accountApi.bookmarkCombo(combo.publicSlug, true).then(() => setNotice("Saved to your combo library."), () => setNotice("Sign in from My Decks to save this combo."))} className="rounded-md border border-ctp-mauve px-4 py-2 text-sm text-ctp-mauve">Save combo</button>{combo.exampleDeckSlug && <Link to={`/decks/${combo.exampleDeckSlug}`} className="rounded-md border border-ctp-surface1 px-4 py-2 text-sm text-ctp-subtext1">View example deck</Link>}</div>{notice && <p className="mt-3 text-xs text-ctp-green">{notice}</p>}</Panel></PageLayout>;
}
