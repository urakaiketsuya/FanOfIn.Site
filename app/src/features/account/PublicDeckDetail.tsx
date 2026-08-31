import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PublicDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDecklistText } from "../events/DecklistView";

export default function PublicDeckDetail() {
  const { publicSlug = "" } = useParams<{ publicSlug: string }>();
  const [deck, setDeck] = useState<PublicDeck | null>();
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(deck?.title ?? "Decklist", deck?.description || "A community decklist on Fan of Insight.");

  useEffect(() => {
    let active = true;
    void accountApi.publicDeck(publicSlug).then(({ deck: result }) => { if (active) setDeck(result); })
      .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Deck could not be loaded"); setDeck(null); } });
    return () => { active = false; };
  }, [publicSlug]);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.append(meta); }
    meta.content = deck?.visibility === "public" ? "index,follow" : "noindex,nofollow";
    return () => { if (created) meta?.remove(); else if (meta) meta.content = "index,follow"; };
  }, [deck?.visibility]);

  if (deck === undefined) return <div className="mx-auto max-w-4xl px-4 py-10 text-ctp-subtext1">Loading deck…</div>;
  if (!deck) return <div className="mx-auto max-w-4xl px-4 py-10"><h1 className="text-2xl font-bold text-ctp-text">Deck unavailable</h1><p className="mt-2 text-ctp-subtext1">{error}</p><Link to="/" className="mt-5 inline-block text-ctp-blue hover:underline">Back home</Link></div>;

  return <div className="mx-auto max-w-4xl px-4 py-8">
    <p className="text-sm text-ctp-subtext1">Shared by {deck.owner.displayName}</p>
    <div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ctp-text">{deck.title}</h1><p className="mt-1 text-sm text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format} · Version {deck.versionNumber}</p></div>{deck.visibility === "unlisted" && <span className="rounded-full border border-ctp-yellow/60 px-3 py-1 text-xs text-ctp-yellow">Unlisted</span>}</div>
    {deck.description && <p className="mt-5 whitespace-pre-wrap text-ctp-subtext1">{deck.description}</p>}
    <section className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Decklist</h2><pre className="mt-3 max-h-[42rem] overflow-auto whitespace-pre-wrap rounded-md bg-ctp-base p-4 text-sm text-ctp-subtext1">{buildDecklistText(deck.decklist)}</pre></section>
    <p className="mt-4 text-xs text-ctp-subtext0">Published {new Date(deck.publishedAt).toLocaleDateString()}</p>
  </div>;
}
