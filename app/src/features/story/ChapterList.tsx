import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import DisclosureChevron from "../../components/DisclosureChevron";
import { articleArtwork } from "./artwork";
import { getChapterCards } from "./chapterCards";
import { StoryCardTile } from "./StoryGallery";
import type { StoryArticle } from "./types";

const illustrationPositions: Partial<Record<string, number>> = {
  "silvie-i-an-accidental-tumble": 1,
  "rai-i-a-fiery-welcome": 2,
};

function RecapIllustration({ slug }: { slug: string }) {
  const artwork = articleArtwork[slug];
  if (!artwork) return null;

  return (
    <figure className="max-w-prose overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle [&:has(img[hidden])]:hidden">
      <img
        src={artwork.src}
        alt=""
        loading="lazy"
        className="aspect-[2/1] w-full bg-ctp-crust object-contain"
        onError={event => { event.currentTarget.hidden = true; }}
      />
      <figcaption className="px-3 py-2 text-sm text-ctp-subtext0">{artwork.caption}</figcaption>
    </figure>
  );
}

function ChapterEntry({ article, next, grouped }: { article: StoryArticle; next?: StoryArticle; grouped?: boolean }) {
  const [recapOpen, setRecapOpen] = useState(false);
  const { slug, title, summary, quote, recap, kind, note } = article;
  const url = `https://www.gatcg.com/article/${slug}`;
  const illustrationAfter = illustrationPositions[slug] ?? 0;
  const cards = getChapterCards(slug);
  const ChapterHeading = grouped ? "h4" : "h3";
  const GalleryHeading = grouped ? "h5" : "h4";

  return (
    <li id={slug} tabIndex={-1} className="min-w-0 scroll-mt-24 rounded-[1.75rem] rounded-br-[2.5rem] border border-ctp-surface0 bg-ctp-mantle p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue sm:p-6">
      <article aria-labelledby={`${slug}-title`} className="min-w-0">
        {kind && <p className="mb-1 text-sm font-medium text-ctp-subtext0">{kind}</p>}
        <ChapterHeading id={`${slug}-title`} className="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</ChapterHeading>
        {note && <p className="mt-1 text-sm text-ctp-subtext0">{note}</p>}
        <p className="mt-2 max-w-prose leading-relaxed">{summary}</p>
        <blockquote cite={url} className="mt-3 max-w-prose border-s-2 border-ctp-mauve/50 py-1 ps-3 font-serif text-lg leading-snug text-ctp-lavender">
          “{quote}”
        </blockquote>
        <footer className="mt-4 border-t border-ctp-surface1 pt-2">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-2">
            <button
              type="button"
              aria-expanded={recapOpen}
              aria-controls={`${slug}-recap`}
              aria-describedby={`${slug}-recap-note`}
              onClick={() => setRecapOpen(open => !open)}
              className="inline-flex min-h-control items-center gap-1 rounded-full bg-ctp-lavender/15 px-2.5 sm:gap-2 sm:px-3 py-2 text-sm font-semibold text-ctp-lavender hover:bg-ctp-lavender/25 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {recapOpen ? "Hide recap" : "Read recap"}
              <DisclosureChevron className={recapOpen ? "rotate-180" : undefined} />
            </button>
            <a href={url} aria-label={`Read official article: ${title}`} className="inline-flex min-h-control items-center rounded-full px-2 py-2 text-sm font-semibold text-ctp-blue sm:px-3 hover:bg-ctp-blue/10 focus-visible:outline-2 focus-visible:outline-offset-2">
              Official article
            </a>
          </div>
          <p id={`${slug}-recap-note`} className="mt-1 px-3 text-sm text-ctp-subtext0">
            {cards.length ? `Spoilers · ${cards.length} ${cards.length === 1 ? "card" : "cards"}` : "Spoilers"}
          </p>
        </footer>
        <div id={`${slug}-recap`} hidden={!recapOpen} className="mt-3 space-y-4 rounded-[1.25rem] border border-ctp-surface1 bg-ctp-base/65 p-3 leading-relaxed sm:p-4">
          {illustrationAfter === 0 && <RecapIllustration slug={slug} />}
          {recap.map((paragraph, index) => (
            <Fragment key={paragraph}>
              <p className="max-w-prose">{paragraph}</p>
              {illustrationAfter === index + 1 && <RecapIllustration slug={slug} />}
            </Fragment>
          ))}
          {cards.length > 0 && (
            <section aria-labelledby={`${slug}-cards`}>
              <GalleryHeading id={`${slug}-cards`} className="mb-2 font-semibold">Cards in this chapter</GalleryHeading>
              <ul role="list" className="grid gap-2 lg:grid-cols-2">
                {cards.map(card => <StoryCardTile key={card.slug} card={card} />)}
              </ul>
            </section>
          )}
          {next && (
            <Link to={`#${next.slug}`} className="inline-flex min-h-control flex-col justify-center rounded-2xl bg-ctp-lavender/15 px-4 py-2 text-left leading-snug text-ctp-lavender hover:bg-ctp-lavender/25 focus-visible:outline-2">
              <span className="text-sm">Next chapter</span>
              <span className="font-semibold">{next.title}</span>
            </Link>
          )}
        </div>
      </article>
    </li>
  );
}

export function ChapterList({ articles, readingNote, firstMission }: { articles: StoryArticle[]; readingNote?: string; firstMission?: boolean }) {
  const groups = firstMission
    ? [articles.slice(0, 1), articles.slice(1, 5), articles.slice(5)]
    : [articles];

  return (
    <section id="official-reading" aria-labelledby="reading-heading" tabIndex={-1} className="mt-8 scroll-mt-24">
      <h2 id="reading-heading" className="text-3xl font-bold tracking-tight">Official reading order</h2>
      {readingNote && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ctp-subtext0">{readingNote}</p>}
      {groups.map(group => {
        const first = group[0];
        if (!first) return null;
        const start = articles.indexOf(first);
        const isMission = firstMission && start === 1;
        const list = (
          <ol role="list" start={start + 1} className="mt-4 space-y-4">
            {group.map((article, index) => <ChapterEntry key={article.slug} article={article} next={articles[start + index + 1]} grouped={isMission} />)}
          </ol>
        );

        return isMission ? (
          <section key={first.slug} aria-labelledby="first-mission-heading" className="mt-5 rounded-[2rem] rounded-br-[3rem] bg-ctp-lavender/10 p-3 sm:p-5">
            <h3 id="first-mission-heading" className="text-2xl font-bold tracking-tight">The first mission</h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ctp-subtext1">Lorraine, Silvie, Rai, and Zander tell different sides of the same deployment.</p>
            {list}
          </section>
        ) : <Fragment key={first.slug}>{list}</Fragment>;
      })}
    </section>
  );
}
