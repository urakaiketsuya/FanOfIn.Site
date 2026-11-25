import { Fragment } from "react";
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

function ChapterEntry({ article }: { article: StoryArticle }) {
  const { slug, title, summary, quote, recap, kind, note } = article;
  const url = `https://www.gatcg.com/article/${slug}`;
  const illustrationAfter = illustrationPositions[slug] ?? 0;
  const cards = getChapterCards(slug);

  return (
    <li id={slug} tabIndex={-1} className="relative min-w-0 scroll-mt-24 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue">
      <span aria-hidden="true" className="absolute -left-[1.5625rem] top-2 size-3 rounded-full border-2 border-ctp-base bg-ctp-blue sm:-left-[2.0625rem]" />
      <article aria-labelledby={`${slug}-title`} className="min-w-0">
        {kind && <p className="mb-1 text-sm font-medium text-ctp-subtext0">{kind}</p>}
        <h3 id={`${slug}-title`} className="break-words text-xl font-semibold">{title}</h3>
        {note && <p className="mt-1 text-sm text-ctp-subtext0">{note}</p>}
        <p className="mt-2 max-w-prose leading-relaxed">{summary}</p>
        <blockquote cite={url} className="mt-3 max-w-prose border-l-2 border-ctp-mauve pl-3 font-serif text-lg leading-snug text-ctp-lavender">
          “{quote}”
        </blockquote>
        <details className="group mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle">
          <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue sm:px-4 [&::-webkit-details-marker]:hidden">
            <span>Read recap <span className="text-ctp-subtext0">· {cards.length ? `${cards.length} ${cards.length === 1 ? "card" : "cards"} · ` : ""}spoilers</span></span>
            <DisclosureChevron className="group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-ctp-surface1 px-3 pt-4 leading-relaxed sm:px-4">
            {illustrationAfter === 0 && <RecapIllustration slug={slug} />}
            {recap.map((paragraph, index) => (
              <Fragment key={paragraph}>
                <p className="max-w-prose">{paragraph}</p>
                {illustrationAfter === index + 1 && <RecapIllustration slug={slug} />}
              </Fragment>
            ))}
            {cards.length > 0 && (
              <section aria-labelledby={`${slug}-cards`}>
                <h4 id={`${slug}-cards`} className="mb-2 font-semibold">Article card gallery</h4>
                <ul role="list" className="grid gap-2 lg:grid-cols-2">
                  {cards.map(card => <StoryCardTile key={card.slug} card={card} />)}
                </ul>
              </section>
            )}
            <a href={url} aria-label={`Read official article: ${title}`} className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2">
              Read official article
            </a>
          </div>
        </details>
      </article>
    </li>
  );
}

export function ChapterList({ articles, readingNote }: { articles: StoryArticle[]; readingNote?: string }) {
  return (
    <section id="official-reading" aria-labelledby="reading-heading" tabIndex={-1} className="mt-8 scroll-mt-24">
      <h2 id="reading-heading" className="text-2xl font-semibold">Official reading order</h2>
      {readingNote && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ctp-subtext0">{readingNote}</p>}
      <ol role="list" className="ml-1.5 mt-6 space-y-8 border-l border-ctp-surface1 pl-5 sm:space-y-10 sm:pl-7">
        {articles.map(article => <ChapterEntry key={article.slug} article={article} />)}
      </ol>
    </section>
  );
}
