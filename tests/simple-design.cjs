'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');

test('all reader-facing pages load the new minimal stylesheet after their existing styles',()=>{
 for(const p of ['index.html','manga.html','my-library.html','reader.html','stats.html','feedback.html']){
   const html=read(p);
   assert.match(html,/simple-comix\.css\?v=clean-(?:1|2)/);
   const head=html.split('</head>')[0];
   const simple=head.indexOf('simple-comix.css');
   assert.ok(simple>=0,p+' missing stylesheet');
   assert.ok(simple>head.indexOf('style.css'),p+' override precedence');
 }
});
test('home keeps original working selectors but puts catalog first',()=>{
 const html=read('index.html');
 for(const id of ['grid','chips','q','sort','library','latest','latestUpdates',
      'recommendations','newChapterAlerts','favModal','histModal','resume',
      'myLibrary','libraryCount','randomManga','minChapters','minRating'].filter(x=>x!=='myLibrary')){
   assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 const start=html.indexOf('<div class="browse-layout">');
 const beforeUpdates=html.indexOf('<section class="library" id="library"',start);
 const updates=html.indexOf('<aside class="home-feature-section" id="latest"',beforeUpdates);
 assert.ok(start>0&&beforeUpdates>start&&updates>beforeUpdates,'catalog-first structure');
 assert.ok(html.indexOf('</aside>',updates)<html.indexOf('</div>',html.indexOf('</aside>',updates)+8));
});
test('each catalog card retains Favorites, list status and sharing controls',()=>{
 const html=read('index.html');
 for(const marker of ['class="card-manage"','<summary>＋ Миний сан</summary>',
   'data-fav','data-library','data-share','card-next','manga.html?m=']){
   assert.ok(html.includes(marker),marker);
 }
 assert.match(html,/onerror="this\.remove\(\)"/);
 assert.match(read('simple-comix.css'),/\.cover:has\(img\) \.cover-name\{display:none\}/);
});
test('latest updates use real images with safe DOM APIs and chapter links',()=>{
 const js=read('features-home.js');
 assert.match(js,/home-update-cover/);
 assert.match(js,/document\.createElement\('img'\)/);
 assert.match(js,/img\.onerror=\(\)=>img\.remove\(\)/);
 assert.match(js,/reader\.html\?m=/);
 assert.doesNotMatch(js,/latest\.innerHTML\s*=/);
});
test('compact design covers desktop, mobile and keyboard focus',()=>{
 const css=read('simple-comix.css');
 for(const value of ['.browse-layout','grid-template-columns:minmax(0,1fr) 275px',
   '@media(max-width:850px)','@media(max-width:620px)',
   '@media(max-width:380px)','focus-visible','prefers-reduced-motion',
   '.primary-nav','.home-update-link','.card-manage']){
   assert.ok(css.includes(value),value);
 }
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('new service-worker version includes new CSS without any DB migration',()=>{
 const sw=read('sw.js');
 assert.match(sw,/red-ribbon-v18/);
 assert.match(sw,/'\.\/simple-comix\.css'/);
 assert.doesNotMatch(sw,/supabase\.sql/);
});


test('mobile notification remains legible and theme setting persists across pages',()=>{
 const css=read('simple-comix.css');
 const mobile=css.match(/@media\(max-width:620px\)[\s\S]*?\.rr-alert-button\{([^}]*)\}/);
 assert.ok(mobile,'mobile notifications style missing');
 assert.doesNotMatch(mobile[1],/font-size:0(?:;|px)/);
 assert.match(mobile[1],/text-overflow:ellipsis/);
 for(const path of ['manga.html','my-library.html','stats.html','feedback.html']){
   const page=read(path);
   assert.match(page,/const savedTheme=localStorage\.getItem\('theme'\)/,path);
 }
});


test('homepage has no redundant featured manga card but retains useful hero actions and stats',()=>{
 const html=read('index.html'),css=read('simple-comix.css');
 for(const legacy of ['id="heroFeature"','id="featureLink"','ОНЦЛОХ МАНГА',
   'featureTitle','featureImg','renderFeature()']){
   assert.ok(!html.includes(legacy),'unexpected featured card: '+legacy);
 }
 for(const essential of ['id="mangaCount"','id="chapterCount"','id="resume"','id="heroTitle"',
  'href="#library"','function renderHeroStats()']){
   assert.ok(html.includes(essential),'lost hero function: '+essential);
 }
 assert.match(css,/\.hero\{\s*display:block/);
 assert.doesNotMatch(css,/\.hero:has\(#heroFeature\[hidden\]\)/);
});


test('homepage requests refreshed clean styling after removing featured card',()=>{
 assert.match(read('index.html'),/simple-comix\.css\?v=clean-2/);
});


test('dark and light themes use accessible purple accent without changing logo',()=>{
 const css=read('simple-comix.css');
 assert.match(css,/--red:#b89bff/);
 assert.match(css,/--red:#6b3ab8/);
 assert.match(css,/\.card \.mark\{background:#7445cc/);
 assert.match(css,/\.hero-cta,\.chips \.btn\[aria-pressed=true\]/);
 assert.match(read('index.html'),/red-ribbon-logo\.webp/);
});
