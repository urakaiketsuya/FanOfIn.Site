import { useEffect, useState } from "react";
import type { PublicProfile } from "@gatcg/shared";
import { Link, useParams } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PublicDeckCard } from "./PublicDeckCard";

export default function PublicUserProfile() {
  const { profileSlug = "" } = useParams<{ profileSlug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(); const [error, setError] = useState<string | null>(null);
  useDocumentTitle(profile?.displayName ?? "Community profile", profile ? `${profile.displayName}'s public Grand Archive decklists.` : undefined);
  useEffect(() => { let active = true; void accountApi.publicProfile(profileSlug).then(({ profile: result }) => { if (active) setProfile(result); }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Profile could not be loaded"); setProfile(null); } }); return () => { active = false; }; }, [profileSlug]);
  if (profile === undefined) return <div className="mx-auto max-w-5xl px-4 py-10 text-ctp-subtext1">Loading profile…</div>;
  if (!profile) return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-2xl font-bold">Profile unavailable</h1><p className="mt-2 text-ctp-subtext1">{error}</p><Link to="/shared-decks" className="mt-5 inline-block text-ctp-blue hover:underline">Browse shared decks</Link></div>;
  return <div className="mx-auto max-w-5xl px-4 py-8"><Link to="/shared-decks" className="text-sm text-ctp-blue hover:underline">← Shared Decks</Link><h1 className="mt-4 text-3xl font-bold">{profile.displayName}</h1><p className="mt-1 text-ctp-subtext1">{profile.decks.length} public deck{profile.decks.length === 1 ? "" : "s"}</p>{profile.decks.length === 0 ? <p className="mt-8 rounded-lg border border-dashed border-ctp-surface1 p-8 text-center text-ctp-subtext1">This user has no public decks.</p> : <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{profile.decks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}</div>;
}
