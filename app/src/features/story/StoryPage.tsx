import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import NotFound from "../../pages/NotFound";
import { storyArcs, storyHooks } from "./arcs";
import { arcArtwork } from "./artwork";
import { storyCards } from "./cards";
import { ChapterList } from "./ChapterList";
import { CardGallery, FeaturedCards } from "./StoryGallery";
import { StoryIndex } from "./StoryIndex";

const storyLink = "inline-flex min-h-control min-w-control items-center rounded text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2";
const firstCambriaCards = ["lorraine-wandering-warrior", "silvie-wilds-whisperer", "camelot-impenetrable"];

function NextWorld({ arc }: { arc: (typeof storyArcs)[number] }) {
  const artwork = arcArtwork[arc.id];
  return (
    <Link to={`/story/${arc.id}`} className="group mt-8 grid overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue sm:grid-cols-[2fr_3fr] sm:[&:not(:has(img:not([hidden])))]:grid-cols-1">
      {artwork && <img src={artwork} alt="" loading="lazy" className="aspect-[3/1] h-full min-h-24 w-full object-cover sm:aspect-auto" onError={event => { event.currentTarget.hidden = true; }} />}
      <div className="p-4 sm:p-6">
        <p className="text-sm font-medium text-ctp-subtext0">Next world</p>
        <p className="mt-1 text-xl font-semibold text-ctp-blue group-hover:underline">{arc.name}</p>
        <p className="mt-1 text-sm leading-relaxed">{storyHooks[arc.id]}</p>
      </div>
    </Link>
  );
}

function ArcPage({ arc, index }: { arc: (typeof storyArcs)[number]; index: number }) {
  const nextArc = storyArcs[index + 1];
  const artwork = arcArtwork[arc.id];
  const cards = storyCards[arc.id] ?? [];
  const featuredCards = arc.id === "cambria"
    ? cards.filter(card => firstCambriaCards.includes(card.slug))
    : cards.length >= 3 ? cards.slice(0, 3) : [];
  useDocumentTitle(`${arc.name} · Grand Archive Story`, arc.summary);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="In this world" className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto p-1">
          <Link to="/story" className={`${storyLink} text-sm`}>All worlds</Link>
          <p className="mt-2 font-semibold">In this world</p>
          <ul className="mt-2">
            {arc.articles.map(article => (
              <li key={article.slug}>
                <Link to={`#${article.slug}`} className={`${storyLink} w-full py-2 pr-2 text-sm leading-snug`}>{article.title}</Link>
              </li>
            ))}
            {cards.length > 0 && <li><Link to="#story-gallery" className={`${storyLink} text-sm`}>Card gallery</Link></li>}
          </ul>
        </div>
      </nav>
      <div className="min-w-0">
        <header>
          <Link to="/story" className={`${storyLink} mb-1 text-sm lg:hidden`}>All worlds</Link>
          <div className={artwork ? "relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-xl bg-ctp-crust p-4 text-white sm:min-h-64 sm:p-6" : undefined}>
            {artwork && (
              <>
                <img src={artwork} alt="" className={`absolute inset-0 -z-20 size-full object-cover ${arc.id === "cambria" ? "object-[center_25%]" : ""}`} onError={event => { event.currentTarget.hidden = true; }} />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/95 via-black/55 to-black/5" />
              </>
            )}
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{arc.name}</h1>
            {arc.sets && <p className={`mt-2 text-sm ${artwork ? "text-white" : "text-ctp-subtext0"}`}>{arc.sets}</p>}
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed">{arc.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to={`#${arc.articles[0]?.slug ?? "official-reading"}`}
              className="inline-flex min-h-control items-center rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
            >
              Start reading
            </Link>
            {cards.length > 0 && featuredCards.length === 0 && <Link to="#story-gallery" className={`${storyLink} text-sm`}>Card gallery</Link>}
          </div>
        </header>
        {featuredCards.length > 0 && <FeaturedCards cards={featuredCards} />}
        <ChapterList articles={arc.articles} readingNote={arc.readingNote} />
        <CardGallery cards={cards} />
        {arc.related && <section aria-labelledby="related-stories" className="mt-6">
          <h2 id="related-stories" className="text-lg font-semibold">Related stories</h2>
          <ul>{arc.related.map(link => <li key={link.to}><Link to={link.to} className={storyLink}>{link.label}</Link></li>)}</ul>
        </section>}
        {nextArc && <NextWorld arc={nextArc} />}
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
