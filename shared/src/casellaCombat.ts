import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';

export const CASELLA_THREE = "Casella, Sky's Cantatrice";
const SONG_COST: Record<string, number> = { 'Aiss Yustera': 5, Chromatic: 2, 'Skyward Requiem': 1, 'Let My Thunder Be Heard': 3 };
const HYMN = "Casella's Indomitable Hymn";
interface Ally { name: string; power: number; buff: number; attacked: boolean; serial: number }
export interface CasellaLineResult { first: number; repeat: number; buffs: number; triggered: number; total: number; trace: string[]; sources: string[] }
interface State extends CasellaLineResult {
  hand: string[]; memory: string[]; board: Ally[]; aria: number; arcane: number;
  faceup: string[]; pending: boolean; refrain: boolean; lineage: number; conversion: boolean;
  discount: number; replay: boolean; rng: number; serial: number; material: string[]; backup: boolean; powercell: boolean;
  charm: number; links: number[]; returned: Record<string, number>; library: string[];
}
const clone = (s: State): State => ({ ...s, hand: [...s.hand], memory: [...s.memory], board: s.board.map(a => ({ ...a })), faceup: [...s.faceup], trace: [...s.trace], sources: [...s.sources], links: [...s.links], returned: { ...s.returned }, library: [...s.library], material: [...s.material] });
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
/** A bounded, reproducible search, not an optimal-play or opponent simulation.
 * The supplied access pool begins in hand; Casella level three and its two inner
 * champions are established, with the four entry empower counters converted to aria.
 * Reserve payments move actual hand cards into memory and cannot be reused.
 */
export function sequenceCasellaCombat(hand: string[], remaining: string[], deck: AnalyticsDeck, cards: Map<string, Card>, width = 12): CasellaLineResult {
  const songs = [...new Set((deck.song ?? []).filter(l => l.quantity > 0).map(l => l.name))].filter(n => n in SONG_COST);
  const initial: State = { hand: [...hand].sort(), memory: [], board: [], aria: 4, arcane: 0, faceup: [], pending: false, refrain: false, lineage: 2, conversion: true, discount: 0, replay: false, rng: [...hand,...remaining].join().split('').reduce((h,c)=>Math.imul(h,31)+c.charCodeAt(0)>>>0,7), serial: 0,
    material: deck.material.filter(l=>!cards.get(l.name)?.types.includes('CHAMPION') && l.name!=='Backup Charger').flatMap(l=>Array.from({length:l.quantity},()=>l.name)), backup: deck.material.some(l => l.name === 'Backup Charger' && l.quantity > 0), powercell: false, charm: 0, links: [], returned: {}, library: [...remaining], first: 0, repeat: 0, buffs: 0, triggered: 0, total: 0, trace: [], sources: [] };
  const draw = (s: State, memory: boolean) => { const name = s.library.shift(); if (name) (memory ? s.memory : s.hand).push(name); };
  function scavenge(s: State, amount: number, type: string) {
    const top = s.library.splice(0, amount);
    const index = top.findIndex(n => type === 'ARCANE' ? cards.get(n)?.elements.includes('ARCANE') : cards.get(n)?.types.includes(type));
    if (index >= 0) s.hand.push(top.splice(index, 1)[0]);
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
  let beam = [initial], best = initial;
  const score = (s: State) => total(s) + s.board.filter(a=>!a.attacked).reduce((n,a)=>n+a.power+a.buff,0) + s.aria * (s.refrain ? 0.7 : 0.12) + s.hand.length * 0.2;
  for (let depth = 0; depth < 40 && beam.length; depth++) {
    const next: State[] = [];
    const add = (s: State) => { s.total = total(s); if (s.total > best.total) best = s; next.push(s); };
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
              const target = s.board.find(a => !a.attacked && cards.get(a.name)?.elements.includes(element)); if (target) target.buff++;
            }
          }
          if (song === 'Let My Thunder Be Heard') {
            if (premiere) {
              s.memory.sort((a,b)=>Number(cards.get(b)?.elements.includes('ARCANE'))-Number(cards.get(a)?.elements.includes('ARCANE')));
              for (const name of s.memory.splice(0, 3)) { if (cards.get(name)?.elements.includes('ARCANE')) s.arcane++; draw(s, false); }
            }
            if (s.faceup.length >= 4) for (const a of s.board) a.buff += Math.min(6, s.arcane);
          }
          record(s, song, `Sing ${song}${premiere ? ' · premiere' : ''}`); add(s);
          if (song === 'Skyward Requiem' && s.aria >= 3) { const extra = clone(s); removeAria(extra, 3); draw(extra, true); record(extra, song, 'Spend 3 aria · draw to memory'); add(extra); }
        }
        continue;
      }
      for (let i = 0; i < state.board.length; i++) {
        if (state.board[i].attacked) continue;
        const s = clone(state), ally = s.board[i]; ally.attacked = true;
        // Attack history belongs to the physical ally serial, carried through hand returns below.
        if (ally.serial < 0) s.repeat += ally.power; else s.first += ally.power;
        s.buffs += ally.buff;
        record(s, ally.name, `Attack ${ally.name} · ${ally.power + ally.buff}`); add(s);
        if (ally.name === 'Stormblade Squire' && s.memory.length) {
          const extra=clone(s); extra.rng=(Math.imul(extra.rng,1664525)+1013904223)>>>0;
          const [banished]=extra.memory.splice(Math.floor(extra.rng/4294967296*extra.memory.length),1);
          if(cards.get(banished)?.elements.includes('ARCANE')) extra.arcane++;
          scavenge(extra,2+(cards.get(banished) ? cost(cards.get(banished)!) : 0),'ARCANE');
          record(extra,ally.name,'Squire · random memory banish and scavenge');add(extra);
        }

      }
      if (state.backup) { const s=pay(state,3); if(s) { s.backup=false; s.powercell=true; draw(s,true); record(s,'Backup Charger','Pay 3 · banish Charger · Powercell and memory draw');add(s); } }
      if (state.lineage > 0) {
        const s = pay(state, 3); if (s) { s.lineage--; if (!s.lineage) s.conversion = false; s.pending = true; record(s, CASELLA_THREE, 'Banish inner champion · sing'); add(s); }
      }
      for (let i=0;i<state.links.length;i++) { const index=state.board.findIndex(a=>a.serial===state.links[i]); if(index<0) continue; const s=pay(state,1); if(s) { s.links.splice(i,1); bounce(s,index,true); record(s,'StrideTech W','Return linked ally to memory'); add(s); } }
      if (state.charm) { const s = clone(state); s.charm--; empower(s,2); record(s,'ChannelTech Charm S','Sacrifice Charm · 2 aria'); add(s); }
      for (const name of new Set(state.hand)) {
        const card = cards.get(name); if (!card) continue;
        const ally = card.types.includes('ALLY');
        const supported = ally || ['Reclaim','Harness Lightning','Battlefield Benediction',HYMN,"Casella's Poise",'Final Refrain','ChannelTech Charm S','Turbo Charge','StrideTech W','Fairy Whispers'].includes(name);
        if (!supported || (name === 'Final Refrain' && state.refrain) || (name === 'Turbo Charge' && !state.powercell)) continue;
        const amount = Math.max(0, cost(card) - (ally ? state.discount : name === 'Final Refrain' ? 3 : name === 'Battlefield Benediction' ? 1 : 0));
        for (const reverse of [false, true]) {
          const base = pay(state, amount, name, reverse); if (!base) continue;
          if (ally) {
            if (card.types.includes('UNIQUE') && base.board.some(a=>a.name===name)) continue;
            base.discount = 0;
            base.board.push({name, power:card.power ?? 0, buff:0, attacked:false, serial: base.replay ? -(++base.serial) : ++base.serial});
            if (name === 'Windmill Engineer' && base.memory.slice(-amount).filter(n=>cards.get(n)?.elements.includes('WIND')).length >= 2) draw(base,true);
            if (name === 'Fluffy Shopkeep' && base.material.length >= 2) { base.material.sort((a,b)=>Number(cards.get(b)?.elements.includes('ARCANE'))-Number(cards.get(a)?.elements.includes('ARCANE'))); for(const n of base.material.splice(0,2)) if(cards.get(n)?.elements.includes('ARCANE')) base.arcane++; draw(base,true); }
            if (name === 'Aesan Protector') {
              for (let i=0;i<base.board.length;i++) { const s=clone(base); const returned=s.board[i]; bounce(s,i); record(s,name,`Deploy Protector · return ${returned.name}`); add(s); }
            } else { record(base,name,`Deploy ${name}`); add(base); }
          } else if (name === 'StrideTech W') {
            for (const ally of base.board) { const s=clone(base); s.links.push(ally.serial); draw(s,true); record(s,name,`Link ${ally.name}`); add(s); }
          } else if (name === 'Reclaim') {
            for (let i=0;i<base.board.length;i++) { const s=clone(base); const returned=s.board[i]; bounce(s,i); record(s,name,`Reclaim ${returned.name}`); add(s); }
          } else if (name === 'Harness Lightning') {
            base.arcane++;
            const aria=clone(base); empower(aria,4); record(aria,name,'Harness · 4 aria'); add(aria);
            for (let i=0;i<base.board.length;i++) if (!base.board[i].attacked) { const s=clone(base); s.board[i].buff+=4; record(s,name,`Harness · buff ${s.board[i].name}`); add(s); }
          } else {
            if (name === 'Battlefield Benediction') empower(base,2); // No opponent-board threshold inferred.
            if (name === 'Final Refrain') { base.refrain=true; empower(base,3); }
            if (name === HYMN || name === "Casella's Poise") base.pending=true;
            if (name === 'ChannelTech Charm S') { base.charm++; draw(base,true); }
            if (name === 'Fairy Whispers') {
              const top=base.library.splice(0,3), hit=top.findIndex(n=>cards.get(n)?.elements.includes('WIND'));
              if(hit>=0) {base.hand.push(top.splice(hit,1)[0]);base.library.push(...top);}
              else {base.library.push(...top);if(cards.get(base.library[0])?.elements.includes('WIND')) draw(base,false);}
            }
            if (name === 'Turbo Charge') { base.powercell=false; draw(base,false); draw(base,false); }
            record(base,name,`Resolve ${name}`); add(base);
          }
        }
      }
    }
    const distinct = new Map<string,State>();
    for (const s of next.sort((a,b)=>score(b)-score(a))) {
      const key=JSON.stringify([s.hand.slice().sort(),s.memory,s.board,s.aria,s.arcane,s.faceup,s.pending,s.refrain,s.lineage,s.discount,s.material,s.backup,s.powercell,s.charm,s.links,s.returned,s.library,s.rng]);
      if (!distinct.has(key)) distinct.set(key,s);
      if (distinct.size >= width) break;
    }
    beam=[...distinct.values()];
  }
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
