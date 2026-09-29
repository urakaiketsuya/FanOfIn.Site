import { useCallback, useEffect, useState } from "react";
import type { DeckFolder, DeckFolderInput } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useToast } from "../../components/ui/toast/ToastContext";
export function useDeckFolders(userId: string | undefined) {
  const [folders, setFolders] = useState<DeckFolder[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useToast();
  const refresh = useCallback(async () => {
    try {
      const result = await accountApi.deckFolders();
      setFolders(result.folders); setReady(true); setError("");
      return result.folders;
    } catch (reason) { setError("Folders could not be loaded. Your decks are still available."); throw reason; }
  }, []);
  useEffect(() => {
    let active = true;
    setReady(false); setFolders([]); setError("");
    if (userId) void accountApi.deckFolders().then(({ folders: next }) => { if (active) { setFolders(next); setReady(true); } }, () => { if (active) setError("Folders could not be loaded. Your decks are still available."); });
    return () => { active = false; };
  }, [userId]);
  const accept = (folder: DeckFolder) => setFolders(current => [...current.filter(item => item.id !== folder.id), folder].sort((a, b) => a.name.localeCompare(b.name)));
  async function save(id: string, input: DeckFolderInput, revision?: number) {
    const { folder } = revision === undefined ? await accountApi.createDeckFolder(id, input) : await accountApi.updateDeckFolder(id, revision, input);
    accept(folder); notify({ message: revision === undefined ? `Created folder “${folder.name}”.` : `Updated folder “${folder.name}”.`, key: "folder" });
    return folder;
  }
  async function remove(folder: DeckFolder) {
    await accountApi.deleteDeckFolder(folder.id, folder.revision);
    setFolders(current => current.filter(item => item.id !== folder.id));
    notify({ message: `Deleted folder “${folder.name}”. Its decks were kept.`, key: "folder" });
  }
  return { folders, ready, error, refresh, save, remove };
}
