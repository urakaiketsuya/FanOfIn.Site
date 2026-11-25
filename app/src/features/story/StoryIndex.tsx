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
                className={`flex min-h-control items-center rounded-md border-l-2 border-transparent px-3 py-2 text-sm leading-snug hover:bg-ctp-surface0 aria-[current=location]:border-ctp-blue aria-[current=location]:bg-ctp-surface0 aria-[current=location]:font-semibold ${focusRing}`}
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
    <div className={`relative overflow-hidden rounded-xl bg-ctp-surface0 [&:has(>img[hidden])]:hidden ${compact ? "h-20 w-20 shrink-0 sm:h-24 sm:w-24" : "aspect-[2.25/1] sm:aspect-[2.8/1]"}`}>
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

function WorldTimeline() {
  return (
    <section aria-labelledby="story-route-title" className="min-w-0">
      <h2 id="story-route-title" className="text-2xl font-semibold">The journey</h2>
      <p className="mt-1 text-sm text-ctp-subtext0">Recommended reading order</p>
      <ol role="list" className="relative mt-6 pl-5 sm:pl-8">
        {storyArcs.map(world => {
          const isPrologue = world.id === "homeworld";
          const isReturn = world.id === "radiant-origins";
          const isArchive = isPrologue || isReturn;
          return (
            <li key={world.id} className="relative pb-8 after:pointer-events-none after:absolute after:top-4 after:-bottom-4 after:-left-4 after:w-px after:bg-ctp-lavender/40 last:pb-0 last:after:hidden sm:pb-12 sm:after:-left-6">
              <span aria-hidden="true" className={`pointer-events-none absolute top-2 -left-[21px] z-10 size-[11px] border-2 border-ctp-base sm:-left-[29px] ${isArchive ? "rotate-45 rounded-xs bg-ctp-yellow" : "rounded-full bg-ctp-lavender"}`} />
              <article id={stopId(world.id)} tabIndex={-1} aria-labelledby={`${stopId(world.id)}-title`} className={`scroll-mt-24 rounded-xl ${focusRing} ${isPrologue ? "flex items-start gap-4 rounded-xl bg-ctp-mantle p-3 sm:p-4" : ""}`}>
                <WorldArt id={world.id} compact={isPrologue} />
                <div className={isPrologue ? "min-w-0" : "mt-3"}>
                  <p className={`text-sm ${isArchive ? "font-medium text-ctp-yellow" : "text-ctp-subtext0"}`}>{isPrologue ? "Prologue" : world.sets}</p>
                  <h3 id={`${stopId(world.id)}-title`} className={`mt-1 font-semibold tracking-tight ${isPrologue ? "text-xl" : "text-2xl sm:text-3xl"}`}>{world.name}</h3>
                  <p className="mt-1 max-w-prose leading-relaxed text-ctp-subtext1">{storyHooks[world.id]}</p>
                  <Link to={`/story/${world.id}`} className={`mt-1 inline-flex min-h-control items-center rounded font-semibold text-ctp-blue underline-offset-4 hover:underline ${focusRing}`}>
                    {isPrologue ? "Read the prologue" : `Read ${world.name}`}
                  </Link>
                </div>
              </article>
              {isPrologue && <p className="mt-3 text-sm font-medium text-ctp-lavender">The Champions’ first mission</p>}
              {world.id === "cambria" && tristanLink && (
                <Link to={tristanLink.to} className={`mt-3 inline-flex min-h-control items-center rounded border-l-2 border-dashed border-ctp-mauve px-3 text-sm font-medium text-ctp-mauve underline-offset-4 hover:underline ${focusRing}`}>
                  Follow Tristan to Diana I in Azoth
                </Link>
              )}
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
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Grand Archive Story</h1>
        <Link to="/story/cambria" className={`mt-4 inline-flex min-h-control items-center rounded-md bg-ctp-blue px-4 font-semibold text-ctp-base hover:opacity-90 active:opacity-80 ${focusRing}`}>
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
