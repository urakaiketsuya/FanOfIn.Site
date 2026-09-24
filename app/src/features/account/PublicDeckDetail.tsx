import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { DeckSocialState, PublicDeck } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import UserDeckHeader from "./UserDeckHeader";
import UserDecklistPanel from "./UserDecklistPanel";
import UserDeckStats from "./UserDeckStats";
import DeckTags from "./DeckTags";
import PrimerMarkdown from "./PrimerMarkdown";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import DeckComments from "../social/DeckComments";

type PublicDeckTab = "performance" | "primer" | "discussion";
const PUBLIC_TABS = [{ key: "performance", label: "Performance" }, { key: "primer", label: "Primer" }, { key: "discussion", label: "Discussion" }] satisfies { key: PublicDeckTab; label: string }[];

export default function PublicDeckDetail() {
  const { id: publicSlug = "" } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<PublicDeck | null>();
  const [error, setError] = useState<string | null>(null);
  const [social, setSocial] = useState<DeckSocialState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const [tab, setTab] = useTabParam<PublicDeckTab>("tab", PUBLIC_TABS.map(({ key }) => key), "performance");
  useDocumentTitle(deck?.title ?? "Decklist", deck?.description || "A community decklist on Fan of Insight.");

  useEffect(() => {
    let active = true;
    void accountApi.publicDeck(publicSlug).then(({ deck: result }) => { if (active) setDeck(result); })
      .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Deck could not be loaded"); setDeck(null); } });
    return () => { active = false; };
  }, [publicSlug]);

  useEffect(() => {
    void accountApi.deckSocial(publicSlug).then(setSocial).catch((reason: unknown) => {
      if (!(reason instanceof AccountApiError && reason.status === 401)) setNotice(reason instanceof Error ? reason.message : "Social actions are unavailable");
    });
  }, [publicSlug]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setNotice(null);
    try { await action(); } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Action failed"); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.append(meta); }
    meta.content = deck?.visibility === "public" ? "index,follow" : "noindex,nofollow";
    return () => { if (created) meta?.remove(); else if (meta) meta.content = "index,follow"; };
  }, [deck?.visibility]);

  if (deck === undefined) return <PageLayout data-component="PublicDeckDetail"><InlineState className="mt-10">Loading deck…</InlineState></PageLayout>;
  if (!deck) return <PageLayout data-component="PublicDeckDetail"><EmptyState title="Deck unavailable" description={error} action={<Link to="/" className="text-ctp-blue hover:underline">Back home</Link>} /></PageLayout>;

  return <PageLayout data-component="PublicDeckDetail">
    <UserDeckHeader title={deck.title} championName={deck.championName} format={deck.format} versionNumber={deck.versionNumber} visibility={deck.visibility} description={deck.description} eyebrow={<>Shared by <Link to={`/users/${deck.owner.profileSlug}`} className="text-ctp-blue hover:underline">{deck.owner.displayName}</Link></>} />
    <DeckTags tags={deck.tags} />
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy || !social} onClick={() => void run(async () => { const result = await accountApi.copyDeck(publicSlug); navigate(`/decks/${encodeURIComponent(result.id)}`, { state: { notice: result.created ? "Copied to your decks." : "You already had this build; opened the existing deck." } }); })} className="min-h-11 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base disabled:opacity-50">Copy deck</button>
      <button type="button" disabled={busy || !social} aria-pressed={social?.bookmarked ?? false} onClick={() => void run(async () => { const result = await accountApi.bookmarkDeck(publicSlug, !social?.bookmarked); setSocial((current) => current ? { ...current, bookmarked: result.bookmarked, bookmarkedVersionNumber: result.versionNumber } : current); })} className={`min-h-11 rounded-lg border px-3 text-sm font-medium disabled:opacity-50 ${social?.bookmarked ? "border-ctp-yellow bg-ctp-yellow/10 text-ctp-yellow" : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-yellow hover:text-ctp-yellow"}`}>{social?.bookmarked ? "★ Favorited" : "☆ Favorite"}</button>
      <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-4 text-sm font-medium text-ctp-subtext1 [&::-webkit-details-marker]:hidden">More</summary><div className="absolute right-0 top-full z-30 mt-2 grid min-w-56 gap-1 rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><Link to={`/goldfish?publicDeck=${encodeURIComponent(publicSlug)}`} className="rounded-lg px-3 py-2.5 text-sm hover:bg-ctp-mantle">Open in Goldfish</Link><Link to={`/deck-analysis?publicDeck=${encodeURIComponent(publicSlug)}`} className="rounded-lg px-3 py-2.5 text-sm hover:bg-ctp-mantle">Analyze deck</Link><Link to={`/deck-review?publicDeck=${encodeURIComponent(publicSlug)}`} className="rounded-lg px-3 py-2.5 text-sm hover:bg-ctp-mantle">Review suggestions</Link><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: `${deck.title} by ${deck.owner.displayName}`, decklist: deck.decklist, format: deck.format }]))}`} className="rounded-lg px-3 py-2.5 text-sm hover:bg-ctp-mantle">Compare deck</Link><button type="button" disabled={busy || !social} onClick={() => void run(async () => { const result = await accountApi.likeDeck(publicSlug, !social?.liked); setSocial((current) => current ? { ...current, liked: result.liked } : current); setDeck((current) => current ? { ...current, likeCount: result.likeCount } : current); })} className="rounded-lg px-3 py-2.5 text-left text-sm text-ctp-pink hover:bg-ctp-mantle disabled:opacity-50">{social?.liked ? "Unlike" : "Like"} · {deck.likeCount}</button><button type="button" disabled={busy || !social} onClick={() => { const reason = window.prompt("Report reason: spam, abuse, copyright, or other"); if (!reason || !["spam", "abuse", "copyright", "other"].includes(reason.toLowerCase())) { if (reason) setNotice("Use one of: spam, abuse, copyright, or other."); return; } const details = window.prompt("Optional details (up to 1,000 characters)") ?? ""; void run(async () => { await accountApi.reportDeck(publicSlug, reason.toLowerCase() as "spam" | "abuse" | "copyright" | "other", details); setNotice("Report received. Thank you."); }); }} className="rounded-lg px-3 py-2.5 text-left text-sm text-ctp-subtext1 hover:bg-ctp-mantle disabled:opacity-50">Report deck</button></div></details>
      {!social && <Link to="/account" className="text-sm text-ctp-blue hover:underline">Sign in for deck actions</Link>}
    </div>
    {notice && <p className="mt-3 text-sm text-ctp-yellow">{notice}</p>}
    <UserDecklistPanel decklist={deck.decklist} format={deck.format} collectionSource={`Shared deck: ${deck.title}`} />
    <div className="mt-10"><Tabs tabs={PUBLIC_TABS} active={tab} onChange={setTab} label="Published deck details" baseId="public-deck" /></div>
    <TabPanel baseId="public-deck" tab="performance" active={tab}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} /></TabPanel>
    <TabPanel baseId="public-deck" tab="primer" active={tab} className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5">{deck.primerMarkdown.trim() ? <PrimerMarkdown markdown={deck.primerMarkdown} decklist={deck.decklist} /> : <p className="text-sm text-ctp-subtext1">The author has not added a primer yet.</p>}</TabPanel>
    <TabPanel baseId="public-deck" tab="discussion" active={tab}><DeckComments target={{ kind: "community", id: publicSlug }} /></TabPanel>
    <p className="mt-4 text-xs text-ctp-subtext0">Published {new Date(deck.publishedAt).toLocaleDateString()} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p>
  </PageLayout>;
}
