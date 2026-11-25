import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import NotFound from "../../pages/NotFound";
import { storyArcs, storyHooks } from "./arcs";
import { arcArtwork } from "./artwork";
import { storyCards } from "./cards";
import { ChapterList } from "./ChapterList";
import { CardGallery, FeaturedCards } from "./StoryGallery";
import { StoryIndex } from "./StoryIndex";
import { storySocialImage } from "./storySeo";

const storyLink = "inline-flex min-h-control min-w-control items-center rounded text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2";
const firstCambriaCards = ["lorraine-wandering-warrior", "silvie-wilds-whisperer", "camelot-impenetrable"];

type World = (typeof storyArcs)[number];

function ChapterOutline({ arc, hasCards }: { arc: World; hasCards: boolean }) {
  const [activeSlug, setActiveSlug] = useState<string>();

  useEffect(() => {
    const content = document.getElementById("world-content");
    if (!content) return;
    const targets = [...arc.articles.map(article => article.slug), "story-gallery"]
      .flatMap(slug => {
        const element = document.getElementById(slug);
        return element ? [element] : [];
      });
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = Math.max(144, window.innerHeight * 0.2);
      setActiveSlug(targets.findLast(target => target.getBoundingClientRect().top <= readingLine)?.id);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [arc]);

  return (
    <nav aria-label="In this world" className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto p-1">
        <Link to="/story" className={`${storyLink} text-sm`}>All worlds</Link>
        <p className="mt-2 px-3 font-semibold">In this world</p>
        <ul className="mt-2">
          {[
            ...arc.articles.map(({ slug, title }) => ({ slug, title })),
            ...(hasCards ? [{ slug: "story-gallery", title: "Card gallery" }] : []),
          ].map(({ slug, title }) => (
            <li key={slug}>
              <Link
                to={`#${slug}`}
                aria-current={activeSlug === slug ? "location" : undefined}
                className="flex min-h-control items-center rounded-2xl px-3 py-2 text-sm leading-snug hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue aria-[current=location]:bg-ctp-lavender/20 aria-[current=location]:font-semibold aria-[current=location]:text-ctp-lavender"
              >{title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function ChapterPicker({ articles }: { articles: World["articles"] }) {
  if (articles.length < 2) return null;

  return (
    <details className="group mt-3 rounded-[1.25rem] border border-ctp-surface1 lg:hidden">
      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded-[1.25rem] px-4 font-semibold text-ctp-lavender focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        Jump to chapter
        <DisclosureChevron className="group-open:rotate-180" />
      </summary>
      <nav aria-label="Chapters" className="border-t border-ctp-surface1 p-2">
        <ul>
          {articles.map(({ slug, title }) => (
            <li key={slug}>
              <Link
                to={`#${slug}`}
                className={`${storyLink} w-full px-2 py-2 text-sm`}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  if (window.location.hash === `#${slug}`) {
                    const target = document.getElementById(slug);
                    target?.focus({ preventScroll: true });
                    target?.scrollIntoView({ block: "start" });
                  }
                }}
              >{title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

function NextWorld({ arc }: { arc: (typeof storyArcs)[number] }) {
  const artwork = arcArtwork[arc.id];
  return (
    <Link to={`/story/${arc.id}`} className="group mt-8 grid overflow-hidden rounded-[1.75rem] rounded-br-[2.5rem] border border-ctp-surface1 bg-ctp-mantle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue sm:grid-cols-[2fr_3fr] sm:[&:not(:has(img:not([hidden])))]:grid-cols-1">
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
  useDocumentTitle(`${arc.name} · Grand Archive Story`, arc.summary, `/story/${arc.id}`, storySocialImage(arc.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <ChapterOutline arc={arc} hasCards={cards.length > 0} />
      <div id="world-content" className="min-w-0">
        <header>
          <Link to="/story" className={`${storyLink} mb-1 text-sm lg:hidden`}>All worlds</Link>
          <div className={artwork ? "relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-[1.75rem] rounded-br-[3rem] bg-ctp-crust p-5 text-white sm:min-h-64 sm:p-8" : undefined}>
            {artwork && (
              <>
                <img src={artwork} alt="" className={`absolute inset-0 -z-20 size-full object-cover ${arc.id === "cambria" ? "object-[center_25%]" : ""}`} onError={event => { event.currentTarget.hidden = true; }} />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/95 via-black/55 to-black/5" />
              </>
            )}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-6xl">{arc.name}</h1>
            {arc.sets && <p className={`mt-2 text-sm ${artwork ? "text-white" : "text-ctp-subtext0"}`}>{arc.sets}</p>}
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed">{arc.summary}</p>
          {arc.championsMentioned && (
            <div className="mt-4">
              <p id="world-champions-label" className="text-sm font-semibold text-ctp-subtext1">Champions mentioned</p>
              <ul aria-labelledby="world-champions-label" role="list" className="mt-2 flex flex-wrap gap-2">
                {arc.championsMentioned.map(name => (
                  <li key={name} className="rounded-2xl bg-ctp-mauve/15 px-3 py-1 text-sm font-medium">{name}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to={`#${arc.articles[0]?.slug ?? "official-reading"}`}
              className="inline-flex min-h-control items-center rounded-full bg-ctp-blue px-6 font-semibold text-ctp-base hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
            >
              Start reading
            </Link>
            {cards.length > 0 && featuredCards.length === 0 && <Link to="#story-gallery" className={`${storyLink} text-sm`}>Card gallery</Link>}
          </div>
          <ChapterPicker articles={arc.articles} />
        </header>
        {featuredCards.length > 0 && <FeaturedCards cards={featuredCards} />}
        <ChapterList articles={arc.articles} readingNote={arc.readingNote} firstMission={arc.id === "cambria"} />
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
