import { useState } from "react";
import type { DeckFolder } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import DeckFolderPreview from "./DeckFolderPreview";

export default function DeckFolderGallery({ folders, onOpen }: { folders: DeckFolder[]; onOpen: (id: string) => void }) {
  const [limit, setLimit] = useState(6);
  if (!folders.length) return null;
  return <div className="mt-4"><div className="grid gap-3 md:grid-cols-2">{folders.slice(0, limit).map(folder => <article key={folder.id} className="min-w-0 rounded-2xl border border-ctp-surface1"><DeckFolderPreview name={folder.name} coverCardName={folder.coverCardName} accent={folder.accent} count={folder.deckIds.length} /><Button className="m-3" onClick={() => onOpen(folder.id)} aria-label={`Open folder ${folder.name}`}>Open folder</Button></article>)}</div>{folders.length > limit && <Button className="mt-3" onClick={() => setLimit(value => value + 6)}>Show more folders</Button>}</div>;
}
