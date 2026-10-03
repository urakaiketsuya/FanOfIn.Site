import { useMemo, useRef, useState } from "react";
import { useSiteChangelogData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

const REPO_URL = "https://github.com/urakaiketsuya/FanOfIn.Site";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

export default function ChangelogIndex() {
  useDocumentTitle("Changelog", "What's changed on Fan of Insight, pulled straight from the site's own commit history.");
  const data = useSiteChangelogData();
  const status = usePublishedDataStatus("changelog", "/data/changelog.json");
  const searchRef = useRef<HTMLInputElement>(null);
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

      {status.phase === "error" ? <Panel tone="danger" className="mt-6">
        <div role="alert"><h2 className="font-semibold">Changes could not be loaded</h2><p className="mt-2 text-sm">{data ? "Showing the saved archive. Try again for the latest changes." : "Try again to load the site history."}</p></div>
        <Button className="mt-3" onClick={status.retry}>Retry changelog</Button>
      </Panel> : (!data || status.phase === "loading") && <div role="status"><InlineState className="mt-6">{data ? "Refreshing the archive…" : "Loading changes…"}</InlineState></div>}

      {data && <>
      <Panel tone="info" padding="lg" className="mt-8 rounded-2xl!">
        <label htmlFor="changelog-search" className="block text-xl font-bold text-ctp-text">Find a change</label>
        <input ref={searchRef} id="changelog-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(20); }} placeholder="Search changes or commit hash" className="mt-3 min-h-control w-full rounded-lg border border-ctp-overlay0 bg-ctp-base px-4 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30" />
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ctp-subtext1">
          <span role="status">{matching.length} {matching.length === 1 ? "change" : "changes"}{query.trim() ? " found" : " in the archive"}</span>
          <span>Published snapshot: {new Date(data.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
        </div>
      </Panel>

      {matching.length === 0 && <Panel className="mt-8"><h2 className="text-lg font-semibold">{query.trim() ? "No matching changes" : "No changes published yet"}</h2><p className="mt-2 text-sm text-ctp-subtext1">{query.trim() ? "Try another word or return to the full archive." : "Site updates will appear here when the archive is published."}</p>{query.trim() && <Button className="mt-3" onClick={() => { setQuery(""); setVisibleCount(20); searchRef.current?.focus(); }}>Clear search</Button>}</Panel>}

      <div className="mt-8 space-y-9">
        {groups.map(([day, entries]) => (
          <section key={day} aria-label={new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}>
            <h2 className="border-l-4 border-ctp-blue pl-4 text-xl font-bold tracking-tight text-ctp-text">{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}</h2>
            <ol className="mt-4 divide-y divide-ctp-surface1 rounded-xl border border-ctp-surface1 bg-ctp-mantle px-4">
              {entries.map((e) => (
                <li key={e.hash} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                  <span className="text-sm leading-6 text-ctp-text">{e.summary}</span>
                  <a
                    href={`${REPO_URL}/commit/${e.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View commit ${e.hash} on GitHub`}
                    className="flex min-h-control min-w-control w-fit shrink-0 items-center rounded font-mono text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
                  >
                    {e.hash}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {visibleCount < matching.length && <div className="mt-9 flex flex-col items-center gap-3 border-t border-ctp-surface0 pt-7"><p className="text-xs text-ctp-subtext0">Showing {visibleCount} of {matching.length} changes</p><Button onClick={() => setVisibleCount((count) => count + 20)}>Show more changes</Button></div>}
      </>}
    </PageLayout>
  );
}
