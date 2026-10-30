import { useEffect, useMemo, useState, useTransition } from 'react';
import { budgetCardPrices, budgetSectionPrice, budgetPricesFresh } from '@gatcg/shared';
import { useDeckBuilder } from './useDeckBuilder';
import { usePriceLookupState } from '../pricing/usePriceLookup';
import { findActiveDeckPackages } from './packageGuardrails';
import { useSavedPackages } from './savedPackages';
import { budgetReplacements, type BudgetSwap } from './budgetReplacements';

export function useBudgetReplacements() {
  const b = useDeckBuilder();
  const pricing = usePriceLookupState();
  const { store } = useSavedPackages();
  const deckSignature = JSON.stringify(b.editor.deck);
  const deck = useMemo(() => b.editor.deck, [deckSignature]);
  const [selectedSource, setSource] = useState('');
  const [requestedQuantity, setQuantity] = useState(1);
  const [includeRoleMatches, setIncludeRoleMatches] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const prices = useMemo(() => budgetCardPrices([...b.catalogByName.values()].map(card => ({ name: card.name, editions: card.editions.map(e => ({ setPrefix: e.set.prefix, collectorNumber: e.collector_number, releaseDate: e.set.release_date })) })), { generatedAt: pricing.updatedAt ?? '', prices: Object.fromEntries(pricing.prices) }, now), [b.catalogByName, pricing.prices, pricing.updatedAt, now]);
  const source = deck.main.some(line => line.card === selectedSource) ? selectedSource : [...deck.main].sort((a, b) => (prices.get(b.card) ?? -1) - (prices.get(a.card) ?? -1))[0]?.card ?? '';
  const quantity = Math.min(requestedQuantity, deck.main.find(line => line.card === source)?.quantity ?? 1, 4);
  const protectedNames = useMemo(() => new Set(findActiveDeckPackages((['main', 'material', 'sideboard'] as const).flatMap(section => deck[section].map(line => ({ cardName: line.card, quantity: line.quantity, section })))).flatMap(pkg => pkg.protectedCards)), [deck, store]);
  const tournamentDecks = useMemo(() => new Map(b.effectivePopulationSource === 'tournament' ? b.cardCategoryRecommendations.map(row => [row.card.name, row.tournamentDecks]) : []), [b.cardCategoryRecommendations, b.effectivePopulationSource]);
  const context = { deck, catalog: b.catalogByName, prices, pricesAsOf: pricing.updatedAt, now, protectedNames, tournamentDecks, includeRoleMatches };
  const results = useMemo(() => !store.error && b.deckFormat === 'STANDARD' && source ? budgetReplacements(context, source, quantity) : [], [b.deckFormat, deck, b.catalogByName, prices, pricing.updatedAt, now, protectedNames, tournamentDecks, source, quantity, store.error, includeRoleMatches]);
  const unresolvedCards = [...new Set([...deck.main, ...deck.material, ...deck.sideboard].filter(line => !b.catalogByName.has(line.card)).map(line => line.card))];
  const total = budgetSectionPrice([...b.editor.deck.main, ...b.editor.deck.material, ...b.editor.deck.sideboard], prices);
  function accept(swap: BudgetSwap) {
    const checked = budgetReplacements({ ...context, now: Date.now() }, swap.from.name, swap.quantity).find(row => row.to.name === swap.to.name);
    if (store.error || b.deckFormat !== 'STANDARD' || !checked) { setMessage('Your deck or prices changed. Choose a current alternative.'); return; }
    startTransition(() => b.editor.edit({ type: 'replace-main', name: checked.from.name, replacement: checked.to.name, quantity: checked.quantity }));
    setMessage(`Replaced ${checked.quantity} ${checked.quantity === 1 ? "copy" : "copies"} · saved ~$${checked.savings.toFixed(2)}`);
  }
  return { unresolvedCards, includeRoleMatches, toggleRoles: () => startTransition(() => setIncludeRoleMatches(value => !value)), packageError: store.error, deck, format: b.deckFormat, pricing, prices, protectedNames, source, quantity, results, total, message, pending, accept,
    fresh: budgetPricesFresh(pricing.updatedAt ?? null, now),
    chooseSource: (name: string) => startTransition(() => { setSource(name); setQuantity(1); setMessage(''); }),
    chooseQuantity: (value: number) => startTransition(() => { setQuantity(value); setMessage(''); }),
  };
}
