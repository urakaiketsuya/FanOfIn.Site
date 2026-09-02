import Button from "../../../components/ui/Button";
import Panel from "../../../components/ui/Panel";

export default function ImprovementReviewPanel({ importedCardCount, reviewItemCount, onReview }: { importedCardCount: number; reviewItemCount: number; onReview: () => void }) {
  return <Panel tone="info" className="mt-4" aria-labelledby="improvement-workflow">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="improvement-workflow" className="font-semibold text-ctp-blue">Improvement review</h2>
        <p className="mt-1 text-sm text-ctp-subtext1">{importedCardCount} imported card{importedCardCount === 1 ? "" : "s"} are protected as your baseline. Your existing version will not change.</p>
      </div>
      <Button variant="primary" size="sm" onClick={onReview}>Review {reviewItemCount} change{reviewItemCount === 1 ? "" : "s"}</Button>
    </div>
    <ol className="mt-3 grid gap-2 text-xs text-ctp-subtext1 sm:grid-cols-3">
      <li><span className="font-semibold text-ctp-text">1. Baseline loaded</span><br />Your cards remain locked until you change them.</li>
      <li><span className="font-semibold text-ctp-text">2. Review changes</span><br />Accept additions and cuts selectively.</li>
      <li><span className="font-semibold text-ctp-text">3. Save a version</span><br />Create a snapshot only when you choose.</li>
    </ol>
  </Panel>;
}
