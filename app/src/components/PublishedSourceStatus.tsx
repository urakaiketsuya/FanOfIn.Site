import Button from "./ui/Button";
import Panel from "./ui/Panel";
import type { usePublishedDataStatus } from "../lib/sync/usePublishedData";

/** Feedback for one independently retriable published source; cached results stay mounted. */
export default function PublishedSourceStatus({ label, status, hasData }: {
  label: string;
  status: ReturnType<typeof usePublishedDataStatus>;
  hasData: boolean;
}) {
  if (status.phase === "error") return <Panel tone="danger" className="my-4">
    <div role="alert">
      <h2 className="font-semibold">{label} could not refresh</h2>
      <p className="mt-2 text-sm">{hasData ? "Saved data remains available. Retry to check for the latest results." : "This source is unavailable. Retry to load results. Your filters are preserved."}</p>
    </div>
    <Button className="mt-3" onClick={status.retry}>Retry {label.toLowerCase()}</Button>
  </Panel>;
  if (!hasData || status.phase === "loading") return <p role="status" className="my-4 text-sm text-ctp-subtext1">{hasData ? `Refreshing ${label.toLowerCase()}. Saved data remains available.` : `Loading ${label.toLowerCase()}…`}</p>;
  return null;
}
