'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const data=read('light-novel-data.js');
const ui=read('light-novel-ui.js');
const css=read('light-novel.css');
const catalog=read('light-novels.html');
const detail=read('light-novel-detail.html');
const reader=read('light-novel-reader.html');

test('new standalone scripts parse',()=>{
  assert.doesNotThrow(()=>new Function(data));
  assert.doesNotThrow(()=>new Function(ui));
});

test('novel pages resolve local assets and shared scripts',()=>{
  for(const html of [catalog,detail,reader]){
    assert.match(html,/light-novel\.css\?v=3/);
    assert.match(html,/light-novel-data\.js\?v=3/);
    assert.match(html,/light-novel-ui\.js\?v=3/);
  }
  assert.ok(fs.existsSync(path.join(__dirname,'../assets/ln-sample-cover.svg')));
  assert.ok(fs.existsSync(path.join(__dirname,'../assets/ln-sample-illustration.svg')));
});

test('reader control IDs match script access',()=>{
  for(const id of ['readingProgress','readerTop','readingBody','readerChapterTitle','readerHeaderTitle',
    'readerHeaderSubtitle','readerPosition','readerBack','chapterModal','chapterLinks','imageModal','expandedIllustration',
    'closeImageModal','closeChapterModal','readerSettings','settingsToggle','fontSize','fontSizeValue',
    'lineSpacing','lineSpacingValue','fontFamily','resetSettings','progressPercent']){
    assert.ok(reader.includes('id="'+id+'"'),'Missing reader ID '+id);
  }
  assert.match(ui,/className:"ln-illustration"/);
  assert.match(ui,/requestAnimationFrame/);
  assert.match(ui,/showModal\(\)/);
  assert.match(ui,/localStorage/);
});

test('detail tabs and metadata IDs remain wired',()=>{
  for(const id of ['novelTitle','novelSubtitle','novelAuthor','novelIllustrator','novelVolumes',
    'novelStatus','novelRating','novelSynopsis','novelCover','novelHeroBackground','novelGenres',
    'bookmarkNovel','startReading','volumeList','characterGrid','detailBack']){
    assert.ok(detail.includes('id="'+id+'"'),'Missing detail ID '+id);
  }
  for(const id of ['synopsis','chapters','characters','reviews']){
    assert.ok(detail.includes('id="tab-'+id+'"'));
    assert.ok(detail.includes('id="panel-'+id+'"'));
  }
});

test('content model contains only labeled preview chapters and safe image placeholders',()=>{
  const ctx={window:{}};
  vm.runInNewContext(data,ctx);
  const list=ctx.window.RR_LIGHT_NOVELS;
  assert.ok(Array.isArray(list));
  assert.equal(list.length,1);
  const novel=list[0];
  assert.equal(novel.originalVolumes,26);
  assert.equal(novel.volumes[0].complete,false);
  assert.equal(novel.volumes[0].chapters.length,2);
  const blocks=novel.volumes[0].chapters.flatMap(c=>c.blocks);
  assert.ok(blocks.some(b=>b.type==='illustration'));
  assert.ok(blocks.every(b=>b.type==='illustration'||typeof b.text==='string'));
  assert.match(detail,/бүтэн боть биш/i);
  assert.match(reader,/Бүрэн боть биш/);
});

test('theme tokens and accessibility structure remain available',()=>{
  for(const t of ['light','dark','sepia','oled']){
    assert.ok(css.includes('data-reader-theme="'+t+'"')||t==='dark',t);
    assert.ok(reader.includes('data-theme="'+t+'"'));
  }
  assert.match(css,/prefers-reduced-motion/);
  assert.match(reader,/role="progressbar"/);
  assert.match(detail,/role="tablist"/);
  assert.match(catalog,/id="novelCatalogGrid"/);
  assert.match(catalog,/id="novelSearch"/);
  assert.match(catalog,/id="novelGenre"/);
  assert.match(reader,/aria-expanded="false"/);
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
});


test('catalog is collection-backed, and selection carries novel identity to the reader',()=>{
  assert.match(data,/window\.RR_LIGHT_NOVELS\s*=\s*\[/);
  assert.match(ui,/novels\.filter/);
  assert.match(ui,/selectedId/);
  assert.match(ui,/encodeURIComponent\(novel\.id\)/);
  assert.match(ui,/light-novel-detail\.html\?novel=/);
  assert.match(ui,/light-novel-reader\.html\?novel=/);
  assert.match(detail,/data-page="detail"/);
  assert.match(catalog,/data-page="catalog"/);
  assert.match(reader,/data-page="reader"/);
});
