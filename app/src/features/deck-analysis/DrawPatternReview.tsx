import { useId, useState } from 'react';
import type { Card } from '@gatcg/shared';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import CopyClumpingRisk from '../deckbuilder/CopyClumpingRisk';
import ConditionalHandPressure from '../deckbuilder/ConditionalHandPressure';

/** Separate draw patterns without implying that either makes a card unwanted. */
export default function DrawPatternReview(props: { mainLines: { name: string; quantity: number }[]; materialLines: { name: string; quantity: number }[]; catalogByName: Map<string, Card> }) {
  const [view, setView] = useState<'duplicates' | 'conditions'>('duplicates');
  const id = useId();
  return <section className="mt-4">
    <p className="mb-3 text-sm text-ctp-subtext1">Review repeated copies or printed conditions. Use the quick estimate when you want to choose which cards to avoid.</p>
    <Tabs baseId={id} label="Draw patterns" active={view} onChange={setView} tabs={[{ key: 'duplicates', label: 'Repeated copies' }, { key: 'conditions', label: 'Printed conditions' }]} />
    <TabPanel baseId={id} tab="duplicates" active={view} keepMounted><CopyClumpingRisk {...props} /></TabPanel>
    <TabPanel baseId={id} tab="conditions" active={view} keepMounted><ConditionalHandPressure {...props} /></TabPanel>
  </section>;
}
