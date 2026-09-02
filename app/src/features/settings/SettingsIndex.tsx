import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-ctp-surface1 p-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5" />
      <span>
        <span className="font-medium text-ctp-text">{label}</span>
        <br />
        <span className="text-xs text-ctp-subtext1">{description}</span>
      </span>
    </label>
  );
}

export default function SettingsIndex() {
  useDocumentTitle("Display Settings", "Choose which optional sections show up on decklist pages.");
  const prefs = useDecklistDisplayPrefs();

  return (
    <PageLayout>
      <PageHeader
        title="Display Settings"
        description="These preferences are saved to this browser only — they don't follow you to another device, and they don't require an account. Used to be an inline 'Evidence settings' menu on decklist pages, moved here because that menu didn't work well on mobile."
      />

      <Section className="mt-6" title="Decklist stats" heading="compact">
        <div className="space-y-2">
          <ToggleRow
            label="DIAO score"
            description="A computed 4-pillar style rating (Durability/Interaction/Aggro/Opportunity) for any decklist shown on the site — not just dedicated deck pages. Weak correlation with actual match win rate; a style profile, not a power ranking."
            checked={prefs.diaoScore}
            onChange={prefs.setDiaoScore}
          />
          <ToggleRow
            label="Win rate"
            description="This specific decklist's own match record from the event it was played at, where available. Only shows on tournament decklists — there's no meaningful win rate for a decklist that's never been played in a tracked event."
            checked={prefs.winRate}
            onChange={prefs.setWinRate}
          />
        </div>
      </Section>

      <Section className="mt-6" title="Decklist evidence panels" heading="compact">
        <div className="space-y-2">
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
