/** Versioned inference for the seasonal Standard model. No player identifiers are published. */
export interface ForecastDeck { champion: string; cards: [string, number][] }
export type ResidualStats = Record<string, { n: number; sum: number }>;
export const forecastClip = (p: number) => Math.max(.01, Math.min(.99, p));
export function deckModelValue(deck: ForecastDeck, coefficients: Record<string, number>, format = 'standard') {
  return (coefficients[`champ:${format}:${deck.champion}`] ?? 0) + deck.cards.reduce((sum, [name, quantity]) => sum + quantity / 4 * (coefficients[`card:${name}`] ?? 0), 0);
}
export function matchupValue(a: string, b: string, coefficients: Record<string, number>, format = 'standard') {
  return a === b ? 0 : (a < b ? 1 : -1) * (coefficients[`matchup:${format}:${JSON.stringify([a,b].sort())}`] ?? 0);
}
export function seasonalCorrection(stats: ResidualStats, mass: number, format: string, period: string | null, a: string, b: string) {
  const key = (...parts: unknown[]) => JSON.stringify(parts);
  const mean = (k: string, fallback = 0) => { const s=stats[k]; return ((s?.sum??0)+mass*fallback)/((s?.n??0)+mass); };
  const pair=[a,b].sort(), sign=a<b?1:-1;
  const champion=(mean(key(format,a))-mean(key(format,b)))/2;
  const global=a===b?0:sign*mean(key(format,pair),sign*champion);
  const localChampion=period?(mean(key(period,a),mean(key(format,a)))-mean(key(period,b),mean(key(format,b))))/2:champion;
  return { global, local:!period?global:a===b?0:sign*mean(key(period,pair),sign*(global+localChampion-champion)) };
}
export interface DeckForecastModel {
  generatedAt: string; schemaVersion: 1; asOf: string; expires: string; season: string; period: string;
  coefficients: Record<string, number>; residuals: ResidualStats; priorMass: number; scale: number;
  field: { champion: string; card: string; value: number; weight: number }[];
  coverage: { entrants: number; modeledEntrants: number; events: number; from: string; through: string };
  provenance: Record<string, string>;
}
export function forecastDeck(deck: ForecastDeck, model: DeckForecastModel, format: string, today = new Date().toISOString().slice(0,10)) {
  if (format.toLowerCase() !== 'standard') return { status:'unsupported-format' as const };
  if (model.schemaVersion !== 1 || today > model.expires || today < model.asOf) return { status:'unavailable' as const };
  if (!deck.champion || !deck.cards.length || deck.cards.some(([,q])=>!Number.isSafeInteger(q)||q<=0)) return { status:'incomplete' as const };
  if (!Object.hasOwn(model.coefficients,`champ:standard:${deck.champion}`) && !((model.residuals[JSON.stringify(['standard',deck.champion])]?.n ?? 0) > 0)) return { status:'unsupported-champion' as const };
  const total=model.field.reduce((n,d)=>n+d.weight,0);
  if (!total) return { status:'unavailable' as const };
  const value=deckModelValue(deck,model.coefficients), groups=new Map<string,{champion:string;card:string;sum:number;weight:number}>();
  let sum=0;
  for (const other of model.field) {
    const base=forecastClip(.5+value-other.value+matchupValue(deck.champion,other.champion,model.coefficients));
    const correction=seasonalCorrection(model.residuals,model.priorMass,'standard',model.period,deck.champion,other.champion).local;
    const score=.5+model.scale*(forecastClip(base+correction)-.5);
    const g=groups.get(other.champion)??{champion:other.champion,card:other.card,sum:0,weight:0};
    g.sum+=score*other.weight;g.weight+=other.weight;groups.set(other.champion,g);sum+=score*other.weight;
  }
  const copies=deck.cards.reduce((n,[,q])=>n+q,0),known=deck.cards.reduce((n,[name,q])=>n+(Object.hasOwn(model.coefficients,`card:${name}`)?q:0),0);
  return { status:'ready' as const, score:sum/total, cardCoverage:known/copies,
    matchups:[...groups.values()].map(g=>({champion:g.champion,card:g.card,score:g.sum/g.weight,share:g.weight/total})).sort((a,b)=>b.share-a.share||a.champion.localeCompare(b.champion)) };
}
