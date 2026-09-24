import { useEffect, useState } from "react";
import type { PublicProfile } from "@gatcg/shared";
import { Link, useParams } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PublicDeckCard } from "./PublicDeckCard";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

export default function PublicUserProfile() {
  const { profileSlug = "" } = useParams<{ profileSlug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(); const [error, setError] = useState<string | null>(null);
  useDocumentTitle(profile?.displayName ?? "Community profile", profile ? `${profile.displayName}'s public Grand Archive decklists.` : undefined);
  useEffect(() => { let active = true; void accountApi.publicProfile(profileSlug).then(({ profile: result }) => { if (active) setProfile(result); }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Profile could not be loaded"); setProfile(null); } }); return () => { active = false; }; }, [profileSlug]);
  if (profile === undefined) return <PageLayout data-component="PublicUserProfile" width="wide"><InlineState className="mt-10">Loading profile…</InlineState></PageLayout>;
  if (!profile) return <PageLayout data-component="PublicUserProfile" width="wide"><EmptyState title="Profile unavailable" description={error} action={<Link to="/decks/shared" className="text-ctp-blue hover:underline">Browse shared decks</Link>} /></PageLayout>;
  return <PageLayout data-component="PublicUserProfile" width="wide"><Link to="/decks/shared" className="text-sm text-ctp-blue hover:underline">← Shared Decks</Link><h1 className="mt-4 text-3xl font-bold">{profile.displayName}</h1><div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-ctp-subtext1">{profile.decks.length} public deck{profile.decks.length === 1 ? "" : "s"}</p><Link to={`/looking-for?binder=${encodeURIComponent(profile.profileSlug)}`} className="inline-flex min-h-11 items-center rounded-lg border border-ctp-surface1 px-3 text-sm font-medium text-ctp-blue hover:border-ctp-blue">View trading binder</Link></div>{profile.decks.length === 0 ? <EmptyState className="mt-8" title="This user has no public decks" /> : <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{profile.decks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}</PageLayout>;
}
