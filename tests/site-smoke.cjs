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
    'catalog.js','discover.js','features.js','features-home.js','manga-detail.js','feedback.js','admin-workflow.js','sw.js'
  ]) assert.doesNotThrow(() => new Function(read(file)), file);
  for (const file of ['index.html','reader.html','admin.html','my-library.html','manga.html','feedback.html'])
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
  assert.match(list.innerHTML, /Дуртай манганы жагсаалт хоосон/);
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
  assert.match(read('sw.js'),/red-ribbon-v20/);
});


test('homepage HTML has real Mongolian characters, not literal Unicode escape codes', () => {
  const html=read('index.html');
  const beforeScript=html.replace(/<script[\s\S]*?<\/script>/g,'');
  assert.doesNotMatch(beforeScript,/\\u[0-9a-f]{4}/i);
  assert.match(beforeScript, /Уншсан түүх/);
  assert.match(beforeScript, /Тусламж/);
  assert.match(beforeScript, /Дуртай манга/);
  assert.match(beforeScript, /Шинэ бүлгүүд/);
  assert.match(beforeScript, /Бүлгийн тоо/);
  assert.doesNotMatch(html,/Бэлэг|Үргэлжлэлэх|туух|Двойн товш/);
});

test('cloud Favorites message accurately describes account syncing', () => {
  const profile=read('profile.js');
  assert.doesNotMatch(profile,/Дуртай манга зөвхөн энэ төхөөрөмж дээр/);
  assert.match(profile,/isFavoritesReady/);
  assert.match(read('my-library.html'),/♥ Дуртай манга/);
});

test('reader chapter selection safely uses DOM text rather than HTML interpolation', () => {
  const src=inline('reader.html');
  assert.match(src,/option\.textContent='Бүлэг '/);
  assert.doesNotMatch(src,/innerHTML=m\.chapters\.map/);
  const from=src.indexOf('function pagesOf(c){');
  const to=src.indexOf('\nfunction show(){',from);
  assert.ok(from>=0&&to>from);
  assert.match(src.slice(from,to),/return \[\];/);
  assert.doesNotMatch(src.slice(from,to),/Array\.from\(\{length:5\}/);
});

test('My Library avoids links to chapters removed by admin', () => {
  const src=read('my-library.js');
  assert.match(src,/const validLast = Boolean\(last && manga\?\.chapters\?\.some/);
  assert.match(src,/const chapter = validLast \? last\.chapter : manga\?\.chapters\?\.\[0\]\?\.n/);
  assert.match(src,/a\.textContent=validLast \?/);
});

test('My Library exposes safe manual refresh for cross-device updates', () => {
  assert.match(read('my-library.html'),/id="myLibraryRefresh"/);
  assert.match(read('my-library.js'),/await Promise\.all\(\[window\.RRCatalog\.load\(\),store\.refresh\(\)\]\)/);
  assert.match(read('my-library-store.js'),/function refresh\(\)/);
  assert.match(read('my-library-store.js'),/ticket!==generation \|\| targetId!==userId/);
  assert.match(read('sw.js'),/red-ribbon-v20/);
});


test('discovery starts at first unread chapter and supports completed books', () => {
  const browser={};
  new Function('window',read('discover.js'))(browser);
  const {nextChapter}=browser.RRDiscover;
  const manga={id:'a',chapters:[{n:1},{n:2},{n:3}]};
  const fresh=nextChapter(manga,[]);
  assert.equal(fresh.chapter,1);
  assert.equal(fresh.label,'Эхлүүлэх');
  const partial=nextChapter(manga,[{m:'a',c:1}]);
  assert.equal(partial.chapter,2);
  assert.equal(partial.remaining,2);
  const done=nextChapter(manga,[{m:'a',c:1},{m:'a',c:2},{m:'a',c:3}]);
  assert.equal(done.chapter,3);
  assert.equal(done.label,'Дахин унших');
  assert.equal(nextChapter({id:'empty',chapters:[]},[]),null);
});

test('random manga avoids immediate repetition when possible', () => {
  const browser={};
  new Function('window',read('discover.js'))(browser);
  const {randomManga}=browser.RRDiscover;
  const a={id:'a',chapters:[{n:1}]}, b={id:'b',chapters:[{n:1}]};
  assert.equal(randomManga([a,b],'a',()=>0).id,'b');
  assert.equal(randomManga([],null,()=>0),null);
  assert.equal(randomManga([a],'a',()=>0).id,'a');
});

test('sharing encodes manga IDs and includes no user-specific data', () => {
  const browser={};
  new Function('window',read('discover.js'))(browser);
  const {shareUrl}=browser.RRDiscover;
  const u=new URL(shareUrl({id:'a&b',chapters:[{n:1}]},
    'https://red-ribbon-scans.vercel.app/index.html'));
  assert.equal(u.searchParams.get('m'),'a&b');
  assert.equal(u.searchParams.get('c'),'1');
  assert.equal(u.pathname,'/reader.html');
  assert.equal(u.searchParams.size,2);
});

test('homepage renders quick actions and random button', () => {
  const html=read('index.html');
  assert.match(html,/id="randomManga"/);
  assert.match(html,/data-share/);
  assert.match(html,/card-quick-actions/);
  assert.match(html,/discover.js\?v=discover-1/);
  assert.match(read('sw.js'),/red-ribbon-v20/);
});


test('all eight feature entry points and required SQL are wired',()=>{
 const home=read('index.html');
 for(const key of ['latestUpdates','recommendations','minChapters','minRating','manga.html','feedback.html','rr-catalog-loaded'])
   assert.match(home,new RegExp(key));
 const admin=read('admin.html');
 for(const key of ['workflowPanel','adminTickets','adminWorkflow','mangaDescription','admin-workflow.js'])
   assert.match(admin,new RegExp(key));
 const reader=read('reader.html');
 for(const key of ['readerSettings','readerImageStatus','readerReport','attachImageStatus','features.css'])
   assert.match(reader,new RegExp(key));
 const catalog=read('catalog.js');
 assert.match(catalog,/description:typeof m\.description/);
 const sql=read('community_3.sql');
 for(const key of ["enable row level security","submissions create own new","submissions admin updates","workflow admin read","alter table public.catalog_manga add column"])
   assert.ok(sql.includes(key),'missing SQL: '+key);
 for(const file of ['manga.html','feedback.html','manga-detail.js','feedback.js','features-home.js','admin-workflow.js'])
   assert.match(read('sw.js'),new RegExp(file.replace('.','\\.')));
});

test('latest updates and filtering handle actual chapter dates and rating thresholds',()=>{
 const browser={};
 new Function('window',read('features.js'))(browser);
 const a={id:'a',title:'Alpha',genres:['Action'],chapters:[{n:1,date:'2026-01-01'},{n:2,date:'2026-02-02'}]};
 const b={id:'b',title:'Beta',genres:['Drama'],chapters:[{n:1,date:'2026-03-03'}]};
 const result=browser.RRFeatures.updates([a,b],3);
 assert.equal(result[0].manga_id,'b');
 assert.equal(result[1].chapter,2);
 assert.equal(browser.RRFeatures.filterManga([a,b],{q:'alpha',minChapters:2}).length,1);
 assert.equal(browser.RRFeatures.filterManga([a,b],{minChapters:2,minRating:4,ratings:{a:4.5}})[0].id,'a');
 assert.equal(browser.RRFeatures.filterManga([a,b],{minRating:4,ratings:{}}).length,0);
});

test('recommendations favor same genres, excluding seen and favorites',()=>{
 const browser={};
 new Function('window',read('features.js'))(browser);
 const list=[
  {id:'read',title:'Read',genres:['Fantasy'],chapters:[{n:1}]},
  {id:'fav',title:'Favorite',genres:['Romance'],chapters:[{n:1}]},
  {id:'good',title:'Good',genres:['Romance'],chapters:[{n:1}]},
  {id:'other',title:'Other',genres:['Horror'],chapters:[{n:1}]}
 ];
 const recs=browser.RRFeatures.recommendations(list,[{m:'read',c:1}],['fav'],5);
 assert.equal(recs.length,2);
 assert.equal(recs[0].id,'good');
 assert.equal(recs.some(r=>r.id==='fav'||r.id==='read'),false);
});

test('feedback is authenticated, admin workflow checks permissions',()=>{
 const feedback=read('feedback.js'),workflow=read('admin-workflow.js'),sql=read('community_3.sql');
 assert.match(feedback,/sb\.auth\.getUser/);
 assert.match(feedback,/reader_submissions/);
 assert.match(feedback,/user_id:uid/);
 assert.match(workflow,/sb\.rpc\('is_admin'\)/);
 assert.match(workflow,/manga_workflow/);
 assert.match(sql,/admin_note=''[\s\S]*\)/);
 assert.match(sql,/for update to authenticated using \(\(select public\.is_admin\(\)\)\)/);
});

test('reader reports include manga, chapter, page and width persists locally',()=>{
 const reader=read('reader.html');
 assert.match(reader,/encodeURIComponent\(m\.id\)/);
 assert.match(reader,/encodeURIComponent\(ch\.n\)/);
 assert.match(reader,/encodeURIComponent\(p\+1\)/);
 assert.match(reader,/rr_reader_fit/);
 assert.match(reader,/readerSettingsBtn/);
});
