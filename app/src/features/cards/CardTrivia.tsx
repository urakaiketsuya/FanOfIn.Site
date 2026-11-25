import { cardTrivia } from "./cardTriviaEntries";

export default function CardTrivia({ slug }: { slug: string }) {
  const entry = Object.hasOwn(cardTrivia, slug) ? cardTrivia[slug] : undefined;
  if (!entry) return null;

  return (
    <section aria-labelledby="card-trivia-heading" className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle px-4 pt-4 pb-2 sm:px-5">
      <h2 id="card-trivia-heading" className="text-lg font-semibold text-ctp-text">Trivia</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ctp-subtext1">{entry.text}</p>
      <ul aria-label="Trivia sources" className="mt-1 flex flex-wrap gap-x-4">
        {entry.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              className="inline-flex min-h-control min-w-control items-center rounded-sm text-sm text-ctp-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
