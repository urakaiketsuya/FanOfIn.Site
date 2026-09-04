import { Link } from "react-router-dom";
import { isDataStale } from "../lib/dataFreshness";

/** Surfaces the `docs/CALCULATIONS.md` "Pending regen" gap where it's actually visible to a
 * reader, instead of leaving it silently baked into slightly-off results — a dataset generated
 * before the fix it needs still loads and renders normally, it just doesn't reflect the fix yet.
 * Renders nothing once every passed dataset is fresh (or none have loaded yet). */
export default function StaleDataNotice({ generatedAt }: { generatedAt: (string | undefined)[] }) {
  if (!generatedAt.some(isDataStale)) return null;
  return (
    <p className="mt-2 text-xs text-ctp-yellow">
      Some of this page's data is from a pipeline run before a recent accuracy fix (archetype
      clustering, card-name matching) — a few entries may look slightly off until the site's data
      is next regenerated.{" "}
      <Link to="/methodology#coverage" className="text-ctp-blue hover:underline">Learn more</Link>
    </p>
  );
}
