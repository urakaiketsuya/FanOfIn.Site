import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const LIST_CLASS = "mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-ctp-subtext1";
const BODY_CLASS = "mt-3 text-sm leading-6 text-ctp-subtext1";
const TOPICS = [
  { id: "small-samples", label: "Adjusted win rates" },
  { id: "confidence-tiers", label: "Confidence & uncertainty" },
  { id: "classification", label: "Deck clustering" },
  { id: "coverage", label: "Data coverage" },
  { id: "elo", label: "Player ratings" },
  { id: "simulator-data", label: "Simulator data" },
  { id: "broadcast-data", label: "Match timelines" },
] as const;

function TopicLinks({ onSelect }: { onSelect?: () => void }) {
  return <ul className="space-y-1">{TOPICS.map((topic) => <li key={topic.id}><a href={`#${topic.id}`} onClick={onSelect} className="block rounded-lg px-3 py-2 text-sm text-ctp-subtext1 hover:bg-forest-surface/40 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{topic.label}</a></li>)}</ul>;
}

export default function Methodology() {
  useDocumentTitle("How the Numbers Work", "How Fan of Insight's stats work, what their caveats mean, and where their limits are.");
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return (
    <PageLayout data-component="Methodology" width="wide" className="py-10">
      <PageHeader
        eyebrow="About the data"
        title="How the numbers work"
        description="Tournament stats are useful evidence, not certainty. Here are the assumptions, sample-size safeguards, and data boundaries behind the results you see on Fan of Insight."
      />

      <div className="mb-8 rounded-2xl border border-forest-surface bg-forest-surface/30 p-5 sm:p-6">
        <p className="text-sm font-semibold text-ctp-text">Three things to keep in mind</p>
        <ul className="mt-3 grid gap-3 text-sm leading-6 text-ctp-subtext1 sm:grid-cols-3 sm:gap-5">
          <li><span className="font-semibold text-ctp-blue">Sample size matters.</span> Short streaks are less reliable than many games.</li>
          <li><span className="font-semibold text-ctp-blue">Context matters.</span> A card appearing in winning lists does not prove it caused the wins.</li>
          <li><span className="font-semibold text-ctp-blue">Sources stay separate.</span> Simulator tests do not become tournament results.</li>
        </ul>
      </div>

      <details className="mb-8 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-ctp-text">Jump to a topic</summary>
        <nav aria-label="Methodology topics" className="mt-3 border-t border-ctp-surface0 pt-2"><TopicLinks /></nav>
      </details>

      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Methodology topics" className="hidden self-start lg:sticky lg:top-28 lg:block">
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-ctp-subtext0">On this page</p>
          <div className="mt-3 border-l border-ctp-surface1"><TopicLinks /></div>
        </nav>
        <div className="space-y-8">
        <Section id="small-samples" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Adjusted win rates">
          <p className={BODY_CLASS}>
            A 2-0 record is promising, but it is still only two games. A metric marked{" "}
            <strong>Adjusted</strong> pulls small samples toward a 50% baseline or the archetype's overall
            average. As more games are recorded, the observed win rate carries more weight.
          </p>
          <ul className={LIST_CLASS}>
            <li><strong>Few games:</strong> The baseline has more influence, limiting the effect of a short streak.</li>
            <li><strong>Many games:</strong> The recorded results have more influence.</li>
          </ul>
        </Section>

        <Section id="confidence-tiers" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Confidence & uncertainty">
          <p className={BODY_CLASS}>
            Confidence labels reflect how many different players and events support a result.
          </p>
          <ul className={LIST_CLASS}>
            <li><strong>Emerging:</strong> At least 5 unique players; useful to watch, but still limited evidence.</li>
            <li><strong>Established:</strong> At least 50 unique players across 2 or more events.</li>
          </ul>
          <p className={BODY_CLASS}>
            Win rates include a 95% confidence interval, with ties counting as half a win. A 3-0 record has a
            wide interval because there is not enough evidence for a precise estimate.
          </p>
        </Section>

        <Section id="classification" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Deck clustering">
          <p className={BODY_CLASS}>
            A clustering algorithm groups submitted decklists by card overlap. Archetype membership is based on
            those lists, not manually assigned labels.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Auto-matching:</strong> An uploaded list is compared with existing clusters to find its
              closest match. A Borderline Match shares some cards, but is not a close fit.
            </li>
            <li>
              <strong>Correlation &ne; causation:</strong> A high Card Impact score means the card appeared in
              successful lists. Adding it to another deck does not guarantee the same result.
            </li>
          </ul>
        </Section>

        <Section id="coverage" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Data coverage & refresh">
          <ul className={LIST_CLASS}>
            <li>
              <strong>Decklist coverage:</strong> Only 7 to 14% of tracked events enable decklist submissions.
              Card-specific stats come from this subset, not the entire player base.
            </li>
            <li>
              <strong>Update cycle:</strong> The analytics engine processes raw data once per day. Published
              numbers may not change after a code fix until the next run completes.
            </li>
          </ul>
        </Section>

        <Section id="elo" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Provisional Elo ratings">
          <p className={BODY_CLASS}>
            Everyone starts at 1500, and ratings update match by match in chronological order.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Provisional status:</strong> A player with fewer than 10 recorded matches is marked
              Provisional. Early results can move a rating substantially, so a short record should be read with care.
            </li>
          </ul>
        </Section>

        <Section id="simulator-data" className="scroll-mt-28 border-b border-ctp-surface0 pb-8" title="Tournament vs. simulator data">
          <p className={BODY_CLASS}>
            We pull anonymous telemetry from Clarent (a community TCG sim) to train features like the Guided Deck
            Builder.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Separate sources:</strong> Simulator data is not mixed into tournament win rates or Card
              Impact scores. Sandbox testing stays separate from recorded event results.
            </li>
            <li>
              <strong>Limited use:</strong> Simulator metrics only help re-sort valid card options inside existing,
              tournament-legal shells. Look for the Experimental badge where this data appears.
            </li>
          </ul>
        </Section>

        <Section id="broadcast-data" className="scroll-mt-28 pb-4" title="Hand-crafted match timelines">
          <p className={BODY_CLASS}>
            Timelines and Combos aren't scraped automatically from a server; they are manually transcribed by
            humans watching tournament stream broadcasts.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Selected feature matches:</strong> These are commentary matches, not an exhaustive log of
              every table at an event.
            </li>
            <li>
              <strong>Transcription limits:</strong> On-camera plays can be misread. Treat timelines as annotated
              match recaps, not official judge ruling logs.
            </li>
          </ul>
        </Section>
        </div>
      </div>
    </PageLayout>
  );
}
