import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type NotificationTone = "highlight" | "warning" | "info";

type NotificationAction = { label: string; to: string } | { label: string; onClick: () => void };

const TONE_CLASSES: Record<NotificationTone, { wrap: string; title: string; action: string }> = {
  highlight: { wrap: "border-ctp-mauve/50 bg-ctp-mauve/10", title: "text-ctp-mauve", action: "border-ctp-mauve/60 text-ctp-mauve hover:bg-ctp-mauve/10" },
  warning: { wrap: "border-ctp-yellow/50 bg-ctp-yellow/10", title: "text-ctp-text", action: "border-ctp-yellow/60 text-ctp-yellow hover:bg-ctp-yellow/10" },
  info: { wrap: "border-ctp-blue/40 bg-ctp-blue/5", title: "text-ctp-blue", action: "border-ctp-blue/40 text-ctp-blue hover:bg-ctp-blue/10" },
};

/** A dismissable-by-nature (condition-gated by the caller, not by user dismissal) callout for a
 * fresh, actionable fact the viewer might otherwise miss — e.g. "new cards available" or "N
 * recommendations ready." Deliberately inline in the page flow rather than a toast: it stays
 * visible until the underlying condition clears, instead of disappearing on a timer or being
 * missed if the viewer wasn't looking at a screen corner when it fired. */
export default function NotificationBanner({
  tone,
  title,
  description,
  action,
}: {
  tone: NotificationTone;
  title: ReactNode;
  description?: ReactNode;
  action: NotificationAction;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${classes.wrap}`}>
      <span className={`font-medium ${classes.title}`}>{title}</span>
      {description && <span className="text-xs text-ctp-subtext1">{description}</span>}
      {"to" in action ? (
        <Link to={action.to} className={`ml-auto shrink-0 rounded-md border px-2 py-1 text-xs ${classes.action}`}>
          {action.label} →
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={`ml-auto shrink-0 rounded-md border px-2 py-1 text-xs ${classes.action}`}>
          {action.label} →
        </button>
      )}
    </div>
  );
}
