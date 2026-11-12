import { rangeText, percent } from './reportFormatting';
import { useMemo } from 'react';
import { computeTonorisDrawReport, type AnalyticsDeck, type Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import ForecastResult, { ForecastRange, ForecastChance } from './ForecastResult';
export default function TonorisDrawReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeTonorisDrawReport(deck, cardsByName), [deck, cardsByName]);
  if (!report) return null;
  if (report.missing.length) return <Panel data-component="TonorisDrawReport"><h3 className="text-lg font-semibold">Draw & resources</h3><p role="status">Card data incomplete</p></Panel>;
  const early = report.points[2], late = report.points[4];
  const cards = (names: string[]) => [...deck.main, ...deck.material].filter(line => line.quantity > 0 && names.includes(line.name));
  const detail = (label: string, before: string, after: string) => <div className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="tabular-nums">{before} → {after}</dd></div>;
  return <Panel data-component="TonorisDrawReport">
    <ForecastResult title="Draw" context="Unopposed · going first" cards={cards(['Epicurean Institute', 'Dormant Sacrificial Altar', 'Hub of Innovation', 'Neos Sight'])} cardsByName={cardsByName}>
      <p className="text-sm">Cards seen</p><ForecastRange early={early.seen} late={late.seen} unit="cards" />
      <dl className="mt-4 space-y-2 text-xs">{detail('Extra cards · T3 → T5', rangeText(early.extra), rangeText(late.extra))}{detail('Neos bonus drawn', percent(early.bonus), percent(late.bonus))}</dl>
    </ForecastResult>
    <ForecastResult title="Resources" context="Paid progression · going first" cards={cards(['Academy Guide', 'Dungeon Guide', 'The Eternal Kingdom'])} cardsByName={cardsByName}>
      <ForecastChance early={early.level3} late={late.level3} label="Level 3 reached" />
      <dl className="mt-4 space-y-2 text-xs">{detail('Memory saved · T3 → T5', rangeText(early.saved), rangeText(late.saved))}</dl>
    </ForecastResult>
    <ForecastResult title="Token combat" context="After payments · going first" cards={cards(['Cordelia, Aurous Kaiser', 'Automata Genesis', 'Tonoris, Genesis Aegis'])} cardsByName={cardsByName}>
      <p className="text-sm">Ready token power</p><ForecastRange early={early.readyTokenPower} late={late.readyTokenPower} unit="power" cumulative={false} />
      <dl className="mt-4 space-y-2 text-xs">{detail('Drones fabricated · T3 → T5', rangeText(early.fabricated), rangeText(late.fabricated))}{detail('Weapons summoned', rangeText(early.weapons), rangeText(late.weapons))}{detail('Titans summoned', rangeText(early.titans), rangeText(late.titans))}</dl>
    </ForecastResult>
    <ForecastResult title="Defense" context="Obelisk readiness · going first" cards={[...cards(['Tonoris, Genesis Aegis']), { name: 'Obelisk of Protection', quantity: 1, detail: 'Generated' }]} cardsByName={cardsByName}>
      <ForecastChance early={early.preventionReady} late={late.preventionReady} label="2 prevention ready" cumulative={false} />
    </ForecastResult>
  </Panel>;
}
