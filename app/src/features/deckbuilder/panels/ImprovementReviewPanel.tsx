import { Link } from "react-router-dom";
import Panel from "../../../components/ui/Panel";

export default function ImprovementReviewPanel({ importedCardCount, reviewItemCount }: { importedCardCount: number; reviewItemCount: number }) {
  return <Panel data-component="ImprovementReviewPanel" tone="info" className="mt-4" aria-labelledby="improvement-workflow">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="improvement-workflow" className="font-semibold text-ctp-blue">Improvement review</h2>
        <p className="mt-1 text-sm text-ctp-subtext1">{importedCardCount} imported card{importedCardCount === 1 ? "" : "s"} are protected as your baseline. Your existing version will not change.</p>
      </div>
      <Link to="/deck-review" className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm font-medium text-ctp-base hover:opacity-90">Review {reviewItemCount} change{reviewItemCount === 1 ? "" : "s"}</Link>
    </div>
    <ol className="mt-3 grid gap-2 text-xs text-ctp-subtext1 sm:grid-cols-3">
      <li><span className="font-semibold text-ctp-text">1. Baseline loaded</span><br />Your cards remain locked until you change them.</li>
      <li><span className="font-semibold text-ctp-text">2. Review changes</span><br />Accept additions and cuts selectively.</li>
      <li><span className="font-semibold text-ctp-text">3. Save a version</span><br />Create a snapshot only when you choose.</li>
    </ol>
  </Panel>;
}
