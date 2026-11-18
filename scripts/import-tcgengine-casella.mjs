import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.argv[2];if(!root) throw Error('Supply TCGEngine checkout');
const scenarios=[];
for(const file of ['cards-r','cards-b','exalted','new-card-authoring','wind-items','cards-a','cards-t','wind-actions','wind-allies5']) {
 const path=`DevTools/ga-fixtures/${file}.php`,text=readFileSync(`${root}/${path}`,'utf8');
 for(const match of text.matchAll(/gaScenario\('([^']+)'\)[\s\S]*?->register\(\);/g)) if(/^(reclaim-return-ally|battlefield-benediction-empower4|aella-zephyrs-hand|harness-lightning-|stormblade-squire-|stridetech-w-|aesan-protector-return-ally|turbo-charge-no-powercell|fairy-whispers-|windmill-engineer-)/.test(match[1])) scenarios.push({id:match[1],path,fileSha256:createHash('sha256').update(text).digest('hex'),excerpt:match[0]});
}
writeFileSync('app/test/fixtures/tcgengine-casella-contracts.json',JSON.stringify({revision:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),note:'Existing upstream scenarios imported verbatim. Casella Song/aria behavior is separately catalog-derived; this is not an engine replay.',scenarios},null,2)+'\n');
