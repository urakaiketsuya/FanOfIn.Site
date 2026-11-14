import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckModelValue, forecastClip, forecastDeck, matchupValue, type DeckForecastModel } from '../../../shared/src/deckForecast.js';
import { fitComposition, type CompositionMatch } from './cardCompositionValidation.js';
import { seasonalPredictions } from './cardSeasonalValidation.js';
const a={identity:'a',champion:'A',cards:[['X',4] as [string,number]]}, b={identity:'b',champion:'B',cards:[['Y',4] as [string,number]]};
const rows:CompositionMatch[]=Array.from({length:30},(_,i)=>({id:String(i),event:String(i),date:'2026-01-01',format:'standard',prior:.5,score:i%3?1:0,a,b}));
test('JSON export reproduces research base predictions and preserves quantity sensitivity',()=>{
 const fit=fitComposition(rows,{minimumPairMatches:1,minimumPairEvents:1,maximumPairs:0,penalty:100,passes:2000});
 const c=JSON.parse(JSON.stringify(fit.cardCoefficients));
 for(const r of [...rows,{...rows[0],a:b,b:a,prior:.8},{...rows[0],a:{...a,cards:[['X',1] as [string,number]]}}]) {
  const p=forecastClip(r.prior+deckModelValue(r.a,c)-deckModelValue(r.b,c)+matchupValue(r.a.champion,r.b.champion,c));
  assert.ok(Math.abs(p-fit.models.cards(r))<1e-12);
 }
});
const model:DeckForecastModel={generatedAt:'2026-01-03',schemaVersion:1,asOf:'2026-01-03',expires:'2026-01-17',season:'Season',period:'p',coefficients:{'champ:standard:A':0,'champ:standard:B':0,'card:X':.1,'card:Y':0},residuals:{},priorMass:100,scale:1,field:[{champion:'A',card:'A',value:.1,weight:1},{champion:'B',card:'B',value:0,weight:3}],coverage:{entrants:4,modeledEntrants:4,events:1,from:'2026-01-01',through:'2026-01-03'},provenance:{}};
test('field uses entry weights, equal skill, unknown-card coverage, and explicit unavailable states',()=>{
 const p=forecastDeck(a,model,'STANDARD','2026-01-04');assert.equal(p.status,'ready');if(p.status!=='ready')return;
 assert.ok(Math.abs(p.score-.575)<1e-12);assert.equal(p.matchups[0].share,.75);
 const unknown=forecastDeck({...a,cards:[...a.cards,['New',4]]},model,'STANDARD','2026-01-04');assert.equal(unknown.status,'ready');if(unknown.status==='ready'){assert.equal(unknown.cardCoverage,.5);assert.equal(unknown.score,p.score);}
 assert.equal(forecastDeck(a,model,'PANTHEON','2026-01-04').status,'unsupported-format');
 assert.equal(forecastDeck(a,model,'STANDARD','2026-01-18').status,'unavailable');
 assert.equal(forecastDeck(a,{...model,field:[]},'STANDARD','2026-01-04').status,'unavailable');
 assert.equal(forecastDeck({...a,champion:'Late'}, {...model,residuals:{[JSON.stringify(['standard','Late'])]:{n:20,sum:1}}},'STANDARD','2026-01-04').status,'ready');
 assert.equal(forecastDeck({...a,champion:'New'},model,'STANDARD','2026-01-04').status,'unsupported-champion');
 assert.equal(forecastDeck({...a,cards:[['X',-1]]},model,'STANDARD','2026-01-04').status,'incomplete');
});
test('snapshot includes only completed earlier events, preserving live seasonal corrections',()=>{
 assert.throws(()=>seasonalPredictions([{...rows[0],base:.5}],[],100,{asOf:'2026-01-01',capture:()=>{}}),/as-of/);
 let state={};
 const input=rows.slice(0,2).map((r,i)=>({...r,id:String(i),base:.5,eventContext:{season:null,completed:i?'2026-01-04':'2026-01-01'}}));
 seasonalPredictions(input,[],100,{asOf:'2026-01-03',capture:s=>state=structuredClone(s)});
 const probe={...rows[0],id:'probe',date:'2026-01-03',base:.5,eventContext:{season:null,completed:null}};
 const prediction=seasonalPredictions([...input,probe],[],100).get('probe')!;
 const exported=forecastDeck({...a,cards:[['X',4]]},{...model,coefficients:{'champ:standard:A':0,'champ:standard:B':0,'card:X':0},residuals:state,field:[{champion:'B',card:'B',value:0,weight:1}]},'STANDARD','2026-01-03');
 assert.equal(exported.status,'ready');if(exported.status==='ready')assert.equal(exported.score,prediction.global);
});
