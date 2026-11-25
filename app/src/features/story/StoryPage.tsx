import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import NotFound from "../../pages/NotFound";
import { storyArcs } from "./arcs";
import { storyCards } from "./cards";
import type { StoryArticle, StoryCard } from "./types";

const storyLink = "inline-flex min-h-control min-w-control items-center rounded text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2";
const articleUrl = (slug: string) => `https://www.gatcg.com/article/${slug}`;

function ArticleEntry({ article }: { article: StoryArticle }) {
  const { slug, title, summary, quote, recap, kind, note } = article;
  const url = articleUrl(slug);

  return (
    <li id={slug} tabIndex={-1} className="scroll-mt-24">
      <Panel as="article" aria-labelledby={`${slug}-title`}>
        {kind && <p className="text-xs font-medium text-ctp-subtext0">{kind}</p>}
        <h3 id={`${slug}-title`} className="mt-1 break-words text-lg font-semibold">{title}</h3>
        {note && <p className="mt-1 text-sm text-ctp-subtext0">{note}</p>}
        <p className="mt-2 leading-relaxed">{summary}</p>
        <blockquote cite={url} className="mt-3 border-l-2 border-ctp-mauve pl-3 font-serif text-lg leading-snug text-ctp-lavender">
          “{quote}”
        </blockquote>
        <details className="group mt-3 border-t border-ctp-surface1">
          <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-medium text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
            <span>Full recap <span className="text-ctp-subtext0">· spoilers</span></span>
            <DisclosureChevron className="group-open:rotate-180" />
          </summary>
          <div className="space-y-3 pb-2 leading-relaxed">
            {recap.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </details>
        <a href={url} aria-label={`Read official article: ${title}`} className={`${storyLink} text-sm`}>Read official article</a>
      </Panel>
    </li>
  );
}

function StoryCardTile({ card }: { card: StoryCard }) {
  return (
    <Panel as="li" padding="sm">
      <Link
        to={`/cards/${card.slug}?edition=${card.editionUuid}`}
        aria-label={card.name}
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"
      >
        <CardArtTile card={undefined} imagePath={card.image} name={card.name} />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-ctp-blue">{card.name}</p>
          <p className="mt-1 text-xs text-ctp-subtext0">{card.printing}</p>
          <p className="mt-1 text-sm leading-snug">{card.caption}</p>
        </div>
      </Link>
    </Panel>
  );
}

function CardGallery({ cards }: { cards: StoryCard[] }) {
  return (["Character", "Location", "Object"] as const).map(kind => {
    const highlights = cards.filter(card => card.kind === kind);
    if (!highlights.length) return null;
    const id = `story-${kind.toLowerCase()}s`;
    return (
      <section key={kind} aria-labelledby={id} className="mt-8">
        <h2 id={id} className="mb-3 text-xl font-semibold">{kind}s</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {highlights.map(card => <StoryCardTile key={card.slug} card={card} />)}
        </ul>
      </section>
    );
  });
}

function StoryIndex() {
  useDocumentTitle("Grand Archive Story", "Explore the worlds, characters, and official stories of Grand Archive.");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Grand Archive Story</h1>
        <p className="mt-3 text-ctp-subtext1">{storyArcs[0].summary}</p>
        <Link to="/story/cambria" className="mt-4 inline-flex min-h-control items-center rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Start with Cambria</Link>
      </header>
      <h2 className="mb-3 text-xl font-semibold">Explore by world</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {storyArcs.map(arc => {
          const cover = storyCards[arc.id]?.[0];
          return (
            <Panel as="li" key={arc.id} padding="sm">
              <Link to={`/story/${arc.id}`} className="flex min-h-control items-center gap-4 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
                {cover && <div className="w-16 shrink-0"><CardArtTile card={undefined} imagePath={cover.image} name={cover.name} /></div>}
                <div>
                  <h3 className="font-semibold text-ctp-blue">{arc.name}</h3>
                  {arc.sets && <p className="text-xs text-ctp-subtext0">{arc.sets}</p>}
                  <p className="mt-1 text-sm leading-snug">{arc.summary}</p>
                </div>
              </Link>
            </Panel>
          );
        })}
      </ul>
    </div>
  );
}

function ArcPage({ arc, index }: { arc: (typeof storyArcs)[number]; index: number }) {
  const nextArc = storyArcs[index + 1];
  useDocumentTitle(`${arc.name} · Grand Archive Story`, arc.summary);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="Story arcs" className="hidden lg:block">
        <div className="sticky top-24">
          <Link to="/story" className={`${storyLink} font-semibold`}>Grand Archive Story</Link>
          <ul>{storyArcs.map(item => <li key={item.id}><Link to={`/story/${item.id}`} aria-current={item.id === arc.id ? "page" : undefined} className={`${storyLink} w-full px-2 text-sm ${item.id === arc.id ? "bg-ctp-surface0" : ""}`}>{item.name}</Link></li>)}</ul>
        </div>
      </nav>
      <div className="min-w-0">
        <header>
          <Link to="/story" className={`${storyLink} mb-1 text-sm lg:hidden`}>All worlds</Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{arc.name}</h1>
          {arc.sets && <p className="mt-2 text-sm text-ctp-subtext0">{arc.sets}</p>}
          <p className="mt-4 max-w-2xl leading-relaxed">{arc.summary}</p>
          <Link to="#official-reading" className={`${storyLink} mt-1 text-sm`}>Jump to reading order</Link>
        </header>
        <CardGallery cards={storyCards[arc.id] ?? []} />
        <section aria-labelledby="reading-heading" id="official-reading" tabIndex={-1} className="mt-8 scroll-mt-24">
          <h2 id="reading-heading" className="mb-3 text-xl font-semibold">Official reading order</h2>
          {arc.readingNote && <p className="mb-3 text-sm text-ctp-subtext0">{arc.readingNote}</p>}
          <ol className="space-y-3">{arc.articles.map(article => <ArticleEntry key={article.slug} article={article} />)}</ol>
        </section>
        {arc.related && <section aria-labelledby="related-stories" className="mt-6">
          <h2 id="related-stories" className="text-lg font-semibold">Related stories</h2>
          <ul>{arc.related.map(link => <li key={link.to}><Link to={link.to} className={storyLink}>{link.label}</Link></li>)}</ul>
        </section>}
        {nextArc && <Link to={`/story/${nextArc.id}`} className={`${storyLink} mt-6 font-semibold`}>Next world · {nextArc.name}</Link>}
      </div>
    </div>
  );
}

export default function StoryPage() {
  const { arc } = useParams();
  const { hash } = useLocation();
  const index = storyArcs.findIndex(item => item.id === arc);

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const target = document.getElementById(hash.slice(1));
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [arc, hash]);

  if (!arc) return <StoryIndex />;
  if (index < 0) return <NotFound />;
  return <ArcPage key={arc} arc={storyArcs[index]} index={index} />;
}
