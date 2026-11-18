import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.argv[2];if(!root) throw Error('Supply TCGEngine checkout');
const scenarios=[];
for(const file of ['cards-r','cards-b','exalted','new-card-authoring','wind-items','cards-a','cards-t','wind-actions','wind-allies5']) {
 const path=`DevTools/ga-fixtures/${file}.php`,text=readFileSync(`${root}/${path}`,'utf8');
 for(const match of text.matchAll(/gaScenario\('([^']+)'\)[\s\S]*?->register\(\);/g)) if(/^(reclaim-return-ally|battlefield-benediction-empower4|aella-zephyrs-hand|harness-lightning-|stormblade-squire-|stridetech-w-|aesan-protector-return-ally|turbo-charge-no-powercell|fairy-whispers-|windmill-engineer-)/.test(match[1])) scenarios.push({id:match[1],path,fileSha256:createHash('sha256').update(text).digest('hex'),excerpt:match[0]});
}
const integration=[];
for(const id of ['dungeon-guide-enter-banish-memory-levelup','return-stroke-floating-memory']) {
 for(const file of ['actions.json','assertions.json']) {
  const path=`Tests/Integration/GrandArchiveSim/${id}/${file}`,excerpt=readFileSync(`${root}/${path}`,'utf8');
  integration.push({id,path,fileSha256:createHash('sha256').update(excerpt).digest('hex'),excerpt});
 }
}
// Pin short engine excerpts separately from existing executable scenarios.
const timing=[];
for(const [path,start,end] of [
 ['GrandArchiveSim/Custom/MaterializeLogic.php','function MaterializePhase(', '    // Orchestrated Seizure'],
 ['GrandArchiveSim/Custom/GameLogic.php','function RecollectionPhase()', '    // Recollection phase'],
 ['GrandArchiveSim/Custom/GameLogic.php','function DrawPhase()', '    // Resolute Stand'],
 ['GrandArchiveSim/Custom/GameLogic.php','        MZMove($turnPlayer, "myMemory-" . $i, "myHand");', 'function DrawPhase()'],
 ['DevTools/ga-fixtures/Scenario.php',"    // Player 1's first turn cannot attack",'    // Declare an attack'],
]) {
 const text=readFileSync(`${root}/${path}`,'utf8'),from=text.indexOf(start),to=text.indexOf(end,from);
 if(from<0||to<from) throw Error(`Missing timing anchors: ${path}`);
 timing.push({path,fileSha256:createHash('sha256').update(text).digest('hex'),excerpt:text.slice(from,to)});
}
writeFileSync('app/test/fixtures/tcgengine-casella-contracts.json',JSON.stringify({revision:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),note:'Existing upstream scenarios imported verbatim. Casella Song/aria behavior is separately catalog-derived; this is not an engine replay.',scenarios,integration,timing},null,2)+'\n');
