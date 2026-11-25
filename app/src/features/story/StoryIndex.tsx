import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { storyArcs, storyHooks } from "./arcs";
import { arcArtwork } from "./artwork";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
const stopId = (id: string) => `story-stop-${id}`;
const tristanLink = storyArcs.find(arc => arc.id === "cambria")?.related?.[0];

function WorldOutline() {
  const [activeId, setActiveId] = useState(storyArcs[0].id);

  useEffect(() => {
    const stops = storyArcs.flatMap(arc => {
      const stop = document.getElementById(stopId(arc.id));
      return stop ? [{ id: arc.id, stop }] : [];
    });
    let frame = 0;

    const update = () => {
      frame = 0;
      const readingLine = Math.max(150, window.innerHeight * 0.25);
      const current = stops.findLast(({ stop }) => stop.getBoundingClientRect().top <= readingLine);
      const atBottom = window.scrollY > 0 && document.documentElement.scrollHeight - window.innerHeight - window.scrollY <= 2;
      setActiveId((atBottom ? stops.at(-1) : current ?? stops[0])?.id ?? storyArcs[0].id);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="World timeline" className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto p-1">
        <p className="mb-2 px-3 text-sm font-semibold text-ctp-subtext0">Reading order</p>
        <ul>
          {storyArcs.map(arc => (
            <li key={arc.id}>
              <Link
                to={`#${stopId(arc.id)}`}
                aria-current={arc.id === activeId ? "location" : undefined}
                className={`flex min-h-control items-center rounded-full px-4 py-2 text-sm leading-snug hover:bg-ctp-surface0 aria-[current=location]:bg-ctp-lavender/20 aria-[current=location]:font-semibold aria-[current=location]:text-ctp-lavender ${focusRing}`}
              >
                {arc.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function WorldArt({ id, compact }: { id: string; compact: boolean }) {
  const src = arcArtwork[id];
  if (!src) return null;

  return (
    <div className={`relative overflow-hidden bg-ctp-surface0 [&:has(>img[hidden])]:hidden ${compact ? "h-20 w-20 shrink-0 rounded-[1.25rem] rounded-br-[2rem] sm:h-28 sm:w-28" : "aspect-[2.25/1] sm:aspect-[2.8/1]"}`}>
      <img
        src={src}
        alt=""
        loading={compact || id === "cambria" ? "eager" : "lazy"}
        className={`absolute inset-0 size-full object-cover ${id === "cambria" ? "object-[center_25%]" : ""}`}
        onError={event => { event.currentTarget.hidden = true; }}
      />
    </div>
  );
}

function WorldTransition({ from, to }: { from: string; to: string }) {
  const isFirstMission = from === "homeworld";
  const isReturn = to === "radiant-origins";
  const branch = from === "cambria" ? tristanLink : undefined;
  const tone = isFirstMission || isReturn ? "bg-ctp-yellow/20 text-ctp-yellow" : "bg-ctp-lavender/20 text-ctp-lavender";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
      <div className="col-start-2 flex flex-col items-center" aria-hidden="true">
        <span className="h-5 w-0.5 bg-ctp-lavender/40" />
        <span className={`grid size-10 place-items-center rounded-[0.9rem_1.3rem] ${tone}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
        <span className="h-5 w-0.5 bg-ctp-lavender/40" />
      </div>
      {isFirstMission && (
        <p className="ml-2 text-sm font-medium leading-snug text-ctp-yellow sm:ml-4">The Champions’ first mission</p>
      )}
      {branch && (
        <div className="col-span-3 row-start-2 flex flex-col items-center">
          <Link to={branch.to} className={`inline-flex min-h-control items-center rounded-full bg-ctp-mauve/15 px-4 py-2 text-center text-sm font-semibold text-ctp-mauve hover:bg-ctp-mauve/25 active:bg-ctp-mauve/35 ${focusRing}`}>
            Follow Tristan to Diana I in Azoth
          </Link>
          <span aria-hidden="true" className="h-5 w-0.5 bg-ctp-lavender/40" />
        </div>
      )}
    </div>
  );
}

function WorldTimeline() {
  return (
    <section aria-labelledby="story-route-title" className="min-w-0">
      <h2 id="story-route-title" className="text-3xl font-semibold tracking-tight">The journey</h2>
      <p className="mt-1 text-sm text-ctp-subtext0">Recommended reading order</p>
      <ol role="list" className="mt-5">
        {storyArcs.map((world, index) => {
          const previous = storyArcs[index - 1];
          const isPrologue = world.id === "homeworld";
          const isArchive = isPrologue || world.id === "radiant-origins";
          const actionTone = isArchive
            ? "bg-ctp-yellow/15 text-ctp-yellow hover:bg-ctp-yellow/25 active:bg-ctp-yellow/35"
            : "bg-ctp-lavender/15 text-ctp-lavender hover:bg-ctp-lavender/25 active:bg-ctp-lavender/35";
          return (
            <li key={world.id}>
              {previous && <WorldTransition from={previous.id} to={world.id} />}
              <article
                id={stopId(world.id)}
                tabIndex={-1}
                aria-labelledby={`${stopId(world.id)}-title`}
                className={`scroll-mt-24 overflow-hidden rounded-[1.75rem] rounded-br-[2.5rem] border sm:rounded-[2rem] sm:rounded-br-[3.5rem] ${focusRing} ${isArchive ? "border-ctp-yellow/20 bg-ctp-yellow/5" : "border-ctp-surface0 bg-ctp-mantle"} ${isPrologue ? "flex items-start gap-3 p-3 sm:gap-5 sm:p-5" : ""}`}
              >
                <WorldArt id={world.id} compact={isPrologue} />
                <div className={isPrologue ? "min-w-0 py-1" : "px-5 py-5 sm:px-8 sm:py-6"}>
                  <p className={`text-sm ${isArchive ? "font-medium text-ctp-yellow" : "text-ctp-subtext0"}`}>{isPrologue ? "Prologue" : world.sets}</p>
                  <h3 id={`${stopId(world.id)}-title`} className={`mt-1 font-bold leading-tight tracking-tight text-balance ${isPrologue ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>{world.name}</h3>
                  <p className="mt-2 max-w-prose leading-relaxed text-ctp-subtext1">{storyHooks[world.id]}</p>
                  {world.travelers && (
                    <div className="mt-4">
                      <p id={`${stopId(world.id)}-travelers`} className="text-sm font-semibold text-ctp-subtext1">
                        {isArchive ? "Who returns" : "Who travels here"}
                      </p>
                      <ul aria-labelledby={`${stopId(world.id)}-travelers`} role="list" className="mt-2 flex flex-wrap gap-2">
                        {world.travelers.map(name => (
                          <li key={name} className="rounded-2xl bg-ctp-mauve/15 px-3 py-1 text-sm font-medium text-ctp-text">{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link to={`/story/${world.id}`} className={`mt-3 inline-flex min-h-control items-center rounded-full px-4 py-2 font-semibold leading-snug ${actionTone} ${focusRing}`}>
                    {isPrologue ? "Read the prologue" : `Read ${world.name}`}
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StoryIndex() {
  useDocumentTitle("Grand Archive Story", "Follow the Champions through the worlds of Grand Archive.");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-6xl">Grand Archive Story</h1>
        <Link to="/story/cambria" className={`mt-4 inline-flex min-h-control items-center rounded-full bg-ctp-blue px-6 font-semibold text-ctp-base hover:opacity-90 active:opacity-80 ${focusRing}`}>
          Start with Cambria
        </Link>
      </header>
      <div className="mt-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
        <WorldOutline />
        <WorldTimeline />
      </div>
    </div>
  );
}
