import { useMemo, useState } from "react";
import { useSiteChangelogData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

const REPO_URL = "https://github.com/urakaiketsuya/FanOfIn.Site";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

export default function ChangelogIndex() {
  useDocumentTitle("Changelog", "What's changed on Fan of Insight, pulled straight from the site's own commit history.");
  const data = useSiteChangelogData();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) => !needle || entry.summary.toLowerCase().includes(needle) || entry.hash.toLowerCase().includes(needle));
  }, [data, query]);

  const groups = useMemo(() => {
    const byDay = new Map<string, typeof matching>();
    for (const entry of matching.slice(0, visibleCount)) {
      const day = entry.date.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(entry);
      byDay.set(day, list);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [matching, visibleCount]);

  return (
    <PageLayout data-component="ChangelogIndex" width="standard" className="py-10">
      <PageHeader
        eyebrow="Site history"
        title="Changelog"
        description="Browse recent site changes, or search the full commit archive. These are the original commit subjects, not curated release notes."
      />

      {!data && <InlineState className="mt-6">Loading…</InlineState>}

      {data && <>
      <div className="mt-8 rounded-2xl border border-forest-surface bg-forest-surface/30 p-5 sm:p-6">
        <label htmlFor="changelog-search" className="block text-sm font-semibold text-ctp-text">Find a change</label>
        <input id="changelog-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(20); }} placeholder="Search changes or commit hash" className="mt-3 min-h-11 w-full rounded-lg border border-ctp-overlay0 bg-ctp-base px-4 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30" />
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ctp-subtext1">
          <span>{matching.length} {matching.length === 1 ? "change" : "changes"}{query.trim() ? " found" : " in the archive"}</span>
          <span>Published snapshot: {new Date(data.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {matching.length === 0 && <InlineState className="mt-8">No changes match your search.</InlineState>}

      <div className="mt-8 space-y-9">
        {groups.map(([day, entries]) => (
          <section key={day} aria-label={new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}>
            <h2 className="border-b border-ctp-surface1 pb-3 text-lg font-semibold text-ctp-text">{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}</h2>
            <ol className="divide-y divide-ctp-surface0">
              {entries.map((e) => (
                <li key={e.hash} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                  <span className="text-sm leading-6 text-ctp-text">{e.summary}</span>
                  <a
                    href={`${REPO_URL}/commit/${e.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View commit ${e.hash} on GitHub`}
                    className="w-fit shrink-0 rounded font-mono text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
                  >
                    {e.hash}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {visibleCount < matching.length && <div className="mt-9 flex flex-col items-center gap-3 border-t border-ctp-surface0 pt-7"><p className="text-xs text-ctp-subtext0">Showing {visibleCount} of {matching.length} changes</p><button type="button" onClick={() => setVisibleCount((count) => count + 20)} className="min-h-11 rounded-lg border border-ctp-blue/60 px-6 py-2 text-sm font-semibold text-ctp-blue hover:bg-forest-surface/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Show more changes</button></div>}
      </>}
    </PageLayout>
  );
}
