/**
 * One git commit, published for the site's own "Changelog" page — named `SiteChangelog*` (not
 * `Changelog*`) to avoid colliding with `ChangelogEntry` in api-types.ts, which is the Grand
 * Archive game's own card-errata changelog (`/changelog/list`), an unrelated concept.
 */
export interface SiteChangelogEntry {
  /** Short commit hash (git's `%h`). */
  hash: string;
  /** Commit date, ISO 8601. */
  date: string;
  /** The commit's subject line, verbatim — no rewriting/curation (yet). */
  summary: string;
}

export interface SiteChangelogData {
  generatedAt: string;
  entries: SiteChangelogEntry[];
}
