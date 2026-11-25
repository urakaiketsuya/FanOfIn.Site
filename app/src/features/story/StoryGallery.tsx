import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import Panel from "../../components/ui/Panel";
import type { StoryCard } from "./types";

const cardUrl = (card: StoryCard) => `/cards/${card.slug}?edition=${card.editionUuid}`;

export function StoryCardTile({ card }: { card: StoryCard }) {
  return (
    <Panel as="li" padding="sm" className="h-full">
      <Link
        to={cardUrl(card)}
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

export function FeaturedCards({ cards }: { cards: StoryCard[] }) {
  if (!cards.length) return null;

  return (
    <section aria-labelledby="story-featured-cards" className="mt-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="story-featured-cards" className="text-xl font-semibold">Featured cards</h2>
        <Link to="#story-gallery" className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">
          View card gallery
        </Link>
      </div>
      <ul className="grid grid-cols-3 items-start gap-2 sm:gap-4">
        {cards.map(card => (
          <Panel as="li" key={card.slug} padding="none" className="min-w-0 self-stretch">
            <Link
              to={cardUrl(card)}
              aria-label={card.name}
              className="block h-full rounded-xl p-2 hover:bg-ctp-surface0/60 focus-visible:outline-2 focus-visible:outline-ctp-blue sm:p-3"
            >
              <div className="mx-auto max-w-32">
                <CardArtTile card={undefined} imagePath={card.image} name={card.name} />
              </div>
              <p className="mt-2 break-words text-center text-sm font-semibold leading-snug text-ctp-blue">{card.name}</p>
            </Link>
          </Panel>
        ))}
      </ul>
    </section>
  );
}

export function CardGallery({ cards }: { cards: StoryCard[] }) {
  if (!cards.length) return null;

  return (
    <section id="story-gallery" tabIndex={-1} aria-labelledby="story-gallery-heading" className="mt-10 scroll-mt-24">
      <h2 id="story-gallery-heading" className="text-2xl font-semibold">Card gallery</h2>
      {(["Character", "Location", "Object"] as const).map(kind => {
        const highlights = cards.filter(card => card.kind === kind);
        if (!highlights.length) return null;
        const id = `story-${kind.toLowerCase()}s`;
        return (
          <section key={kind} aria-labelledby={id} className="mt-5">
            <h3 id={id} tabIndex={-1} className="mb-3 scroll-mt-24 text-lg font-semibold">{kind}s</h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {highlights.map(card => <StoryCardTile key={card.slug} card={card} />)}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
