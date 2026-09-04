import { Link } from "react-router-dom";

/** Match Timelines/Combos are transcribed from tournament broadcasts, not a verified tournament
 * log — see /methodology#broadcast-data for the full explanation. Reused everywhere that caveat
 * used to be spelled out inline (3 near-identical copies before this component existed). */
export default function BroadcastDataNotice({ className = "mt-2 text-xs text-ctp-subtext0" }: { className?: string }) {
  return (
    <p className={className}>
      Experimental — commentary-derived from broadcasts, not a comprehensive tournament dataset.{" "}
      <Link to="/methodology#broadcast-data" className="text-ctp-blue hover:underline">Learn more</Link>
    </p>
  );
}
