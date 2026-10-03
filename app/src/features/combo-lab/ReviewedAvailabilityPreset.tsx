import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import Panel from "../../components/ui/Panel";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import type { ComboRecipeRequirement } from "../deckbuilder/HypergeometricCalculator";

import { floralPotionPreset } from "./reviewedAvailabilityPresets";

export default function ReviewedAvailabilityPreset({ catalogByName, main, requirements, onLoad, onUndo }: {
  catalogByName: Map<string, Card>;
  main: { name: string; quantity: number }[];
  requirements: ComboRecipeRequirement[];
  onLoad: () => void;
  onUndo?: () => void;
}) {
  const { phase } = useSyncProgress();
  const names = floralPotionPreset.requirements.map((r) => r.cards[0]);
  const catalogReady = names.every((name) => catalogByName.has(name));
  const catalogFailed = phase === "error" || phase === "done";
  const selected = requirements.length === 2 && names.every((name) => requirements.some((r) => r.kind === "cards" && r.cards.length === 1 && r.cards[0] === name && r.required === 1 && !r.avoid && r.byTurn == null));
  const missing = names.filter((name) => !main.some((line) => line.name === name && line.quantity > 0));
  return <Panel className="mb-4" data-component="ReviewedAvailabilityPreset">
    <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="grid max-w-72 grid-cols-2 gap-3">
        {names.map((name) => {
          const card = catalogByName.get(name);
          const content = <><CardArtTile card={card} name={name} /><span className="mt-1 block text-sm font-medium">{name}</span></>;
          return card ? <Link key={name} aria-label={name} to={`/cards/${card.slug}`} className="min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name} className="min-w-0">{content}</div>;
        })}
      </div>
      <div className="min-w-0">
        <h2 className="font-semibold text-ctp-text">Reviewed example: brew a Combustible Potion</h2>
        <p className="mt-2 text-sm">Find at least one of each pictured card in your Main Deck draws. These are the two required pieces, not alternative choices.</p>
        <p className="mt-2 text-sm text-ctp-subtext1">The odds measure card access only. Playing the sequence also needs Fire access, three reserve for Floral Arrangement before modifiers, both summoned Herbs kept for Brew, and a legal unit target. Payment and successful resolution are not included in the odds.</p>
        <details className="mt-2">
          <summary className="flex min-h-control cursor-pointer items-center gap-2 font-medium"><DisclosureChevron />Sequence and sources</summary>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Resolve Floral Arrangement to summon Silvershine and Fraysia.</li>
            <li>Sacrifice both Herbs to Brew Combustible Potion instead of paying its printed four reserve.</li>
            <li>Resolve its brewed draw-two, discard-one trigger; sacrifice the Potion for a 2-damage effect on a legal unit.</li>
          </ol>
          <p className="mt-2 text-sm text-ctp-subtext1">The three reserve resources are separate from the two pieces. Brewing does not also activate the Herbs’ sacrifice abilities. Opponents can respond; damage is not guaranteed. Affordability controls below remain separate assumptions.</p>
          <p className="mt-2 text-xs text-ctp-subtext1">Reviewed October 3, 2026 against official card text and Brew rules. Full deck legality is not checked by this preset.</p>
          <div className="flex flex-wrap gap-x-4 text-sm">{names.map((name) => <a key={name} className="inline-flex min-h-control items-center text-ctp-blue underline" href={`https://index.gatcg.com/card/${name === names[0] ? 'floral-arrangement' : 'combustible-potion'}`}>{name} rules</a>)}<a className="inline-flex min-h-control items-center text-ctp-blue underline" href="https://rules.gatcg.com/glossary/keywords-and-abilities#brew">Brew rules</a></div>
        </details>
        {!main.length ? <p className="mt-2 text-sm">Load a deck below to test this preset.</p> : missing.length > 0 ? <p className="mt-2 text-sm">Missing from Main Deck: {missing.join(", ")}. Loading the preset does not add cards.</p> : null}
        {!catalogReady && <p className="mt-2 text-sm" role={catalogFailed ? "alert" : "status"}>{catalogFailed ? "Card details are unavailable. Reload to retry; your recipe has not changed." : "Loading card details… Names are shown while artwork and rules load."}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!main.length || !catalogReady || selected} onClick={onLoad}>{selected ? "Card-availability preset selected" : "Use card-availability preset"}</Button>
          {!catalogReady && catalogFailed && <Button onClick={() => window.location.reload()}>Reload card details</Button>}
          {onUndo && <Button onClick={onUndo}>Restore previous recipe</Button>}
        </div>
        {main.length > 0 && !selected && <p className="mt-2 text-xs text-ctp-subtext1">Replaces the selected recipe pieces. Your deck stays the same.</p>}
      </div>
    </div>
  </Panel>;
}
