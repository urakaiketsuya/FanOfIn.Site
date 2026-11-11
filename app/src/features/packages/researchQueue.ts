import type { Card, ConstructionReport, EditorialPackage, PackageCandidatesData, PackageResearchReview, SharedPackageCard, WinRatePackagesData } from '@gatcg/shared';
import { SHARED_PACKAGE_LIMITS } from '@gatcg/shared';
import { getRegisteredDeckPackageCatalog } from '../deckbuilder/packageGuardrails';
import { DECK_PACKAGE_CANDIDATES } from '../deckbuilder/packageCandidates';
import { buildSuggestedPackages } from '../cards/suggestedPackages';
import type mechanics from '../../../../docs/experiments/package-mechanics.json';

export const researchSources = {
  suggested: { label: 'Suggested packages', url: '/data/analysis/package-candidates.json', hash: '' },
  'win-rate': { label: 'Win-rate findings', url: '/data/analysis/win-rate-packages.json', hash: '#win-rates' },
  experimental: { label: 'Experimental', url: '/data/experiments/package-mechanics.json', hash: '#experimental' },
  construction: { label: 'Construction', url: '/data/experiments/package-construction.json', hash: '#construction' },
} as const;
export type ResearchKind = keyof typeof researchSources;
export interface ResearchFinding {
  research: PackageResearchReview;
  name: string;
  cards: string[];
  initialCards: string[];
  sections?: Map<string, SharedPackageCard['section']>;
  summary: string;
  evidence: string[];
  href: string;
}
async function digest(value: unknown) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))), b => b.toString(16).padStart(2, '0')).join('');
}
export async function researchFindings(kind: ResearchKind, raw: unknown): Promise<ResearchFinding[]> {
  const make = async (identity: unknown, evidence: unknown, finding: Omit<ResearchFinding, 'research' | 'href'>, hash: string = researchSources[kind].hash): Promise<ResearchFinding> => ({
    ...finding, href: `/cards/packages?review=1${hash}`,
    research: { kind, key: await digest([kind, identity]), fingerprint: await digest(evidence), dismissed: false },
  });
  if (kind === 'suggested') {
    const data = raw as PackageCandidatesData;
    if (!Array.isArray(data.candidates) || !Array.isArray(data.families)) throw new Error('Invalid package report');
    return Promise.all(buildSuggestedPackages(getRegisteredDeckPackageCatalog(), DECK_PACKAGE_CANDIDATES, data).flatMap(pkg => pkg.rules.filter(rule => rule.status === 'suggested').map(rule => make(
      [pkg.id, rule.id], { conditions: rule.conditions, evidence: rule.evidence ? { ...rule.evidence, generatedAt: undefined } : undefined, activation: rule.activation },
      { name: rule.label, cards: rule.cards, initialCards: rule.conditions?.requiredCards ?? rule.cards, summary: rule.source,
        evidence: [rule.activation, ...(rule.conditions?.groups.map(group => `Choose at least ${group.minimum}: ${group.cards.join(', ')}`) ?? []), ...(rule.evidence ? [rule.evidence.verification, ...rule.evidence.ambiguities] : [])].filter(Boolean) }, `#${encodeURIComponent(pkg.id)}`))));
  }
  if (kind === 'win-rate') {
    const data = raw as WinRatePackagesData;
    if (!Array.isArray(data.results)) throw new Error('Invalid win-rate report');
    return Promise.all(data.results.map(f => make([f.cohort, [...f.cards].sort()], f, {
      name: f.cards.join(' + '), cards: f.cards, initialCards: f.cards,
      summary: `${f.champion} · ${f.season} · ${f.status.replaceAll('-', ' ')}`,
      evidence: [`Discovery: ${f.discovery.complete.decks} decks across ${f.discovery.complete.events} events.`, `Later events: ${f.validation.complete.decks} decks; ${f.validation.sufficient ? 'sufficient comparison' : 'limited comparison'}.`, `Observed win-rate difference: ${f.discovery.lift === null ? 'unavailable' : `${(f.discovery.lift * 100).toFixed(1)} percentage points`}.`],
    })));
  }
  if (kind === 'experimental') {
    const data = raw as typeof mechanics;
    if (data.method !== 'mechanics-experiment-v1' || !Array.isArray(data.candidates)) throw new Error('Invalid experimental report');
    return Promise.all(data.candidates.map(f => make([f.interaction, [...f.cards].sort()], f, {
      name: f.cards.join(' + '), cards: f.cards, initialCards: f.cards,
      summary: `${f.interaction.replaceAll('-', ' ')} · ${f.usage.togetherDecks} decks together`, evidence: [f.reason, ...f.constraints],
    })));
  }
  const data = raw as ConstructionReport;
  if (data.method !== 'within-build-construction-v1' || !Array.isArray(data.candidates)) throw new Error('Invalid construction report');
  return Promise.all(data.candidates.map(f => make(f.id, f, {
    name: f.cards.join(' + '), cards: f.cards, initialCards: f.core.map(c => c.name), sections: new Map(f.core.map(c => [c.name, c.section])),
    summary: `${f.build} · ${f.season} · ${f.validation.status.replaceAll('-', ' ')}`,
    evidence: [`${f.discovery.complete.decks} decks used the complete package across ${f.discovery.complete.events} events.`, ...f.questions, ...(f.bannedCards.length ? [`Banned in Standard: ${f.bannedCards.join(', ')}`] : [])],
  })));
}
export function researchDraft(finding: ResearchFinding, catalog: ReadonlyMap<string, Card>): EditorialPackage {
  const cards: SharedPackageCard[] = [...new Set(finding.initialCards.length ? finding.initialCards : finding.cards)].map(name => {
    const section = finding.sections?.get(name) ?? (catalog.get(name)?.types.some(type => type === 'CHAMPION' || type === 'REGALIA') ? 'material' : 'main');
    return { name, quantity: section === 'material' ? 1 : 4, section };
  });
  return { id: `research-${finding.research.key}`, research: finding.research, definition: { v: 1, name: finding.name.slice(0, 80), cards }, revision: 0, status: 'draft', updatedAt: '' };
}
export function researchStatus(saved?: EditorialPackage, current?: ResearchFinding) {
  if (!saved) return 'Needs review';
  if (current && saved.research?.fingerprint !== current.research.fingerprint) return 'Updated evidence';
  return saved.research?.dismissed ? 'Dismissed' : saved.status === 'published' ? 'Approved' : 'Draft';
}

/** Combine full selected pools, without inheriting approval or asserting joint evidence. */
export function combinedResearchDraft(findings: ResearchFinding[], catalog: ReadonlyMap<string, Card>, id: string): EditorialPackage {
  if (new Set(findings.map(f => f.research.key)).size < 2) throw new Error('Select at least two findings.');
  const names = [...new Set(findings.flatMap(f => f.cards))].sort();
  if (!names.length) throw new Error('These findings have no cards to combine.');
  if (names.length > SHARED_PACKAGE_LIMITS.maxCards) throw new Error(`Select fewer findings: a package can hold up to ${SHARED_PACKAGE_LIMITS.maxCards} cards.`);
  const cards: SharedPackageCard[] = names.flatMap(name => {
    const sections = new Set(findings.filter(f => f.cards.includes(name)).flatMap(f => f.sections?.has(name) ? [f.sections.get(name)!] : []));
    if (!sections.size) sections.add(catalog.get(name)?.types.some(type => type === 'CHAMPION' || type === 'REGALIA') ? 'material' : 'main');
    return [...sections].sort().map(section => ({ name, quantity: section === 'material' ? 1 : 4, section }));
  });
  if (cards.length > SHARED_PACKAGE_LIMITS.maxCards) throw new Error(`Select fewer findings: a package can hold up to ${SHARED_PACKAGE_LIMITS.maxCards} card lines.`);
  return { id, definition: { v: 1, name: 'Combined package', cards }, revision: 0, status: 'draft', updatedAt: '' };
}
