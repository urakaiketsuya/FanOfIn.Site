import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Generic short-clause-plus-link caveat, for the topics that only appear once or twice
 * (see /methodology's own sections for the full explanation) — a near-duplicate topic
 * used many times over gets its own dedicated notice component instead (e.g.
 * BroadcastDataNotice). */
export default function MethodologyNote({ anchor, children }: { anchor: string; children: ReactNode }) {
  return (
    <p className="mt-2 text-xs text-ctp-subtext0">
      {children} <Link to={`/methodology#${anchor}`} className="text-ctp-blue hover:underline">Learn more</Link>
    </p>
  );
}
