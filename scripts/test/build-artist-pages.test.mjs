import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderArtistPage, buildArtistPages } from '../build-artist-pages.mjs';
import sharp from 'sharp';
import { artistSocialImagePath } from '../../shared/src/artistSeo.ts';
import { canonicalSiteUrl } from '../../shared/src/seo.ts';
import { artistDirectory } from '../../shared/src/artistDirectory.ts';
const shell = await readFile(new URL('../../app/index.html',import.meta.url),'utf8');
const artist={id:'test',slug:'test',name:'<Name> & "Artist"',kind:'individual',credits:['<Name> & "Artist"'],links:[{platform:'X',label:'@test',url:'https://x.com/test'}]};
const gallery={...artist,cards:[{card:{slug:'test-card',name:'</script><script>bad</script>'},editions:[{uuid:'edition',image:'/cards/images/edition.jpg',set:{name:'Test set'},collector_number:'001'}]}],printingCount:1};
const graph = html => JSON.parse(html.match(/type="application\/ld\+json">(.*?)<\/script>/)[1])['@graph'];

test('directory initial HTML has artwork and crawlable artist links with matching metadata',()=>{
 const html=renderArtistPage(shell,undefined,undefined,[gallery]);
 assert.match(html,/<h1>Grand Archive artists<\/h1>/);
 assert.match(html,/href="\/artists\/test\/"/);
 assert.match(html,/api.gatcg.com\/cards\/images\/edition.jpg/);
 assert.match(html,/Grand Archive Artist Directory/);
 assert.equal(graph(html)[0]['@type'],'CollectionPage');
 assert.equal(graph(html)[0].image,`https://fanofin.site${artistSocialImagePath(undefined,undefined,[gallery])}`);
 assert.match(html,/og:image:width" content="1200/);
 assert.match(html,/og:image:height" content="630/);
 assert.equal(graph(html)[0].mainEntity.itemListElement[0].url,'https://fanofin.site/artists/test/');
 assert.equal((html.match(/rel="canonical"/g)??[]).length,1);
 assert.ok(html.includes('<div id="root"><style>'));
});

test('artist entity types, safe serialization and unique social metadata agree',()=>{
 const html=renderArtistPage(shell,artist,gallery);
 assert.match(html,/&lt;Name&gt; &amp; &quot;Artist&quot;/);
 assert.equal(graph(html)[0].about['@type'],'Person');
 assert.deepEqual(graph(html)[0].about.sameAs,['https://x.com/test']);
 assert.equal(graph(html)[0].mainEntity.itemListElement[0].name,gallery.cards[0].card.name);
 assert.ok(!html.includes('</script><script>bad'));
 assert.equal(graph(renderArtistPage(shell,{...artist,kind:'studio'},gallery))[0].about['@type'],'Organization');
 assert.equal(graph(renderArtistPage(shell,{...artist,kind:'unknown'},gallery))[0].about,undefined);
 assert.ok(!html.includes('ProfilePage'));
 for(const variant of ['/artists','/artists/','/artists/?q=x']) assert.equal(canonicalSiteUrl(variant),'https://fanofin.site/artists/');
});

test('build emits every profile, alias redirect and canonical-only sitemap; repeated builds remain stable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'artist-seo-'));
 try {
  const dataDir=path.join(dir,'data'),outDir=path.join(dir,'dist');
  await mkdir(dataDir);await mkdir(outDir);
  await writeFile(path.join(dataDir,'card-catalog.json'),JSON.stringify({cards:[]}));
  await writeFile(path.join(outDir,'index.html'),shell);
  await writeFile(path.join(outDir,'sitemap.xml'),'<urlset><url><loc>https://fanofin.site/artists/old</loc></url><url><loc>https://fanofin.site/decks/abc/</loc></url></urlset>');
  await buildArtistPages({dataDir,outDir});
  for(const artist of artistDirectory){
   await access(path.join(outDir,'artists',artist.slug,'index.html'));
   const social=await sharp(path.join(outDir,artistSocialImagePath(artist))).metadata();
   assert.equal(social.width,1200);assert.equal(social.height,630);assert.equal(social.format,'jpeg');
   for(const alias of artist.slugAliases??[]){
    const html=await readFile(path.join(outDir,'artists',alias,'index.html'),'utf8');
    assert.ok(html.includes(`https://fanofin.site/artists/${encodeURIComponent(artist.slug)}/`));
    assert.match(html,/http-equiv="refresh"/);
   }
  }
  const sitemap=await readFile(path.join(outDir,'sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<loc>https:\/\/fanofin.site\/artists/g)??[]).length,artistDirectory.length+1);
  assert.doesNotMatch(sitemap,/artists\/old/);assert.match(sitemap,/decks\/abc/);
  await buildArtistPages({dataDir,outDir});
  assert.equal(await readFile(path.join(outDir,'sitemap.xml'),'utf8'),sitemap);
  await assert.rejects(access(path.join(outDir,'artists','unknown','index.html')));
  assert.equal(await readFile(path.join(outDir,'index.html'),'utf8'),shell);
 }finally{await rm(dir,{recursive:true,force:true});}
});
