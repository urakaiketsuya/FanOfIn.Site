import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useDecklistDisplayPrefs, type VisualCardSize } from "../../lib/decklistDisplayPrefs";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label
      title={description}
      className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] ${checked ? "border-ctp-blue/60 bg-ctp-blue/10 font-semibold text-ctp-blue shadow-sm" : "border-ctp-surface1 bg-ctp-mantle text-ctp-subtext1"}`}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      <span>{label}<span className="sr-only">. {description}</span></span>
      <span aria-hidden="true" className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${checked ? "bg-ctp-blue text-ctp-base" : "border border-ctp-overlay0"}`}>{checked ? "✓" : ""}</span>
    </label>
  );
}

const VISUAL_CARD_SIZE_OPTIONS: { value: VisualCardSize; label: string; description: string }[] = [
  { value: "large", label: "Large (2 per row)", description: "Biggest card art, fewest per row." },
  { value: "medium", label: "Medium (3-4 per row)", description: "A middle ground." },
  { value: "compact", label: "Compact (4 per row)", description: "Smallest thumbnails, most cards visible at once." },
];

export default function SettingsIndex() {
  useDocumentTitle("Display Settings", "Choose which optional sections show up on decklist pages.");
  const prefs = useDecklistDisplayPrefs();

  return (
    <PageLayout data-component="SettingsIndex">
      <PageHeader
        title="Display Settings"
        description="Saved on this device."
      />

      <Section className="mt-6" title="Decklist stats" heading="compact">
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="Win rate"
            description="This specific decklist's own match record from the event it was played at, where available. Only shows on tournament decklists — there's no meaningful win rate for a decklist that's never been played in a tracked event."
            checked={prefs.winRate}
            onChange={prefs.setWinRate}
          />
        </div>
      </Section>

      <Section className="mt-6" title="Visual mode card size" heading="compact">
        <div role="radiogroup" aria-label="Visual mode card size" className="flex flex-wrap gap-2">
          {VISUAL_CARD_SIZE_OPTIONS.map((option) => (
            <label
              key={option.value}
              title={option.description}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] ${prefs.visualCardSize === option.value ? "border-ctp-blue bg-ctp-blue/10 font-semibold text-ctp-blue shadow-sm" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}
            >
              <input
                type="radio"
                name="visual-card-size"
                value={option.value}
                checked={prefs.visualCardSize === option.value}
                onChange={() => prefs.setVisualCardSize(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </Section>

      <Section className="mt-6" title="Visual mode card fields" heading="compact">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ToggleRow label="Cost" description="Memory/Reserve cost badge." checked={prefs.visualCost} onChange={prefs.setVisualCost} />
          <ToggleRow label="Price" description="Cheapest current market price for this card." checked={prefs.visualPrice} onChange={prefs.setVisualPrice} />
          <ToggleRow label="Price trend" description="Recent change in that price, from the last ~30 days of published history." checked={prefs.visualPriceTrend} onChange={prefs.setVisualPriceTrend} />
          <ToggleRow label="Element/class tags" description="Small badges on the card art itself." checked={prefs.visualTags} onChange={prefs.setVisualTags} />
          <ToggleRow label="Simulator games" description="Anonymous Clarent simulator telemetry, where enough games exist — experimental, see /methodology." checked={prefs.visualSimulator} onChange={prefs.setVisualSimulator} />
          <ToggleRow label="Community usage" description="Share of all tracked community decks (any Champion) that include this card. Fetches an extra dataset the first time it's turned on, so it's off by default." checked={prefs.visualCommunity} onChange={prefs.setVisualCommunity} />
        </div>
      </Section>

      <Section className="mt-6" title="Decklist evidence panels" heading="compact">
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="Tuning suggestions"
            description="Cards that might help, cards worth reviewing, and quantity advice — drawn from tournament data for this decklist's named-build cluster (or its Champion, as a fallback)."
            checked={prefs.tuningEvidence}
            onChange={prefs.setTuningEvidence}
          />
          <ToggleRow
            label="Meta gap trends"
            description="Champion-wide adoption decay — cards in this list whose popularity is falling among other decks of the same Champion. Only appears on pages with a single dedicated decklist (deck pages, your own saved decks)."
            checked={prefs.metaGaps}
            onChange={prefs.setMetaGaps}
          />
        </div>
      </Section>
    </PageLayout>
  );
}
