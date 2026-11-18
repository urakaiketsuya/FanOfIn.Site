import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';

export const CASELLA_THREE = "Casella, Sky's Cantatrice";
const SONG_COST: Record<string, number> = { 'Aiss Yustera': 5, Chromatic: 2, 'Skyward Requiem': 1, 'Let My Thunder Be Heard': 3 };
const HYMN = "Casella's Indomitable Hymn";
interface Ally { name: string; power: number; buff: number; counters: number; attacked: boolean; serial: number }
export interface CasellaLineResult { first: number; repeat: number; buffs: number; triggered: number; total: number; trace: string[]; sources: string[] }
interface State extends CasellaLineResult {
  level: number; graveyard: string[]; banished: string[]; poise: number; drawn: number;
  hand: string[]; memory: string[]; board: Ally[]; aria: number; arcane: number;
  faceup: string[]; pending: boolean; refrain: boolean; lineage: number; conversion: boolean;
  discount: number; replay: boolean; rng: number; serial: number; material: string[]; backup: boolean; powercell: boolean;
  charm: number; links: number[]; returned: Record<string, number>; library: string[];
}
const clone = (s: State): State => ({ ...s, graveyard: [...s.graveyard], banished: [...s.banished], hand: [...s.hand], memory: [...s.memory], board: s.board.map(a => ({ ...a })), faceup: [...s.faceup], trace: [...s.trace], sources: [...s.sources], links: [...s.links], returned: { ...s.returned }, library: [...s.library], material: [...s.material] });
const total = (s: CasellaLineResult) => s.first + s.repeat + s.buffs + s.triggered;
const cost = (c: Card) => Math.max(0, Number(c.cost_reserve ?? c.cost?.value ?? 0));
function record(s: State, name: string, action: string) { s.trace.push(action); if (!s.sources.includes(name)) s.sources.push(name); }
function removeAria(s: State, n: number) { s.aria -= n; if (s.refrain && n > 0) s.triggered += 1 + n; }
function empower(s: State, n: number) { if (s.conversion) s.aria += n; }
function bounce(s: State, index: number, memory = false) {
  const [ally] = s.board.splice(index, 1);
  (memory ? s.memory : s.hand).push(ally.name);
  if (!memory && ally.attacked) s.returned[ally.name] = (s.returned[ally.name] ?? 0) + 1; // Fresh deployment loses every counter and temporary modifier.
}
function createCasellaState(hand: string[], remaining: string[], deck: AnalyticsDeck, cards: Map<string,Card>): State {
  return { level: 3, graveyard: [], banished: [], poise: 0, drawn: hand.length, hand: [...hand].sort(), memory: [], board: [], aria: 4, arcane: 0, faceup: [], pending: false, refrain: false, lineage: 2, conversion: true, discount: 0, replay: false, rng: [...hand,...remaining].join().split('').reduce((h,c)=>Math.imul(h,31)+c.charCodeAt(0)>>>0,7), serial: 0,
    material: deck.material.filter(l=>!cards.get(l.name)?.types.includes('CHAMPION') && l.name!=='Backup Charger').flatMap(l=>Array.from({length:l.quantity},()=>l.name)), backup: deck.material.some(l => l.name === 'Backup Charger' && l.quantity > 0), powercell: false, charm: 0, links: [], returned: {}, library: [...remaining], first: 0, repeat: 0, buffs: 0, triggered: 0, total: 0, trace: [], sources: [] };
}
/** A bounded, reproducible search, not an optimal-play or opponent simulation.
 * The supplied access pool begins in hand; Casella level three and its two inner
 * champions are established, with the four entry empower counters converted to aria.
 * Reserve payments move actual hand cards into memory and cannot be reused.
 */
function runCasellaSequence(hand: string[], remaining: string[], deck: AnalyticsDeck, cards: Map<string, Card>, width = 12, carried?: State, canAttack = true): State {
  const songs = [...new Set((deck.song ?? []).filter(l => l.quantity > 0).map(l => l.name))].filter(n => n in SONG_COST);
  const initial = carried ?? createCasellaState(hand,remaining,deck,cards);
  const draw = (s: State, memory: boolean) => { const name = s.library.shift(); if (name) { (memory ? s.memory : s.hand).push(name); s.drawn++; } };
  function scavenge(s: State, amount: number, type: string) {
    const top = s.library.splice(0, amount);
    const index = top.findIndex(n => type === 'ARCANE' ? cards.get(n)?.elements.includes('ARCANE') : cards.get(n)?.types.includes(type));
    if (index >= 0) { s.hand.push(top.splice(index, 1)[0]); s.drawn++; }
    for(let i=top.length-1;i>0;i--) {
      s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;
      const j=Math.floor(s.rng/4294967296*(i+1));[top[i],top[j]]=[top[j],top[i]];
    }
    s.library.push(...top);
  }
  const value = (name: string) => cards.get(name)?.types.includes('ALLY') ? 5 : ['Harness Lightning', HYMN, "Casella's Poise", 'Final Refrain', 'Reclaim'].includes(name) ? 4 : 0;
  function pay(source: State, amount: number, name?: string, reverse = false): State | null {
    const s = clone(source);
    if (name) { const i = s.hand.indexOf(name); if (i < 0) return null; s.hand.splice(i, 1); s.replay=(s.returned[name] ?? 0)>0; if(s.replay) s.returned[name]--; }
    if (!Number.isFinite(amount) || amount < 0 || s.hand.length < amount) return null;
    s.hand.sort((a,b) => (reverse ? -1 : 1) * (value(a)-value(b)) || a.localeCompare(b));
    s.memory.push(...s.hand.splice(0, amount));
    for(const returned of Object.keys(s.returned)) s.returned[returned]=Math.min(s.returned[returned],s.hand.filter(n=>n===returned).length);
    return s;
  }
  const levelUp = (s: State) => advanceCasellaLevel(s);
  let beam = [initial], best = initial;
  const score = (s: State) => total(s) + s.board.filter(a=>!a.attacked).reduce((n,a)=>n+a.power+a.buff+a.counters,0) + s.aria * (s.refrain ? 0.7 : 0.12) + s.hand.length * 0.2;
  // Small retained-resource values keep non-damaging opening deployments in the
  // beam. These are fixed search heuristics, not fitted game-outcome weights.
  const endScore = (s: State) => total(s) + s.charm*0.5 + s.poise*0.3 + Number(s.powercell)*0.3 +
    (s.level<3 && s.memory.length+s.poise+s.graveyard.filter(n=>n==='Reclaim').length >= s.level+1 ? 1.2 : 0) + s.board.reduce((n,a)=>n+(a.power+a.counters)*0.6,0) + s.level*2 + s.aria*0.2 + (s.hand.length+s.memory.length)*0.15 + Number(s.refrain)*0.5;
  for (let depth = 0; depth < 40 && beam.length; depth++) {
    const next: State[] = [];
    const add = (s: State) => { s.total = total(s); if (!s.pending && (carried ? endScore(s) > endScore(best) : s.total > best.total)) best = s; next.push(s); };
    for (const state of beam) {
      if (state.pending) {
        const skip = clone(state); skip.pending = false; add(skip);
        for (const song of songs) {
          const amount = SONG_COST[song]; if (state.aria < amount) continue;
          const s = clone(state); s.pending = false; removeAria(s, amount);
          const premiere = !s.faceup.includes(song); if (premiere) s.faceup.push(song);
          if (song === 'Skyward Requiem' && premiere) empower(s, 2);
          if (song === 'Aiss Yustera') {
            if (premiere) s.discount = 2;
            if (s.hand.length + s.memory.length <= 7) {
              scavenge(s, 7, 'ALLY');
            }
          }
          if (song === 'Chromatic' && premiere) {
            for (const element of new Set(s.board.flatMap(a=>cards.get(a.name)?.elements ?? []).filter(element=>element!=='EXALTED'))) {
              const target = s.board.find(a => !a.attacked && cards.get(a.name)?.elements.includes(element)) ?? s.board.find(a => cards.get(a.name)?.elements.includes(element)); if (target) target.counters++;
            }
          }
          if (song === 'Let My Thunder Be Heard') {
            if (premiere) {
              s.memory.sort((a,b)=>Number(cards.get(b)?.elements.includes('ARCANE'))-Number(cards.get(a)?.elements.includes('ARCANE')));
              for (const name of s.memory.splice(0, 3)) { s.banished.push(name); if (cards.get(name)?.elements.includes('ARCANE')) s.arcane++; draw(s, false); }
            }
            if (s.faceup.length >= 4) for (const a of s.board) a.buff += Math.min(6, s.arcane);
          }
          record(s, song, `Sing ${song}${premiere ? ' · premiere' : ''}`); add(s);
          if (song === 'Skyward Requiem' && s.aria >= 3) { const extra = clone(s); removeAria(extra, 3); draw(extra, true); record(extra, song, 'Spend 3 aria · draw to memory'); add(extra); }
        }
        continue;
      }
      for (let i = 0; i < state.board.length; i++) {
        if (!canAttack || state.board[i].attacked) continue;
        const s = clone(state), ally = s.board[i]; ally.attacked = true;
        // Attack history belongs to the physical ally serial, carried through hand returns below.
        if (ally.serial < 0) s.repeat += ally.power; else s.first += ally.power;
        s.buffs += ally.buff + ally.counters;
        record(s, ally.name, `Attack ${ally.name} · ${ally.power + ally.buff + ally.counters}`); add(s);
        if (ally.name === 'Stormblade Squire' && s.memory.length) {
          const extra=clone(s); extra.rng=(Math.imul(extra.rng,1664525)+1013904223)>>>0;
          const [banished]=extra.memory.splice(Math.floor(extra.rng/4294967296*extra.memory.length),1);
          extra.banished.push(banished);
          if(cards.get(banished)?.elements.includes('ARCANE')) extra.arcane++;
          scavenge(extra,2+(cards.get(banished) ? cost(cards.get(banished)!) : 0),'ARCANE');
          record(extra,ally.name,'Squire · random memory banish and scavenge');add(extra);
        }

      }
      if (state.backup) { const s=pay(state,3); if(s) { s.backup=false; s.banished.push('Backup Charger'); s.powercell=true; draw(s,true); record(s,'Backup Charger','Pay 3 · banish Charger · Powercell and memory draw');add(s); } }
      if (state.level >= 3 && state.lineage > 0) {
        const s = pay(state, 3); if (s) { s.banished.push(state.lineage === 2 ? 'Casella, Wistful Refrain' : 'Casella, Volant Songstress'); s.lineage--; if (!s.lineage) s.conversion = false; s.pending = true; record(s, CASELLA_THREE, 'Banish inner champion · sing'); add(s); }
      }
      for (let i=0;i<state.links.length;i++) { const index=state.board.findIndex(a=>a.serial===state.links[i]); if(index<0) continue; const s=pay(state,1); if(s) { s.links.splice(i,1); s.graveyard.push('StrideTech W'); bounce(s,index,true); record(s,'StrideTech W','Return linked ally to memory'); add(s); } }
      if (state.charm && state.level >= 1) { const s = clone(state); s.charm--; s.graveyard.push('ChannelTech Charm S'); empower(s,2); record(s,'ChannelTech Charm S','Sacrifice Charm · 2 aria'); add(s); }
      for (const name of new Set(state.hand)) {
        const card = cards.get(name); if (!card) continue;
        const ally = card.types.includes('ALLY');
        if (state.level < 3 && card.elements.includes('ARCANE')) continue;
        const supported = ally || ['Reclaim','Harness Lightning','Battlefield Benediction',HYMN,"Casella's Poise",'Final Refrain','ChannelTech Charm S','Turbo Charge','StrideTech W','Fairy Whispers'].includes(name);
        if (!supported || (name === 'Final Refrain' && state.refrain) || (name === 'Turbo Charge' && !state.powercell)) continue;
        const amount = Math.max(0, cost(card) - (ally ? state.discount : name === 'Final Refrain' ? state.level : name === 'Battlefield Benediction' && state.level >= 1 ? 1 : 0));
        for (const reverse of [false, true]) {
          const base = pay(state, amount, name, reverse); if (!base) continue;
          if (ally) {
            if (card.types.includes('UNIQUE') && base.board.some(a=>a.name===name)) continue;
            base.discount = 0;
            base.board.push({name, power:card.power ?? 0, buff:0, counters:0, attacked:false, serial: base.replay ? -(++base.serial) : ++base.serial});
            if (name === 'Windmill Engineer' && amount > 0 && base.memory.slice(-amount).filter(n=>cards.get(n)?.elements.includes('WIND')).length >= 2) draw(base,true);
            if (name === 'Fluffy Shopkeep' && base.material.filter(n=>!cards.get(n)?.types.includes('CHAMPION')).length >= 2) { base.material.sort((a,b)=>Number(cards.get(a)?.types.includes('CHAMPION'))-Number(cards.get(b)?.types.includes('CHAMPION')) || Number(cards.get(b)?.elements.includes('ARCANE'))-Number(cards.get(a)?.elements.includes('ARCANE'))); for(const n of base.material.splice(0,2)) {base.banished.push(n); if(cards.get(n)?.elements.includes('ARCANE')) base.arcane++;} draw(base,true); }
            if (name === 'Aesan Protector') {
              for (let i=0;i<base.board.length;i++) { const s=clone(base); const returned=s.board[i]; bounce(s,i); record(s,name,`Deploy Protector · return ${returned.name}`); add(s); }
            } else { record(base,name,`Deploy ${name}`); add(base);
              if (carried && name === 'Dungeon Guide' && base.level < 3 && base.memory.length >= 2 && base.material.includes(CASELLA_LEVELS[base.level])) {
                const accelerated=clone(base); banishRandomMemory(accelerated,2,cards); levelUp(accelerated); record(accelerated,name,'Dungeon Guide · banish 2 memory · level up'); add(accelerated);
              }
            }
          } else if (name === 'StrideTech W') {
            for (const ally of base.board) { const s=clone(base); s.links.push(ally.serial); draw(s,true); record(s,name,`Link ${ally.name}`); add(s); }
          } else if (name === 'Reclaim') {
            base.graveyard.push(name);
            for (let i=0;i<base.board.length;i++) { const s=clone(base); const returned=s.board[i]; bounce(s,i); record(s,name,`Reclaim ${returned.name}`); add(s); }
          } else if (name === 'Harness Lightning') {
            base.arcane++; base.banished.push(name);
            const aria=clone(base); empower(aria,4); record(aria,name,'Harness · 4 aria'); add(aria);
            for (let i=0;i<base.board.length;i++) if (!base.board[i].attacked) { const s=clone(base); s.board[i].buff+=4; record(s,name,`Harness · buff ${s.board[i].name}`); add(s); }
          } else {
            if(card.types.includes('ACTION')) base.graveyard.push(name);
            if (name === "Casella's Poise") base.poise++;
            if (name === 'Battlefield Benediction') empower(base,2); // No opponent-board threshold inferred.
            if (name === 'Final Refrain') { base.refrain=true; empower(base,3); }
            if (state.level >= 1 && (name === HYMN || name === "Casella's Poise")) base.pending=true;
            if (name === 'ChannelTech Charm S') { base.charm++; draw(base,true); }
            if (name === 'Fairy Whispers') {
              const top=base.library.splice(0,3), hit=top.findIndex(n=>cards.get(n)?.elements.includes('WIND'));
              if(hit>=0) {base.hand.push(top.splice(hit,1)[0]);base.drawn++;base.library.push(...top);}
              else {base.library.push(...top);if(cards.get(base.library[0])?.elements.includes('WIND')) draw(base,false);}
            }
            if (name === 'Turbo Charge') { base.powercell=false; draw(base,false); draw(base,false); }
            record(base,name,`Resolve ${name}`); add(base);
          }
        }
      }
    }
    const distinct = new Map<string,State>();
    for (const s of next.sort((a,b)=> (carried ? endScore(b)-endScore(a) : score(b)-score(a)))) {
      const key=JSON.stringify([s.level,s.graveyard,s.banished,s.poise,s.hand.slice().sort(),s.memory,s.board,s.aria,s.arcane,s.faceup,s.pending,s.refrain,s.lineage,s.discount,s.material,s.backup,s.powercell,s.charm,s.links,s.returned,s.library,s.rng]);
      if (!distinct.has(key)) distinct.set(key,s);
      if (distinct.size >= width) break;
    }
    beam=[...distinct.values()];
  }
  return best;
}

export function sequenceCasellaCombat(hand: string[], remaining: string[], deck: AnalyticsDeck, cards: Map<string, Card>, width = 12): CasellaLineResult {
  const best=runCasellaSequence(hand,remaining,deck,cards,width);
  return {first:best.first,repeat:best.repeat,buffs:best.buffs,triggered:best.triggered,total:best.total,trace:best.trace,sources:best.sources};
}

export function casellaCombatForecast(deck: AnalyticsDeck, cards: Map<string,Card>, seen: number, samples = 64) {
  const main=aggregateLines(deck.main).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(l=>Array.from({length:l.quantity},()=>l.name));
  const required=['Casella, Volant Songstress','Casella, Wistful Refrain',CASELLA_THREE];
  const missing=[...deck.main,...deck.material,...(deck.song ?? [])].filter(l=>l.quantity>0&&!cards.has(l.name)).map(l=>l.name);
  const available=!missing.length && required.every(name=>deck.material.some(l=>l.name===name&&l.quantity>0)) && !!deck.song?.length && deck.song.every(l=>l.quantity===1 && l.name in SONG_COST) && deck.song.length<=4 && new Set(deck.song.map(l=>l.name)).size===deck.song.length;
  const values: CasellaLineResult[]=[]; let seed=0xc45e11a;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const count=Math.max(0,Math.min(main.length,Math.floor(seen)));
  if(available) for(let t=0;t<samples;t++) { const shuffled=[...main];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];} values.push(sequenceCasellaCombat(shuffled.slice(0,count),shuffled.slice(count),deck,cards)); }
  values.sort((a,b)=>a.total-b.total);
  const at=(p:number)=>values[Math.max(0,Math.ceil(values.length*p)-1)];
  return {available,missing,seen:count,samples:values.length,low:at(.1)?.total ?? 0,median:at(.5)?.total ?? 0,high:at(.9)?.total ?? 0,
    representative:at(.5), repeatChance:values.length?values.filter(v=>v.repeat>0).length/values.length:0};
}

const CASELLA_LEVELS = ['Casella, Volant Songstress','Casella, Wistful Refrain',CASELLA_THREE];
function banishRandomMemory(state: State, count: number, cards: Map<string,Card>) {
  for(let i=0;i<count;i++) {
    state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;
    const [name]=state.memory.splice(Math.floor(state.rng/4294967296*state.memory.length),1);
    state.banished.push(name);
    if(cards.get(name)?.elements.includes('ARCANE')) state.arcane++;
  }
}
function advanceCasellaLevel(state: State) {
  const name=CASELLA_LEVELS[state.level], index=state.material.indexOf(name);
  if(index<0) return;
  state.material.splice(index,1);
  if(state.level>0) state.lineage++;
  state.level++;
  if(state.level===1) state.conversion=true;
  if(state.level<=2) empower(state,2);
  if(state.level===2 && state.aria>=5) {const drawn=state.library.shift();if(drawn){state.hand.push(drawn);state.drawn++;}}
  record(state,name,`Level ${state.level} · ${name}`);
}
/** Payment occurs before recollection. Floating/Active Memory reduce the random
 * memory banish; no mutation is committed when the full cost cannot be paid. */
function payMaterialMemory(state:State, amount:number, cards:Map<string,Card>):boolean {
  const floating=state.graveyard.filter(n=>n==='Reclaim').length;
  if(!Number.isSafeInteger(amount)||amount<0||state.memory.length+floating+state.poise<amount) return false;
  let remaining=amount;
  while(remaining>0 && state.graveyard.includes('Reclaim')) {state.graveyard.splice(state.graveyard.indexOf('Reclaim'),1);state.banished.push('Reclaim');remaining--;record(state,'Reclaim','Floating Memory · pay 1');}
  while(remaining>0 && state.poise>0) {state.poise--;state.graveyard.push("Casella's Poise");remaining--;record(state,"Casella's Poise",'Active Memory · pay 1');}
  banishRandomMemory(state,remaining,cards);
  return true;
}
export interface CasellaTurnFrame extends CasellaLineResult {
  turn:number; thisTurn:number; level:number; aria:number; hand:number; memory:number; allies:number; drawn:number;
  mainAccounted:number; mainSize:number;
}
/** Fixed first/second-player turn policy. No mulligan, opponent removal or free
 * materialization. Persistent state is chosen once and carried to every checkpoint. */
export function simulateCasellaTurns(orderedMain:string[], deck:AnalyticsDeck, cards:Map<string,Card>, turns=5, playOrder:'first'|'second'='first', width=12):CasellaTurnFrame[] {
  let state=createCasellaState([],orderedMain,deck,cards);
  state.level=0;state.aria=0;state.lineage=0;state.conversion=false;state.backup=false;
  state.material=deck.material.filter(l=>l.name!=='Spirit of Wind').flatMap(l=>Array.from({length:l.quantity},()=>l.name));
  state.hand=state.library.splice(0,7);state.drawn=state.hand.length;
  const mainNames=new Set(orderedMain), frames:CasellaTurnFrame[]=[];
  for(let turn=1;turn<=turns;turn++) {
    const before=state.total;
    state=clone(state);state.returned={};state.discount=0;state.links=state.links.map(Math.abs);
    for(const ally of state.board) {ally.attacked=false;ally.buff=0;ally.serial=Math.abs(ally.serial);}
    if(turn>1 || playOrder==='second') {
      const nextChampion=CASELLA_LEVELS[state.level];
      const champion=cards.get(nextChampion);
      const memoryCost=champion ? Number(champion.cost_memory ?? champion.cost?.value) : NaN;
      if(state.level<3 && state.material.includes(nextChampion) && payMaterialMemory(state,memoryCost,cards)) {
        advanceCasellaLevel(state);
      } else if(state.material.includes('Backup Charger') && payMaterialMemory(state,Number(cards.get('Backup Charger')?.cost_memory ?? 0),cards)) {
        state.material.splice(state.material.indexOf('Backup Charger'),1);state.backup=true;
        record(state,'Backup Charger','Materialize Backup Charger');
      }
      state.hand.push(...state.memory);state.memory=[];
    }
    if(turn>1 || playOrder==='second') {const name=state.library.shift();if(name){state.hand.push(name);state.drawn++;}}
    state=runCasellaSequence([],[],deck,cards,width,state,turn>1 || playOrder==='second');
    const field=[...state.board.map(a=>a.name),...Array(state.charm).fill('ChannelTech Charm S'),...Array(state.poise).fill("Casella's Poise"),...Array(state.links.length).fill('StrideTech W'),...(state.refrain?['Final Refrain']:[])];
    frames.push({turn,thisTurn:state.total-before,level:state.level,aria:state.aria,hand:state.hand.length,memory:state.memory.length,allies:state.board.length,drawn:state.drawn,
      mainAccounted:[...state.hand,...state.memory,...state.library,...state.graveyard,...state.banished,...field].filter(n=>mainNames.has(n)).length,mainSize:orderedMain.length,
      first:state.first,repeat:state.repeat,buffs:state.buffs,triggered:state.triggered,total:state.total,trace:[...state.trace],sources:[...state.sources]});
  }
  return frames;
}
export function casellaTurnForecast(deck:AnalyticsDeck, cards:Map<string,Card>, samples=64, playOrder:'first'|'second'='first') {
  const coverage=casellaCombatForecast(deck,cards,0,0);
  const available=coverage.available && deck.material.some(l=>l.name==='Spirit of Wind'&&l.quantity>0);
  const main=aggregateLines(deck.main).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(l=>Array.from({length:l.quantity},()=>l.name));
  let seed=0xc45e11a;
  const trajectories:CasellaTurnFrame[][]=[];
  if(available) for(let sample=0;sample<samples;sample++) {
    const shuffled=[...main];for(let i=shuffled.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=Math.floor(seed/4294967296*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    trajectories.push(simulateCasellaTurns(shuffled,deck,cards,5,playOrder));
  }
  return [2,3,4,5].map(turn=>{
    const values=trajectories.map(t=>t[turn-1]).sort((a,b)=>a.total-b.total);
    const at=(p:number)=>values[Math.max(0,Math.ceil(p*values.length)-1)];
    return {available,turn,playOrder,samples:values.length,low:at(.1)?.total??0,median:at(.5)?.total??0,high:at(.9)?.total??0,representative:at(.5),
      levelThreeChance:values.length?values.filter(v=>v.level===3).length/values.length:0,
      repeatChance:values.length?values.filter(v=>v.repeat>0).length/values.length:0};
  });
}
