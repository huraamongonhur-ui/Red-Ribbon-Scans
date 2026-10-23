'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('LN admin public scripts are parseable and wired to the Studio page',()=>{
 for(const file of ['light-novel-admin.js','light-novel-admin-extra.js','light-novel-quality.js',
                    'light-novel-public.js','light-novel-ui.js']){
  assert.doesNotThrow(()=>new Function(read(file)),file);
 }
 const page=read('light-novel-admin.html');
 for(const file of ['light-novel-admin.js','light-novel-admin-extra.js','light-novel-quality.js']){
  assert.ok(page.includes(file),file);
 }
 assert.ok(read('admin.html').includes('href="light-novel-admin.html"'));
});
test('migration includes RLS on all draft/editorial and reader tables',()=>{
 const sql=read('light_novel_admin.sql');
 const extra=read('light_novel_admin_extra.sql');
 for(const table of ['ln_novels','ln_chapters','ln_reviewers','ln_glossary','ln_review_notes',
                     'ln_chapter_versions','ln_subscriptions','ln_read_events']){
  assert.match(sql,new RegExp('alter table public\\\\.'+table+' enable row level security'));
 }
 assert.match(sql,/publication_status='published'/);
 assert.match(sql,/status='scheduled' and release_at<=now\(\)/);
 assert.match(sql,/create policy "ln chapter public read"/);
 assert.match(sql,/public\.is_ln_reviewer/);
 assert.match(sql,/create trigger ln_revision/);
 assert.match(extra,/ln_reorder_chapters/);
 assert.match(extra,/public\.is_admin\(\)/);
 assert.ok(!sql.includes('service_role'));
});
test('quality checker detects duplicate paragraphs and glossary mismatches without HTML insertion',()=>{
 const context={window:{}};
 vm.runInNewContext(read('light-novel-quality.js'),context);
 const q=context.window.RRNovelQuality;
 const text='Өнгөрсөн амьдралдаа харамсаж суусан.\n\nӨнгөрсөн амьдралдаа харамсаж суусан.\n\nMana was everywhere.';
 const results=q.analyze(text,[{source_term:'Mana',translated_term:'Мана'}]);
 assert.ok(results.some(v=>v.kind==='duplicate'));
 assert.ok(results.some(v=>v.kind==='glossary'));
 assert.equal(q.blocksFromText('Эхний мөр.\n\nХоёр дахь мөр.').length,2);
 const blocks=q.blocksFromText('Зураг.\n\n[[image:https://example.com/a.webp|Тайлбар]]');
 assert.equal(blocks[1].type,'illustration');
 assert.equal(q.textFromBlocks(blocks).includes('https://example.com/a.webp'),true);
});
test('safe public bootstrap explicitly excludes draft chapters',()=>{
 const js=read('light-novel-public.js');
 assert.match(js,/eq\("publication_status","published"\)/);
 assert.match(js,/in\("status",\["scheduled","published"\]\)/);
 assert.match(js,/Date\.parse\(c\.release_at\)<=now/);
 assert.match(js,/window\.RR_LN_READY/);
 assert.match(read('light-novel-ui.js'),/await Promise\.resolve\(window\.RR_LN_READY\)/);
 for(const page of ['light-novels.html','light-novel-detail.html','light-novel-reader.html']){
  assert.match(read(page),/light-novel-public\.js\?v=1/);
 }
});
test('the eight requested admin capabilities expose actionable controls',()=>{
 const html=read('light-novel-admin.html');
 for(const id of ['laImportFile','laImport','laGlossaryForm','laCheckQuality','laReleaseAt',
                  'laChapterList','laSaveOrder','laAnalytics','laReviewerForm','laReviewNoteForm']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(read('light-novel-ui.js'),/ln_subscriptions/);
 assert.match(read('light-novel-ui.js'),/ln_read_events/);
 assert.match(read('light-novel-admin-extra.js'),/ln_glossary/);
 assert.match(read('light-novel-admin.js'),/storage\.from\("ln-public-art"\)/);
});
