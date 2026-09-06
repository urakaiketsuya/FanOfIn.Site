import { useMemo } from "react";
import { useSiteChangelogData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";
import Section from "../../components/ui/Section";

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
    <PageLayout data-component="ChangelogIndex">
      <PageHeader
        title="Changelog"
        description="What's changed on the site, pulled from the commit history — for now this is just each change's own commit message, not a rewritten description."
      />

      {!data && <InlineState className="mt-6">Loading…</InlineState>}

      <div className="mt-6 space-y-6">
        {groups.map(([day, entries]) => (
          <Section key={day} heading="dense" title={new Date(`${day}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)}>
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
          </Section>
        ))}
      </div>
    </PageLayout>
  );
}
