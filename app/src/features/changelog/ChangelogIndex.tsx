import { useMemo } from "react";
import { useSiteChangelogData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const REPO_URL = "https://github.com/urakaiketsuya/FanOfIn.Site";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

export default function ChangelogIndex() {
  useDocumentTitle("Changelog", "What's changed on Fan of Insight, pulled straight from the site's own commit history.");
  const data = useSiteChangelogData();

  const groups = useMemo(() => {
    if (!data) return [];
    const byDay = new Map<string, typeof data.entries>();
    for (const entry of data.entries) {
      const day = entry.date.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(entry);
      byDay.set(day, list);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Changelog</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        What's changed on the site, pulled from the commit history — for now this is just each change's own commit
        message, not a rewritten description.
      </p>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      <div className="mt-6 space-y-6">
        {groups.map(([day, entries]) => (
          <div key={day}>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
              {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}
            </h2>
            <ul className="mt-2 space-y-1.5">
              {entries.map((e) => (
                <li key={e.hash} className="flex items-baseline gap-2 text-sm">
                  <a
                    href={`${REPO_URL}/commit/${e.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 font-mono text-xs text-ctp-subtext0 hover:text-ctp-blue"
                  >
                    {e.hash}
                  </a>
                  <span className="text-ctp-text">{e.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
