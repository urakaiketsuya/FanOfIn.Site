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

type PublicDeckTab = "decklist" | "analysis" | "primer";
const PUBLIC_TABS = [{ key: "decklist", label: "Decklist" }, { key: "analysis", label: "Analysis" }, { key: "primer", label: "Primer" }] satisfies { key: PublicDeckTab; label: string }[];

export default function PublicDeckDetail() {
  const { publicSlug = "" } = useParams<{ publicSlug: string }>();
  const [deck, setDeck] = useState<PublicDeck | null>();
  const [error, setError] = useState<string | null>(null);
  const [social, setSocial] = useState<DeckSocialState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const [tab, setTab] = useTabParam<PublicDeckTab>("tab", PUBLIC_TABS.map(({ key }) => key), "decklist");
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

  if (deck === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-ctp-subtext1">Loading deck…</div>;
  if (!deck) return <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-2xl font-bold text-ctp-text">Deck unavailable</h1><p className="mt-2 text-ctp-subtext1">{error}</p><Link to="/" className="mt-5 inline-block text-ctp-blue hover:underline">Back home</Link></div>;

  return <PageLayout>
    <UserDeckHeader title={deck.title} championName={deck.championName} format={deck.format} versionNumber={deck.versionNumber} visibility={deck.visibility} description={deck.description} eyebrow={<>Shared by <Link to={`/users/${deck.owner.profileSlug}`} className="text-ctp-blue hover:underline">{deck.owner.displayName}</Link></>} />
    <DeckTags tags={deck.tags} />
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy || !social} onClick={() => void run(async () => { const result = await accountApi.likeDeck(publicSlug, !social?.liked); setSocial((current) => current ? { ...current, liked: result.liked } : current); setDeck((current) => current ? { ...current, likeCount: result.likeCount } : current); })} className="rounded-md border border-ctp-pink/60 px-3 py-1.5 text-sm text-ctp-pink disabled:opacity-50">{social?.liked ? "Liked" : "Like"} · {deck.likeCount}</button>
      <button type="button" disabled={busy || !social} onClick={() => void run(async () => { const result = await accountApi.bookmarkDeck(publicSlug, !social?.bookmarked); setSocial((current) => current ? { ...current, bookmarked: result.bookmarked, bookmarkedVersionNumber: result.versionNumber } : current); })} className="rounded-md border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue disabled:opacity-50">{social?.bookmarked ? `Saved v${social.bookmarkedVersionNumber}` : "Save deck"}</button>
      <button type="button" disabled={busy || !social} onClick={() => void run(async () => { const result = await accountApi.copyDeck(publicSlug); navigate(`/my-decks/${encodeURIComponent(result.id)}`, { state: { notice: result.created ? "Copied to your decks." : "You already had this build; opened the existing deck." } }); })} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Copy to my decks</button>
      <button type="button" disabled={busy || !social} onClick={() => { const reason = window.prompt("Report reason: spam, abuse, copyright, or other"); if (!reason || !["spam", "abuse", "copyright", "other"].includes(reason.toLowerCase())) { if (reason) setNotice("Use one of: spam, abuse, copyright, or other."); return; } const details = window.prompt("Optional details (up to 1,000 characters)") ?? ""; void run(async () => { await accountApi.reportDeck(publicSlug, reason.toLowerCase() as "spam" | "abuse" | "copyright" | "other", details); setNotice("Report received. Thank you."); }); }} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 disabled:opacity-50">Report</button>
      {!social && <Link to="/my-decks" className="text-sm text-ctp-blue hover:underline">Sign in to like, save, or copy</Link>}
    </div>
    {notice && <p className="mt-3 text-sm text-ctp-yellow">{notice}</p>}
    <div className="mt-6"><Tabs tabs={PUBLIC_TABS} active={tab} onChange={setTab} label="Published deck details" baseId="public-deck" /></div>
    <TabPanel baseId="public-deck" tab="decklist" active={tab}><UserDecklistPanel decklist={deck.decklist} format={deck.format} collectionSource={`Shared deck: ${deck.title}`} /></TabPanel>
    <TabPanel baseId="public-deck" tab="analysis" active={tab}><UserDeckStats decklist={deck.decklist} championName={deck.championName} format={deck.format} title={deck.title} /></TabPanel>
    <TabPanel baseId="public-deck" tab="primer" active={tab} className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5">{deck.primerMarkdown.trim() ? <PrimerMarkdown markdown={deck.primerMarkdown} /> : <p className="text-sm text-ctp-subtext1">The author has not added a primer yet.</p>}</TabPanel>
    <p className="mt-4 text-xs text-ctp-subtext0">Published {new Date(deck.publishedAt).toLocaleDateString()} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p>
  </PageLayout>;
}
