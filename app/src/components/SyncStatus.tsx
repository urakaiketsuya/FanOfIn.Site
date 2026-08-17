import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useSyncProgress } from "../lib/sync/SyncProvider";

export default function SyncStatus() {
  const progress = useSyncProgress();
  const cardsMeta = useLiveQuery(() => db.syncMeta.get("cards"));

  if (progress.phase === "syncing") {
    return (
      <span className="text-xs text-ctp-subtext0">
        syncing cards… {progress.fetched}
        {progress.total ? ` / ${progress.total}` : ""}
      </span>
    );
  }

  if (progress.phase === "error") {
    return <span className="text-xs text-ctp-red">card sync failed</span>;
  }

  return (
    <span className="text-xs text-ctp-subtext0">
      {cardsMeta ? `cards synced ${new Date(cardsMeta.lastSyncedAt).toLocaleString()}` : "cards not synced yet"}
    </span>
  );
}
