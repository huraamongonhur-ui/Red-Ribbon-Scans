'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('new and changed JavaScript parse without a build dependency',()=>{
 for(const name of ['reader-extras.js','site-extras.js','stats.js','admin-bulk.js',
 'admin-activity.js','social.js','admin.js','admin-workflow.js','catalog.js','manga-detail.js','my-library.js']){
  assert.doesNotThrow(()=>new Function(read(name)),name);
 }
 for(const name of ['reader.html','index.html','admin.html','my-library.html','stats.html']){
  for(const m of read(name).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
   assert.doesNotThrow(()=>new Function(m[1]),name+' inline JS');
  }
 }
});

test('reader bookmarks and progress are tied to user/chapter',()=>{
 const sql=read('next_10.sql'),js=read('reader-extras.js');
 assert.match(sql,/primary key \(user_id,manga_id,chapter\)/);
 assert.match(sql,/using\(user_id=\(select auth\.uid\(\)\)\)/);
 assert.match(js,/onConflict:'user_id,manga_id,chapter'/);
 assert.match(js,/await ensureChapter\(\)/);
 assert.match(js,/token!==revision/);
});

test('reader page link and page errors offer retry instead of fake success',()=>{
 const reader=read('reader.html');
 assert.match(reader,/id="readerBookmark"/);
 assert.match(reader,/id="readerRetry"/);
 assert.match(reader,/id="readerSaveState"/);
 assert.match(reader,/new Event\('rr-reader-progress'\)/);
 assert.match(reader,/P\.get\('p'\)/);
 const js=read('reader-extras.js');
 assert.match(js,/broken\.forEach/);
 assert.match(js,/rr_retry/);
});

test('new chapter notifications are site-local, owner scoped and non-push',()=>{
 const home=read('index.html'),script=read('site-extras.js');
 assert.match(home,/id="newChapterAlerts"/);
 assert.match(home,/id="newChapterDialog"/);
 assert.match(script,/rr_alert_snapshot_/);
 assert.match(script,/if\(!Array\.isArray\(old\[id\]\)\)continue/);
 assert.doesNotMatch(script,/Notification\.requestPermission|PushManager|pushManager/);
});

test('reading stats use cloud progress for signed in and local history for guests',()=>{
 const html=read('stats.html'),js=read('stats.js');
 for(const id of ['statSeries','statChapters','statWeek','statBookmarks','statsRecent','statsMarks']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(js,/sb\.auth\.getUser/);
 assert.match(js,/eq\('user_id',user\.id\)/);
 assert.match(js,/rr_hist/);
 assert.match(js,/rr_guest_mark_/);
});

test('comment spoiler syntax is escaped and editable only by the owner',()=>{
 const code=read('social.js'),sql=read('next_10.sql');
 assert.match(code,/safeBody = text => esc\(text/);
 assert.match(code,/comment-spoiler/);
 assert.match(code,/c\.user_id === uid/);
 assert.match(code,/update\(\{body\}\)/);
 assert.match(code,/eq\('user_id',uid\)/);
 assert.match(sql,/Only comment body can be edited/);
 assert.match(sql,/comments: edit own/);
});

test('comment reports use the existing RLS moderation queue',()=>{
 const code=read('social.js'),sql=read('next_10.sql'),admin=read('admin-workflow.js');
 assert.match(code,/kind:'comment_report'/);
 assert.match(code,/data-report-comment/);
 assert.match(sql,/check\(kind in \('manga_request','page_report','comment_report'\)\)/);
 assert.match(admin,/ticket\.kind==='comment_report'/);
});

test('publication status has a check constraint and all three UI labels',()=>{
 const sql=read('next_10.sql'),cat=read('catalog.js'),admin=read('admin.html');
 assert.match(sql,/publication_status in \('ongoing','completed','hiatus'\)/);
 assert.match(cat,/publication_status:\['ongoing','completed','hiatus'\]/);
 for(const status of ['ongoing','completed','hiatus'])assert.ok(admin.includes('value="'+status+'"'));
 assert.match(read('admin.js'),/publication_status:\$\('#mangaPublicationStatus'\)\.value/);
 assert.match(read('manga-detail.js'),/og:title/);
});

test('SEO provides crawler-discoverable static pages and metadata',()=>{
 assert.match(read('robots.txt'),/Sitemap:/);
 assert.match(read('sitemap.xml'),/<urlset/);
 assert.match(read('manga.html'),/og:site_name/);
 assert.match(read('manga-detail.js'),/schema\.org/);
});

test('bulk ZIP importer enforces admin and archive/content limits',()=>{
 const js=read('admin-bulk.js'),html=read('admin.html');
 assert.match(js,/sb\.rpc\('is_admin'\)/);
 assert.match(js,/maxArchive=80\*1024\*1024/);
 assert.match(js,/uncompressedSize/);
 assert.match(js,/totalUncompressed>240\*1024\*1024/);
 assert.match(js,/maxFiles=320/);
 assert.match(js,/\.upload\(path,blob/);
 assert.match(js,/\.remove\(uploaded\)/);
 assert.match(html,/id="bulkZip"/);
});

test('activity log cannot be client-written and uses DB triggers',()=>{
 const sql=read('next_10.sql'),js=read('admin-activity.js');
 assert.match(sql,/revoke all on public\.admin_activity_log from anon, authenticated/);
 assert.match(sql,/grant select on public\.admin_activity_log to authenticated/);
 assert.match(sql,/create trigger audit_catalog_manga/);
 assert.match(sql,/create trigger audit_manga_workflow/);
 assert.match(sql,/security definer set search_path=public/);
 assert.match(js,/rpc\('is_admin'\)/);
 assert.doesNotMatch(js,/\.insert\(|\.update\(|\.delete\(/);
});

test('cross-device library combines reading history and synced chapter progress',()=>{
 const code=read('my-library.js'),html=read('my-library.html');
 assert.match(code,/sb\.from\('user_chapter_progress'\)/);
 assert.match(code,/sb\.from\('reading_history'\)/);
 assert.match(code,/currentId!==uid/);
 assert.match(html,/href="stats\.html"/);
});

test('service worker precaches all new routes and scripts',()=>{
 const src=read('sw.js');
 assert.match(src,/red-ribbon-v16/);
 for(const file of ['stats.html','stats.js','site-extras.js','reader-extras.js','admin-bulk.js','admin-activity.js','extras.css']){
   assert.ok(src.includes("'./"+file+"'"),file);
 }
});


test('catalog snapshot prevents late-loaded feature scripts from missing the event',()=>{
 assert.match(read('index.html'),/window\.RR_CATALOG_SNAPSHOT=data/);
 assert.match(read('site-extras.js'),/Array\.isArray\(window\.RR_CATALOG_SNAPSHOT\)/);
 assert.match(read('features-home.js'),/Array\.isArray\(window\.RR_CATALOG_SNAPSHOT\)/);
});
