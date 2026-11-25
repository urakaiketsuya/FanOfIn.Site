import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { storyArcs } from "./arcs";
import { arcArtwork } from "./artwork";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
const [prologue] = storyArcs;

function WorldArt({ id, className, eager = false }: { id: string; className: string; eager?: boolean }) {
  const src = arcArtwork[id];
  if (!src) return null;

  return (
    <div className={`relative overflow-hidden bg-ctp-surface0 [&:has(>img[hidden])]:hidden ${className}`}>
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        className={`absolute inset-0 size-full object-cover ${id === "cambria" ? "object-[center_25%]" : ""}`}
        onError={event => { event.currentTarget.hidden = true; }}
      />
    </div>
  );
}

function WorldJourney() {
  const railRef = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateEdges = () => {
      const previous = rail.scrollLeft > 1;
      const next = rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 1;
      setEdges(current => current.previous === previous && current.next === next ? current : { previous, next });
    };

    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    rail.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", updateEdges);
    };
  }, []);

  function scrollWorld(direction: -1 | 1) {
    const rail = railRef.current;
    const first = rail?.children[0];
    const second = rail?.children[1];
    if (!rail || !first || !second) return;
    const stride = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    rail.scrollBy({
      left: direction * stride,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <section aria-labelledby="story-route-title" className="mt-9 sm:mt-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="story-route-title" className="text-2xl font-semibold">The journey</h2>
          <p className="mt-1 text-sm text-ctp-subtext0">Recommended reading order</p>
        </div>
        <div className="flex gap-2">
          <Button aria-label="Scroll to earlier worlds" aria-controls="story-worlds" disabled={!edges.previous} onClick={() => scrollWorld(-1)}>
            <span aria-hidden="true">←</span>
          </Button>
          <Button aria-label="Scroll to later worlds" aria-controls="story-worlds" disabled={!edges.next} onClick={() => scrollWorld(1)}>
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
      <div className="relative">
        <ol
          id="story-worlds"
          role="list"
          ref={railRef}
          className="relative grid snap-x snap-proximity auto-cols-[82%] grid-flow-col items-start gap-4 overflow-x-auto overscroll-x-contain scroll-px-1 px-1 pt-1 pb-3 sm:auto-cols-[19rem] sm:gap-5 lg:auto-cols-[21rem]"
        >
          {storyArcs.map(world => (
            <Panel
              as="li"
              key={world.id}
              padding="none"
              className="relative min-w-0 snap-start after:pointer-events-none after:absolute after:left-full after:top-16 after:w-4 after:border-t after:border-ctp-lavender/50 last:after:hidden sm:after:w-5"
            >
              <Link
                to={`/story/${world.id}`}
                aria-labelledby={`story-stop-${world.id}`}
                className={`group flex min-h-control flex-col overflow-hidden rounded-xl hover:bg-ctp-surface0 active:bg-ctp-surface1 ${focusRing}`}
              >
                <WorldArt id={world.id} className="aspect-[16/9] w-full shrink-0" />
                <div className="min-w-0 p-4 sm:p-5">
                  <h3 id={`story-stop-${world.id}`} className="break-words text-xl font-semibold text-ctp-blue group-hover:underline group-focus-visible:underline">
                    {world.name}
                  </h3>
                  <p className="mt-1 text-sm text-ctp-subtext0">{world.sets ?? "Prologue"}</p>
                  <p className="mt-2 leading-relaxed text-ctp-subtext1">{world.summary}</p>
                </div>
              </Link>
            </Panel>
          ))}
        </ol>
        {edges.previous && <div aria-hidden="true" data-scroll-edge="previous" className="pointer-events-none absolute top-0 bottom-3 left-0 w-6 bg-linear-to-r from-ctp-base via-ctp-base/65 to-transparent sm:w-10" />}
        {edges.next && <div aria-hidden="true" data-scroll-edge="next" className="pointer-events-none absolute top-0 right-0 bottom-3 w-6 bg-linear-to-l from-ctp-base via-ctp-base/65 to-transparent sm:w-10" />}
      </div>
    </section>
  );
}

export function StoryIndex() {
  useDocumentTitle("Grand Archive Story", "Follow the Champions through the worlds of Grand Archive.");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Grand Archive Story</h1>
        <Panel padding="none" className="mt-5 grid overflow-hidden md:grid-cols-2 md:[&:not(:has(img:not([hidden])))]:grid-cols-1">
          <WorldArt id={prologue.id} eager className="aspect-[2/1] md:aspect-auto" />
          <div className="p-4 sm:p-6">
            <p className="text-sm font-semibold text-ctp-lavender">Prologue</p>
            <h2 className="mt-1 text-2xl font-semibold">{prologue.name}</h2>
            <p className="mt-2 max-w-prose leading-relaxed text-ctp-subtext1">{prologue.summary}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/story/cambria" className={`inline-flex min-h-control items-center rounded-md bg-ctp-blue px-4 font-semibold text-ctp-base hover:opacity-90 active:opacity-80 ${focusRing}`}>
                Start with Cambria
              </Link>
              <Link to="/story/homeworld" className={`inline-flex min-h-control items-center rounded px-2 text-sm font-semibold text-ctp-blue hover:underline ${focusRing}`}>
                Read the prologue
              </Link>
            </div>
          </div>
        </Panel>
      </header>

      <WorldJourney />
    </div>
  );
}
