import { useRef, useState } from "react";
import type { DeckFolder } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/ContentState";
import DeckFolderPreview from "./DeckFolderPreview";

export default function DeckFolderGallery({ folders, onOpen }: { folders: DeckFolder[]; onOpen: (id: string) => void }) {
  const [limit, setLimit] = useState(6);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const matches = folders.filter(folder => `${folder.name} ${folder.coverCardName ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (!folders.length) return null;
  return <div className="mt-4"><label className="block text-sm">Find a folder<input ref={searchInput} value={query} onChange={event => { setQuery(event.target.value); setLimit(6); }} placeholder="Search folder or cover card" className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3" /></label><p className="my-3 text-xs text-ctp-subtext1">{matches.length} matching {matches.length === 1 ? "folder" : "folders"}</p>{!matches.length && <EmptyState title="No matching folders" description="Try a folder name or the card on its cover." action={<Button onClick={() => { setQuery(""); searchInput.current?.focus(); }}>Clear folder search</Button>} />}<div className="grid gap-3 md:grid-cols-2">{matches.slice(0, limit).map(folder => <article key={folder.id} className="min-w-0 rounded-2xl border border-ctp-surface1"><DeckFolderPreview name={folder.name} coverCardName={folder.coverCardName} accent={folder.accent} count={folder.deckIds.length} /><Button className="m-3" onClick={() => onOpen(folder.id)} aria-label={`Open folder ${folder.name}`}>Open folder</Button></article>)}</div>{matches.length > limit && <Button className="mt-3" onClick={() => setLimit(value => value + 6)}>Show more folders</Button>}</div>;
}
