import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Generic short-clause-plus-link caveat, for the topics that only appear once or twice
 * (see /methodology's own sections for the full explanation) — a near-duplicate topic
 * used many times over gets its own dedicated notice component instead (e.g.
 * BroadcastDataNotice). */
export default function MethodologyNote({ anchor, children }: { anchor: string; children: ReactNode }) {
  return (
    <details data-component="MethodologyNote" className="group mt-2 text-xs text-ctp-subtext0">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-ctp-surface0 hover:text-ctp-text hover:shadow-sm active:scale-[0.97] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="transition-transform group-open:rotate-90">&#9656;</span>
        How this is calculated
      </summary>
      <p className="ml-2 mt-1 border-l border-ctp-surface1 pl-3 leading-5">
        {children} <Link to={`/methodology#${anchor}`} className="text-ctp-blue hover:underline">Full methodology</Link>
      </p>
    </details>
  );
}
