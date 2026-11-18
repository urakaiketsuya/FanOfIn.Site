import { useBrowseState } from "../../lib/useBrowseState";
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import PageLayout from '../../components/layout/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useCardsByNames } from '../events/useCardsByNames';
import OfficialProductDecklist from './OfficialProductDecklist';
import { officialProductDecks, PRODUCT_LABELS } from './data';
import { findPrimer, primerPath, primerTerms } from './primers/data';

const PRIMER_TABS = [
  { key: 'game-plan', label: 'Game plan' },
  { key: 'synergy', label: 'Synergies' },
  { key: 'win', label: 'How you win' },
  { key: 'terms', label: 'Card terms' },
  { key: 'decklist', label: 'Decklist' },
];
const linkClass = 'inline-flex min-h-12 items-center rounded-md px-3 text-sm text-ctp-blue underline decoration-ctp-blue/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-ctp-blue';

function CardGroup({ names, cards, compact = false }: { names: string[]; cards: Map<string, Card>; compact?: boolean }) {
  return <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : names.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>{names.map(name => {
    const card = cards.get(name);
    const content = <><CardArtTile card={card} name={name} /><span className="block py-2 text-sm font-medium">{name}</span></>;
    return card ? <Link key={name} to={`/cards/${card.slug}`} className="min-w-0 rounded-md text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name} className="min-w-0">{content}</div>;
  })}</div>;
}

export default function StarterPrimerPage() {
  const { deckId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedTab = new URLSearchParams(location.search).get('tab') ?? location.hash.slice(1);
  const activeTab = PRIMER_TABS.some(tab => tab.key === requestedTab) ? requestedTab : 'game-plan';
  function changeTab(tab: string) {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    void navigate({ search: `?${params}`, hash: '' }, { preventScrollReset: true });
  }
  const primer = findPrimer(deckId);
  const deck = officialProductDecks.find(item => item.id === primer?.deckId);
  const terms = primerTerms(primer?.deckId ?? '');
  const cards = useCardsByNames([...new Set([...Object.values(deck?.cards ?? {}).flat().map(line => line.name), ...(primer?.cards ?? []), ...(primer?.synergyCards ?? []), ...(primer?.winCards ?? []), ...terms.flatMap(term => term.cards)])]);
  const [query, setQuery] = useBrowseState('official-products/StarterPrimerPage.query', '');
  useDocumentTitle(deck && primer ? `${deck.name} · Deck primer` : 'Deck primer');
  if (!deck || !primer) return <PageLayout><PageHeader title="Primer not found" description="Choose an official deck to learn its game plan." /><Link className={linkClass} to="/official-decks">Browse official decks</Link></PageLayout>;
  if (deckId !== primer.slug) return <Navigate to={`${primerPath(deck.id)}${location.search}${location.hash}`} replace />;
  const isPantheon = deck.productCode === 'RDOPD';
  const visible = terms.filter(term => `${term.term} ${term.meaning} ${term.cards.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <PageLayout width="wide" data-component="StarterPrimerPage">
    <Link to="/official-decks" className={linkClass}>← Official decks</Link>
    <PageHeader title={`${deck.name} primer`} description={`${PRODUCT_LABELS[deck.productCode]} · Learn the deck as purchased`} />
    <Tabs tabs={PRIMER_TABS} active={activeTab} onChange={changeTab} label="Primer sections" baseId="primer" wrap />
    <TabPanel baseId="primer" tab="game-plan" active={activeTab} className="mt-5">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
      <Panel id="game-plan" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-semibold">Your game plan</h2>
        <div className="grid grid-cols-[minmax(0,7rem)_1fr] items-start gap-4"><div><CardGroup names={primer.cards.slice(0,1)} cards={cards} /></div><p className="leading-relaxed text-ctp-subtext1">{primer.summary}</p></div>
        <h3 className="font-semibold">Opening turns</h3><p className="leading-relaxed text-ctp-subtext1">{primer.opening}</p>
        <h3 className="font-semibold">When to level up</h3><p className="leading-relaxed text-ctp-subtext1">{primer.leveling}</p>
      </Panel>
      <Panel className="space-y-3"><h2 className="text-xl font-semibold">Before you commit</h2><ul className="list-disc space-y-3 pl-5 text-ctp-subtext1">{primer.mistakes.map(text => <li key={text}>{text}</li>)}</ul></Panel>
        </div>
      <Panel className="space-y-3"><h2 className="text-xl font-semibold">Your first game</h2><p className="text-ctp-subtext1">Keep your main deck and material deck separate. Your Spirit starts in play; follow its opening draw. Your champion’s lineage unlocks elements as you level.</p><p className="text-ctp-subtext1">Reserve costs place cards from hand face down into memory. Memory costs banish random cards from memory; eligible Floating Memory cards in your graveyard can help pay. Your remaining memory returns to hand during recollection.</p>{isPantheon && <>
          <h3 className="font-semibold">At the Pantheon table</h3>
          <p className="text-ctp-subtext1">Play a three- or four-player free-for-all: the last champion standing wins. Set one Lesser and one Greater Boon in your Pantheon zone, follow any First Boon instruction before Spirits enter, and start with a Pantheon Barrier. Bestow other boons by paying their costs when their element, level, class, and timing requirements allow.</p>
          <p className="text-ctp-subtext1">Everyone draws on their first turn and skips wake up, materialize, and recollection. Only the last player in the first turn cycle may attack. Your barrier redirects damage from your other objects to itself and loses durability; keep its reference card nearby.</p>
          <a className={linkClass} href="https://rules.gatcg.com/general-rules/general-rules-starting-the-game#pantheon-games" target="_blank" rel="noreferrer">Pantheon setup rules ↗</a>
        </>}
        <p className="text-ctp-subtext1">Track damage upward from zero. You defeat the opposing champion when its damage reaches its life. Leveling does not clear existing damage.</p><a className={linkClass} href="https://rules.gatcg.com/game-mechanics/game-mechanics-turn-order" target="_blank" rel="noreferrer">Learn the basic turn sequence ↗</a></Panel>
      </div>
    </TabPanel>
    <TabPanel baseId="primer" tab="synergy" active={activeTab} className="mt-5 max-w-2xl">
        <Panel id="synergy" className="scroll-mt-24 space-y-4"><h2 className="text-xl font-semibold">Cards that work together</h2><h3 className="font-medium text-ctp-teal">{primer.synergyTitle}</h3><CardGroup names={primer.synergyCards} cards={cards} /><p className="leading-relaxed text-ctp-subtext1">{primer.sequence}</p></Panel>
    </TabPanel>
    <TabPanel baseId="primer" tab="win" active={activeTab} className="mt-5 max-w-2xl">
        <Panel id="win" className="scroll-mt-24 space-y-4"><h2 className="text-xl font-semibold">How you win</h2><h3 className="font-medium text-ctp-green">{primer.winTitle}</h3><CardGroup names={primer.winCards} cards={cards} /><p className="leading-relaxed text-ctp-subtext1">{primer.winText}</p></Panel>
    </TabPanel>
    <TabPanel baseId="primer" tab="terms" active={activeTab} className="mt-5">
    <Panel id="terms" className="scroll-mt-24">
      <h2 className="text-xl font-semibold">Terms in this deck</h2>
      <label className="mt-4 block text-sm font-medium" htmlFor="primer-term-search">Find a term or card</label>
      <input id="primer-term-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Floating Memory or a card name" className="mt-2 min-h-12 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue" />
      <p role="status" className="my-3 text-sm text-ctp-subtext0">{visible.length} {visible.length === 1 ? 'term' : 'terms'}</p>
      <dl className="grid items-start gap-5 md:grid-cols-2">{visible.map(term => {
        const matchingCards = term.cards.filter(name => !query.trim() || term.term.toLowerCase().includes(query.trim().toLowerCase()) || term.meaning.toLowerCase().includes(query.trim().toLowerCase()) || name.toLowerCase().includes(query.trim().toLowerCase()));
        const quote = term.quote && matchingCards.includes(term.quote.cardName) ? term.quote : null;
        const examples = [...new Set([...(quote ? [quote.cardName] : []), ...matchingCards])].slice(0, 3);
        return <div key={term.term} className="min-w-0 rounded-lg bg-ctp-base p-4">
          <dt className="font-semibold text-ctp-text">{term.term}</dt>
          <dd className="mt-2 space-y-4">
            <p className="leading-relaxed text-ctp-subtext1">{term.meaning}</p>
            {term.ruleQuote ? <blockquote className="border-l-2 border-ctp-surface2 pl-3 text-sm text-ctp-subtext0">
              <p>“{term.ruleQuote.text}”</p>
              <cite className="not-italic"><a className={`${linkClass} px-0`} href={term.ruleQuote.sourceUrl} target="_blank" rel="noreferrer">Official keyword rule · {term.term} ↗</a></cite>
            </blockquote> : quote && <blockquote className="border-l-2 border-ctp-surface2 pl-3 text-sm text-ctp-subtext0">
              <p>“{quote.text}”</p>
              <cite className="not-italic"><a className={`${linkClass} px-0`} href={quote.sourceUrl} target="_blank" rel="noreferrer">Card wording · {quote.cardName} ↗</a></cite>
            </blockquote>}
            <div className="max-w-lg"><CardGroup names={examples} cards={cards} compact /></div>
          </dd>
        </div>;
      })}</dl>
      {!visible.length && <div className="py-4"><p className="mb-3">No matching terms in this deck.</p><Button onClick={() => setQuery('')}>Clear search</Button></div>}
    </Panel>
    </TabPanel>
    <TabPanel baseId="primer" tab="decklist" active={activeTab} className="mt-5">
    <Panel id="decklist" className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold">Decklist</h2>
      <OfficialProductDecklist deck={deck} cardsByName={cards} />
    </Panel>
    </TabPanel>
    <footer className="mt-5 flex flex-wrap gap-2">
      {deck.sourceUrl && <a className={linkClass} href={deck.sourceUrl} target="_blank" rel="noreferrer">Product decklist ↗</a>}
      <a className={linkClass} href="https://rules.gatcg.com/glossary/keywords-and-abilities" target="_blank" rel="noreferrer">Official keyword rules ↗</a>
      <a className={linkClass} href="https://rules.gatcg.com/glossary/game-terms" target="_blank" rel="noreferrer">Official game terms ↗</a>
    </footer>
  </PageLayout>;
}
