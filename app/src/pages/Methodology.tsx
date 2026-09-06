import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const LIST_CLASS = "mt-2 list-disc space-y-1.5 pl-5 text-sm text-ctp-subtext1";
const BODY_CLASS = "mt-2 text-sm text-ctp-subtext1";

export default function Methodology() {
  useDocumentTitle("The Math Behind the Stats", "How Fan of Insight's stats work, what their caveats mean, and where their limits are.");
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return (
    <PageLayout data-component="Methodology">
      <PageHeader
        title="The Math Behind the Stats"
        description="Look, every number on this site comes with an asterisk, whether that is a microscopic sample size, weird data quirks, or just high variance. Instead of cluttering every single page with the math homework, here is how we keep the numbers honest."
      />

      <div className="space-y-8">
        <Section id="small-samples" title={'Adjusted Win Rates (Because 2-0 Isn’t "Undefeated")'}>
          <p className={BODY_CLASS}>
            A deck that goes 2-0 hasn't broken the meta; it just won two games. Any metric marked{" "}
            <strong>Adjusted</strong> gets yanked back toward reality, pulling small samples toward a 50% baseline
            or the archetype's overall average. The fewer games a deck has under its belt, the harder we pull it
            down so small-sample noise doesn't look like a Tier 0 breakout.
          </p>
          <ul className={LIST_CLASS}>
            <li><strong>Few Games:</strong> Heavily flattened toward the baseline to kill false hype.</li>
            <li><strong>Lots of Games:</strong> The raw win rate takes over as real data replaces guesswork.</li>
          </ul>
        </Section>

        <Section id="confidence-tiers" title="Confidence Tiers: Earning the Title">
          <p className={BODY_CLASS}>
            We don't call a deck an "Established Meta Pick" just because one player ran hot at a local.
          </p>
          <ul className={LIST_CLASS}>
            <li><strong>Emerging:</strong> Needs at least 5 unique players. Worth keeping an eye on, but far from proven.</li>
            <li><strong>Established:</strong> Needs at least 50 unique players across 2+ distinct events. This is a verified format staple.</li>
          </ul>
          <p className={BODY_CLASS}>
            Every win rate displays a 95% confidence interval (ties count as half a win). That 3-0 list you saw
            online? It will show a massive variance range, acknowledging that it could be a rogue masterpiece or
            just a mediocre pile that drew great.
          </p>
        </Section>

        <Section id="classification" title="Deck Clustering (No Human Bias)">
          <p className={BODY_CLASS}>
            We don't hand-pick what goes into an archetype. A clustering algorithm groups actual, submitted
            decklists by card overlap to define the meta.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Auto-Matching:</strong> If you upload a custom list, we test it against existing clusters to
              find its closest relative. A Borderline Match means it shares some DNA, but isn't a 1-to-1 fit.
            </li>
            <li>
              <strong>Correlation &ne; Causation:</strong> High "Card Impact" scores mean winning decks ran that
              card. It does not mean jamming it into your build guarantees a trophy. Context matters.
            </li>
          </ul>
        </Section>

        <Section id="coverage" title="Data Coverage & Daily Refresh">
          <ul className={LIST_CLASS}>
            <li>
              <strong>The Reality Check:</strong> Only 7 to 14% of tracked events enable decklist submissions. All
              card-specific stats come from this subset, not the entire player base.
            </li>
            <li>
              <strong>Update Cycles:</strong> The analytics engine processes raw data once per day. If we push a
              bug fix to the code, published numbers won't shift until the next daily run completes.
            </li>
          </ul>
        </Section>

        <Section id="elo" title="Provisional Elo Ratings">
          <p className={BODY_CLASS}>
            Everyone starts at 1500, and ratings update match by match in chronological order.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>The Rule:</strong> If a player has fewer than 10 recorded matches, they are tagged
              Provisional. One wild upset can swing a fresh rating drastically, so we don't treat a 5-game streak
              the same as a 500-game veteran record.
            </li>
          </ul>
        </Section>

        <Section id="simulator-data" title="Tournament Data vs. Simulator Data">
          <p className={BODY_CLASS}>
            We pull anonymous telemetry from Clarent (a community TCG sim) to train features like the Guided Deck
            Builder.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>The Iron Curtain:</strong> Sim data is never mixed into official tournament win rates or
              Card Impact scores. Sandbox testing stays separate from real-world results.
            </li>
            <li>
              <strong>Strict Limits:</strong> Sim metrics only help re-sort valid card options inside existing,
              tournament-legal shells. Look for the Experimental badge anywhere this data appears.
            </li>
          </ul>
        </Section>

        <Section id="broadcast-data" title="Match Timelines Are Hand-Crafted">
          <p className={BODY_CLASS}>
            Timelines and Combos aren't scraped automatically from a server; they are manually transcribed by
            humans watching tournament stream broadcasts.
          </p>
          <ul className={LIST_CLASS}>
            <li>
              <strong>Curated Feature Matches:</strong> This is a spotlight on commentary matches, not an
              exhaustive log of every table in the room.
            </li>
            <li>
              <strong>Human Margin for Error:</strong> Misreads happen on camera. Treat these timelines as
              annotated match recaps, not official judge ruling logs.
            </li>
          </ul>
        </Section>
      </div>
    </PageLayout>
  );
}
