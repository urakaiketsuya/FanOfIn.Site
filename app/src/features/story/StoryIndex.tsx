import { Link } from "react-router-dom";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { storyArcs } from "./arcs";
import { arcArtwork } from "./artwork";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
const [prologue, ...worlds] = storyArcs;

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

      <section aria-labelledby="story-route-title" className="mt-9 sm:mt-12">
        <h2 id="story-route-title" className="mb-4 text-2xl font-semibold">The journey</h2>
        <ol className="relative space-y-4 pl-5 before:absolute before:bottom-6 before:left-[5px] before:top-6 before:w-px before:bg-ctp-lavender/40 sm:pl-7">
          {worlds.map(world => (
            <Panel as="li" key={world.id} padding="none" className="relative before:absolute before:left-[-20px] before:top-5 before:size-2.5 before:rounded-full before:border-2 before:border-ctp-base before:bg-ctp-lavender sm:before:left-[-28px]">
              <Link
                to={`/story/${world.id}`}
                aria-labelledby={`story-stop-${world.id}`}
                className={`group grid min-h-control overflow-hidden rounded-xl hover:bg-ctp-surface0 active:bg-ctp-surface1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:[&:not(:has(img:not([hidden])))]:grid-cols-1 ${focusRing}`}
              >
                <WorldArt id={world.id} className="aspect-[2.25/1] sm:aspect-auto" />
                <div className="min-w-0 p-4 sm:px-6 sm:py-5">
                  <h3 id={`story-stop-${world.id}`} className="break-words text-xl font-semibold text-ctp-blue group-hover:underline group-focus-visible:underline">
                    {world.name}
                  </h3>
                  {world.sets && <p className="mt-1 text-sm text-ctp-subtext0">{world.sets}</p>}
                  <p className="mt-2 leading-relaxed text-ctp-subtext1">{world.summary}</p>
                </div>
              </Link>
            </Panel>
          ))}
        </ol>
      </section>
    </div>
  );
}
