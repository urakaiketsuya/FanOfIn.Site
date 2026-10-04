import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PublicProfile } from "@gatcg/shared";
import { Link, useNavigate, useParams } from "react-router-dom";
import { db } from "../../lib/db";
import CardResult from "../../components/CardResult";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import Button from "../../components/ui/Button";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PublicDeckCard } from "./PublicDeckCard";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

export default function PublicUserProfile() {
  const { profileSlug = "" } = useParams<{ profileSlug: string }>();
  const navigate = useNavigate();
  const [viewerProfileSlug, setViewerProfileSlug] = useState<string>();
  const [profile, setProfile] = useState<PublicProfile | null>();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cards = useLiveQuery(() => db.cards.bulkGet(profile?.favoriteCardIds ?? []), [profile?.favoriteCardIds?.join("|")]);
  useDocumentTitle(profile?.displayName ?? "Community profile", profile ? `${profile.displayName}'s favorite cards and public Grand Archive decklists.` : undefined);
  useEffect(() => {
    let active = true;
    void accountApi.session().then(({ user }) => {
      if (active) setViewerProfileSlug(user?.profileSlug);
    }).catch(() => {
      // Public profiles remain readable when the optional session check fails.
      if (active) setViewerProfileSlug(undefined);
    });
    return () => { active = false; };
  }, [profileSlug]);
  useEffect(() => {
    let active = true;
    setProfile(undefined); setError(null);
    void accountApi.publicProfile(profileSlug).then(({ profile: result }) => {
      if (active) setProfile(result);
    }).catch((reason: unknown) => {
      if (active) { setError(reason instanceof Error ? reason.message : "Profile could not be loaded"); setProfile(null); }
    });
    return () => { active = false; };
  }, [profileSlug, attempt]);
  if (profile === undefined) return <PageLayout data-component="PublicUserProfile" width="wide"><InlineState className="mt-10">Loading profile…</InlineState></PageLayout>;
  if (!profile) return <PageLayout data-component="PublicUserProfile" width="wide"><EmptyState title="Profile unavailable" description={error} action={<Button onClick={() => setAttempt(value => value + 1)}>Retry profile</Button>} /></PageLayout>;
  return <PageLayout data-component="PublicUserProfile" width="wide">
    <Link to="/decks/shared" className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">← Shared decks</Link>
    <header className="identity-surface mt-4 rounded-3xl p-5">
      <h1 className="break-words text-3xl font-bold">{profile.displayName}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-ctp-subtext1">{profile.decks.length} public deck{profile.decks.length === 1 ? "" : "s"}</p>
        {viewerProfileSlug === profile.profileSlug && <Button variant="primary" onClick={() => navigate("/account")}>Edit profile</Button>}
        <Link to={`/looking-for?binder=${encodeURIComponent(profile.profileSlug)}`} className="inline-flex min-h-control items-center rounded-lg border border-ctp-surface1 px-3 text-sm font-medium text-ctp-blue hover:border-ctp-blue">View trading binder</Link>
      </div>
    </header>
    {!!profile.favoriteCardIds?.length && <section className="mt-8">
      <h2 className="text-xl font-semibold">Favorite cards</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{profile.favoriteCardIds.map((id, index) => <CardResult key={id} card={cards?.[index]} name={cards?.[index]?.name ?? "Card unavailable"} />)}</div>
    </section>}
    {(!!profile.featuredDecks?.length || !!profile.featuredTournamentDecks?.length) && <section className="mt-8">
      <h2 className="text-xl font-semibold">Featured decks</h2>
      <div className="mt-3 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">{[...(profile.featuredDecks?.map(deck => <DeckPreviewCard key={deck.publicSlug} presentation="cover" model={{ id: deck.publicSlug, title: deck.title, decklist: null, championName: deck.championName, format: deck.format, materialPreview: deck.materialPreview, source: { kind: "community", label: `By ${deck.owner.displayName}` } }} view={{ to: `/decks/${deck.publicSlug}` }} />) ?? []), ...(profile.featuredTournamentDecks?.map(deck => <DeckPreviewCard key={deck.deckHash} presentation="cover" model={{ id: deck.deckHash, title: `${deck.championName ?? "Tournament"} deck`, decklist: null, championName: deck.championName, materialPreview: deck.materialPreview, source: { kind: "event", label: "Tournament" } }} view={{ to: `/decks/${deck.deckHash}` }} />) ?? [])].sort((a, b) => (profile.featuredDeckOrder?.indexOf(String(a.key)) ?? 0) - (profile.featuredDeckOrder?.indexOf(String(b.key)) ?? 0))}</div>
    </section>}
    <h2 className="mt-8 text-xl font-semibold">Published decks</h2>
    {profile.decks.length === 0 ? <EmptyState className="mt-8" title="This user has no public decks" /> : <div className="mt-6 grid items-start gap-4 md:grid-cols-2">{profile.decks.map(deck => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}
  </PageLayout>;
}
