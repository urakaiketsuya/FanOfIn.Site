import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { artistSocialManifest } from '../artist-social-manifest.mjs';
import { readFile } from 'node:fs/promises';
import { buildArtistGalleries } from '../../shared/src/artists.ts';
import { renderArtistSocialImage } from '../build-artist-social-images.mjs';
import { artistSocialImagePath, artistSocialEditions } from '../../shared/src/artistSeo.ts';

const edition = { uuid:'one', image:'/cards/images/one.jpg' };
const artist = { id:'test',name:'DragonArt 艾瞳 A-Ton',slug:'test',kind:'individual',credits:['test'],links:[] };
const gallery = { ...artist,cards:[{card:{name:'Card'},editions:[edition]}],printingCount:1 };

test('missing artwork and portraits produce a full-size JPEG without network access', async()=>{
 const image = await renderArtistSocialImage({artist:{...artist,portrait:{src:'/images/artists/missing.png'}},gallery,assetDir:'/does-not-exist',publicDir:'/does-not-exist'});
 const metadata = await sharp(image).metadata();
 assert.deepEqual([metadata.width,metadata.height,metadata.format],[1200,630,'jpeg']);
 assert.ok(image.length>10000);
});

test('long and non-Latin names, empty directory and unknown artists render within the image',async()=>{
 for (const name of ['南佑希','砂木烟','An unusually long artist name with many words and & characters']) {
  const image=await renderArtistSocialImage({artist:{...artist,name},assetDir:'/does-not-exist'});
  const meta=await sharp(image).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);
 }
 const image=await renderArtistSocialImage();assert.equal((await sharp(image).metadata()).width,1200);
});

test('preview cache keys change with visible content; credited edition selection stays exact',()=>{
 assert.equal(artistSocialImagePath(artist,gallery),artistSocialImagePath(artist,gallery));
 assert.notEqual(artistSocialImagePath(artist,gallery),artistSocialImagePath({...artist,name:'Another'},gallery));
 assert.notEqual(artistSocialImagePath(artist,gallery),artistSocialImagePath({...artist,links:[{url:'https://example.com'}]},gallery));
 assert.notEqual(artistSocialImagePath(artist,gallery),artistSocialImagePath(artist,{...gallery,cards:[]}));
 assert.notEqual(artistSocialImagePath(undefined,undefined,[gallery]),artistSocialImagePath(undefined,undefined,[]));
 assert.deepEqual(artistSocialEditions({...gallery,id:'a004'}),[edition]);
 assert.deepEqual(artistSocialEditions({...gallery,cards:[{...gallery.cards[0],editions:[{uuid:'../escape',image:'https://example.com/card.jpg'}]}]}),[]);
});


test('browser manifest uses the build catalog rather than older cached browser counts', async()=>{
 const catalog=JSON.parse(await readFile(new URL('../../data/card-catalog.json',import.meta.url),'utf8'));
 const galleries=buildArtistGalleries(catalog.cards);
 const manifest=artistSocialManifest();
 assert.equal(manifest.directory,artistSocialImagePath(undefined,undefined,galleries));
 const studio=galleries.find(artist=>artist.id==='a004');
 assert.equal(manifest.a004,artistSocialImagePath(studio,studio,galleries));
 assert.notEqual(manifest.a004,artistSocialImagePath(studio,{...studio,cards:studio.cards.slice(0,1)},galleries));
});
