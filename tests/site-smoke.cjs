'use strict';
// Run: node --test tests/site-smoke.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const inline = file => [...read(file).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).join('\n');

test('local scripts and page inline scripts parse', () => {
  for (const file of [
    'social.js','profile.js','admin.js','my-library.js','my-library-store.js',
    'catalog.js','sw.js'
  ]) assert.doesNotThrow(() => new Function(read(file)), file);
  for (const file of ['index.html','reader.html','admin.html','my-library.html'])
    assert.doesNotThrow(() => new Function(inline(file)), file);
});

test('Favorites popup handles empty, normal and deleted manga', () => {
  const main = inline('index.html');
  const from = main.indexOf('function renderFavs(){');
  const to = main.indexOf('\nfunction renderHist', from);
  assert.ok(from >= 0 && to > from);
  const renderSource = main.slice(from,to);
  const list = {innerHTML:''};
  const button = {dataset:{id:'old-manga'},disabled:false};
  let ids=[], available=[];
  const bindings = {
    $: () => list,
    $$: () => [button],
    visibleFavs: () => ids,
    data: available,
    esc: value => String(value),
    last: manga => manga.chapters.at(-1),
    getProgress: () => 0,
    hue: () => 100,
    href: () => '#',
    toggleFav: async () => {},
    toast: () => {}
  };
  const render = new Function(...Object.keys(bindings),renderSource+';return renderFavs;')
    (...Object.values(bindings));
  render();
  assert.match(list.innerHTML, /Хайртал хоосон/);
  assert.equal(typeof button.onclick, 'function');
  ids=['old-manga'];
  available.push({id:'old-manga',title:'Existing manga',chapters:[{n:1}]});
  render();
  assert.match(list.innerHTML,/Existing manga/);
  available.length=0;
  render();
  assert.match(list.innerHTML,/Каталогоос хасагдсан манга/);
  assert.match(list.innerHTML,/fav-remove/);
  assert.equal(typeof button.onclick,'function');
});

test('My Library count includes favorites without duplicates', () => {
  const src=read('my-library.js');
  const match=src.match(/const allMangaIds = ([^;]+);/);
  assert.ok(match, 'union count must exist');
  const getTotal=new Function('store','return ('+match[1]+').size;');
  const store={
    getEntries:()=>[{id:'one'},{id:'two'}],
    getFavoriteIds:()=>['two','three']
  };
  assert.equal(getTotal(store),3);
  assert.equal(getTotal({getEntries:()=>[],getFavoriteIds:()=>['heart']}),1);
});

test('Reader honors requested manga and chapter IDs', () => {
  const src=inline('reader.html');
  assert.match(src, /m=requestedId \? d\.find\(x=>x\.id===requestedId\) : d\[0\]/);
  assert.match(src, /idx=requestedChapter==null \? 0 : m\.chapters\.findIndex/);
  const source=[
    'let m;',
    "const requestedId=P.get('m');",
    'm=requestedId ? d.find(x=>x.id===requestedId) : d[0];',
    'if(!m)return {m:null,index:-1};',
    "const requestedChapter=P.get('c');",
    'const idx=requestedChapter==null ? 0 : m.chapters.findIndex(c=>String(c.n)===requestedChapter);',
    'return {m,index:idx};'
  ].join('\n');
  const select=new Function('P','d',source);
  const manga=[{id:'a',chapters:[{n:1},{n:2}]}];
  assert.equal(select({get:key=>key==='m'?'missing':'1'},manga).m,null);
  assert.equal(select({get:key=>key==='m'?'a':'99'},manga).index,-1);
  assert.equal(select({get:key=>key==='m'?'a':'2'},manga).index,1);
  assert.equal(select({get:()=>null},manga).m.id,'a');
});

test('Reader terminal failures end social loading retries', () => {
  assert.match(inline('reader.html'),/RR_READER_STATE='error'/);
  assert.match(read('social.js'),/RR_READER_STATE !== 'error'/);
  assert.match(read('sw.js'),/red-ribbon-v11/);
});
