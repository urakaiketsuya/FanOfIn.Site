import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";
import type { useOmnidexIndexStatus } from "./data";

export default function SeasonIndexStatus({ status, hasData }: {
  status: ReturnType<typeof useOmnidexIndexStatus>;
  hasData: boolean;
}) {
  if (status.phase === "error") {
    return <Panel className="my-4 border-ctp-red/40">
      <div role="alert">
        <h2 className="font-semibold text-ctp-text">{hasData ? "Season data could not refresh" : "Season data is unavailable"}</h2>
        <p className="mt-2 text-sm text-ctp-subtext1">{hasData
          ? "Showing saved seasons and events. Try again to check for the latest results."
          : "Try again to load seasons and their tournament history."}</p>
      </div>
      <Button className="mt-3" onClick={status.retry}>Retry season data</Button>
    </Panel>;
  }
  if (!hasData || status.phase === "loading") {
    return <div role="status" className="my-4"><InlineState>{hasData
      ? "Refreshing season data. Saved results remain available."
      : "Loading season data…"}</InlineState></div>;
  }
  return null;
}
