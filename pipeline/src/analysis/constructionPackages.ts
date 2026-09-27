import type { ConstructionCandidate, ConstructionMember, ConstructionSupport } from "@gatcg/shared";
export interface ConstructionDeck {
  id: string; player: string; event: string; date: string; counts: Map<string, number>;
}
export const constructionKey = (member: ConstructionMember) => JSON.stringify([member.section, member.name]);
export const constructionMember = (key: string): ConstructionMember => { const [section, name] = JSON.parse(key); return { section, name }; };
export const CONSTRUCTION_SETTINGS = { minCohort: 50, minDates: 8, maxCards: 50, minPrevalence: .1, maxPrevalence: .8, minPhi: .6, minTogether: 8, minPlayers: 15, minEvents: 5, minSimilarity: .75, maxGroup: 4, maxPerCohort: 3, maxResults: 10 };
const support = (decks: ConstructionDeck[]): ConstructionSupport => ({ decks: decks.length, players: new Set(decks.map(d => d.player)).size, events: new Set(decks.map(d => d.event)).size, lists: new Set(decks.map(d => JSON.stringify([...d.counts].sort()))).size });
const supported = (s: ConstructionSupport) => s.decks >= 8 && s.players >= 5 && s.events >= 3 && s.lists >= 3;
export function splitConstruction(decks: ConstructionDeck[]) {
  const dates = [...new Set(decks.map(d => d.date))].sort();
  const starts = dates[Math.floor(dates.length * .7)] ?? "";
  return { starts, discovery: decks.filter(d => d.date < starts), validation: decks.filter(d => d.date >= starts) };
}
export function constructionSimilarity(a: ConstructionDeck, b: ConstructionDeck, excluded: Set<string>) {
  let intersection = 0, union = 0;
  for (const k of new Set([...a.counts.keys(), ...b.counts.keys()])) {
    if (excluded.has(k)) continue;
    intersection += Math.min(a.counts.get(k) ?? 0, b.counts.get(k) ?? 0);
    union += Math.max(a.counts.get(k) ?? 0, b.counts.get(k) ?? 0);
  }
  return union ? intersection / union : 0;
}
export function mineConstructionCohort(raw: ConstructionDeck[]) {
  const decks = [...new Map(raw.map(d => [d.id, d])).values()].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (decks.length < CONSTRUCTION_SETTINGS.minCohort || new Set(decks.map(d => d.date)).size < CONSTRUCTION_SETTINGS.minDates) return [];
  const { discovery, validation, starts } = splitConstruction(decks);
  const frequency = new Map<string, number>();
  for (const d of discovery) for (const [k, q] of d.counts) if (q > 0) frequency.set(k, (frequency.get(k) ?? 0) + 1);
  const keys = [...frequency].filter(([,n]) => n / discovery.length >= .1 && n / discovery.length <= .8)
    .sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,50).map(([k]) => k);
  const phi = (a: string, b: string) => {
    const na = frequency.get(a)!, nb = frequency.get(b)!;
    const both = discovery.filter(d => (d.counts.get(a) ?? 0)>0 && (d.counts.get(b) ?? 0)>0).length;
    const denominator = Math.sqrt(na*nb*(discovery.length-na)*(discovery.length-nb));
    return denominator ? (both*discovery.length-na*nb)/denominator : 0;
  };
  const edges = new Map<string, number>();
  const edgeKey = (a: string,b: string) => JSON.stringify([a,b].sort());
  const seeds: { keys: string[]; score: number }[] = [];
  for (let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++) {
    const score = phi(keys[i],keys[j]); edges.set(edgeKey(keys[i],keys[j]),score);
    if(score >= CONSTRUCTION_SETTINGS.minPhi) seeds.push({keys:[keys[i],keys[j]],score});
  }
  seeds.sort((a,b)=>b.score-a.score || a.keys.join().localeCompare(b.keys.join()));
  const results: Omit<ConstructionCandidate,"id"|"source"|"buildId"|"build"|"champion"|"format"|"season"|"mechanics"|"bannedCards"|"definingOverlap"|"questions">[]=[];
  const seen = new Set<string>();
  for (const seed of seeds) {
    const group = [...seed.keys];
    for (const k of keys) if (group.length<4 && !group.includes(k) && group.every(g => (edges.get(edgeKey(g,k))??0)>=CONSTRUCTION_SETTINGS.minPhi)) group.push(k);
    group.sort(); const groupKey=JSON.stringify(group); if(seen.has(groupKey)) continue; seen.add(groupKey);
    if(results.some(r => group.filter(k=>r.core.some(m=>constructionKey(m)===k)).length>=2)) continue;
    const complete = (d: ConstructionDeck) => group.every(k=>(d.counts.get(k)??0)>0);
    const absent = (d: ConstructionDeck) => group.every(k=>!(d.counts.get(k)??0));
    const withGroup=discovery.filter(complete), withoutGroup=discovery.filter(absent);
    const yes=support(withGroup), no=support(withoutGroup);
    if(!supported(yes)||yes.players < CONSTRUCTION_SETTINGS.minPlayers||yes.events < CONSTRUCTION_SETTINGS.minEvents||!supported(no)) continue;
    const excluded=new Set(group);
    const matches: {a:ConstructionDeck;b:ConstructionDeck;similarity:number}[]=[];
    // Bounded, deterministic matching; no outcome or held-out data used to select examples.
    for(const a of withGroup.slice(0,100)) {
      let best: typeof matches[number] | undefined;
      for(const b of withoutGroup.slice(0,200)) {
        if(a.player===b.player) continue;
        const similarity=constructionSimilarity(a,b,excluded);
        if(similarity>=.75 && (!best || similarity>best.similarity)) best={a,b,similarity};
      }
      if(best) matches.push(best);
    }
    matches.sort((a,b)=>b.similarity-a.similarity || a.a.id.localeCompare(b.a.id));
    const chosen=matches.filter((m,i)=>matches.findIndex(n=>n.b.id===m.b.id)===i).slice(0,3);
    if(!chosen.length) continue;
    const median=(values:number[])=>{const s=values.sort((a,b)=>a-b);return s[Math.floor(s.length/2)]??0;};
    const options=[...frequency.keys()].filter(k=>!excluded.has(k)).flatMap(k=>{
      const withCore=withGroup.filter(d=>(d.counts.get(k)??0)>0).length/withGroup.length;
      const withoutCore=withoutGroup.filter(d=>(d.counts.get(k)??0)>0).length/withoutGroup.length;
      return withCore>=.25 && withCore<=.85 && withCore-withoutCore>=.2 ? [{member:constructionMember(k),withCore,withoutCore}] : [];
    }).sort((a,b)=>(b.withCore-b.withoutCore)-(a.withCore-a.withoutCore)).slice(0,4);
    const later=validation.filter(complete), laterNo=validation.filter(absent);
    const discoveryPlayers=new Set(discovery.map(d=>d.player));
    const newPlayers=new Set(later.filter(d=>!discoveryPlayers.has(d.player)).map(d=>d.player)).size;
    const laterSupport=support(later), laterAbsent=support(laterNo);
    const status=validation.length<20 || new Set(validation.map(d=>d.event)).size<3 ? "insufficient-data" : supported(laterSupport)&&newPlayers>=3 ? "repeated" : "not-repeated";
    let weakestAssociation=1;
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)weakestAssociation=Math.min(weakestAssociation,edges.get(edgeKey(group[i],group[j]))??0);
    const difference=(a:ConstructionDeck,b:ConstructionDeck)=>[...a.counts].flatMap(([k,q])=>q>(b.counts.get(k)??0)?[{member:constructionMember(k),quantity:q-(b.counts.get(k)??0)}]:[]);
    results.push({cards:[...new Set(group.map(k=>constructionMember(k).name))],core:group.map(constructionMember),options,
      discovery:{population:discovery.length,complete:yes,absent:no,partial:discovery.length-yes.decks-no.decks,weakestAssociation},
      validation:{starts,population:validation.length,complete:laterSupport,absent:laterAbsent,newPlayers,status},
      quantities:group.map(k=>{const q=withGroup.map(d=>d.counts.get(k)!);return {member:constructionMember(k),min:Math.min(...q),median:median(q),max:Math.max(...q)};}),
      slots:{main:median(withGroup.map(d=>group.filter(k=>constructionMember(k).section==="main").reduce((n,k)=>n+d.counts.get(k)!,0))),material:median(withGroup.map(d=>group.filter(k=>constructionMember(k).section==="material").reduce((n,k)=>n+d.counts.get(k)!,0)))},
      examples:chosen.map(m=>({withId:m.a.id,withoutId:m.b.id,similarity:m.similarity,added:difference(m.a,m.b),removed:difference(m.b,m.a)}))});
    if(results.length>=3)break;
  }
  return results;
}
