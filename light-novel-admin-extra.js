/* Light Novel Studio auxiliary panels: glossary, reviews, analytics, release queue. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const dom=(tag,value)=>{const node=document.createElement(tag);node.textContent=String(value||"");return node;};
const field=(s)=>$(s).value;
const get=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const msg=e=>window.RRNovelStudio?.notes(e?.message||String(e));
let studio,glossary=[];
const readOnly=()=>!studio.state.isAdmin;
const nov=()=>studio.state.novel;
async function refreshGlossary(){
 const id=nov(),box=$("#laGlossaryList");box.replaceChildren();glossary=[];
 if(!id)return;
 glossary=await get(studio.state.sb.from("ln_glossary").select("*").eq("novel_id",id).order("source_term"));
 studio.glossary=glossary;
 for(const term of glossary){
  const row=dom("article","");
  const strong=dom("strong",term.source_term+" → "+term.translated_term);
  row.append(strong);
  if(term.note)row.append(dom("p",term.note));
  if(!readOnly()){
   const remove=dom("button","Устгах");remove.type="button";
   remove.onclick=async()=>{try{if(!confirm("Нэр томьёог устгах уу?"))return;
   await get(studio.state.sb.from("ln_glossary").delete().eq("id",term.id));await refreshGlossary();}
   catch(e){msg(e);}};
   row.append(remove);
  }
  box.append(row);
 }
 if(!glossary.length)box.append(dom("p","Энэ зохиолын толь хоосон."));
}
$("#laGlossaryForm").onsubmit=async e=>{
 e.preventDefault();if(readOnly()||!nov())return;
 try{
  const obj={novel_id:nov(),source_term:field("#laTermOriginal").trim(),translated_term:field("#laTermMongolian").trim(),
   note:field("#laTermNote").trim()};
  await get(studio.state.sb.from("ln_glossary").upsert(obj,{onConflict:"novel_id,source_term"}));
  e.target.reset();await refreshGlossary();studio.notes("Нэр томьёог хадгаллаа.");
 }catch(err){msg(err);}
};
async function refreshQueue(){
 const box=$("#laQueue");box.replaceChildren();
 for(const c of studio.state.chapters){
  const row=dom("article","");
  const due=c.status==="scheduled"?(" · "+new Date(c.release_at).toLocaleString()):"";
  row.append(dom("strong",c.title+" · "+c.status+due));
  const btn=dom("button","Editor-т нээх");btn.type="button";
  btn.onclick=()=>{
   studio.activeTab("editor");
   const b=[...$("#laChapterList").children].find(e=>e.dataset.id===c.id)?.querySelector("button");b?.click();
  };
  row.append(btn);box.append(row);
 }
 if(!studio.state.chapters.length)box.append(dom("p","Бүлэг байхгүй."));
}
async function refreshAnalytics(){
 const box=$("#laAnalytics");box.replaceChildren();
 if(readOnly()){box.textContent="Статистик зөвхөн админд харагдана.";return;}
 const id=nov();if(!id)return;
 const entries=await get(studio.state.sb.from("ln_read_events").select("chapter_id,event_type,reading_day")
   .eq("novel_id",id).limit(10000));
 const byId=new Map(studio.state.chapters.map(c=>[c.id,{title:c.title,opened:0,completed:0}]));
 entries.forEach(e=>{const row=byId.get(e.chapter_id);if(row)row[e.event_type]++;});
 if(!entries.length)box.append(dom("p","Одоогоор баталгаажсан уншилтын тоо алга."));
 for(const record of byId.values()){
  const ratio=record.opened?Math.round(record.completed/record.opened*100):0;
  const row=dom("article","");
  row.append(dom("strong",record.title));
  row.append(dom("p","Нээсэн: "+record.opened+" · 90% хүрсэн: "+record.completed+" · Үргэлжлүүлсэн: "+ratio+"%"));
  box.append(row);
 }
}
async function refreshReviewers(){
 const sb=studio.state.sb,box=$("#laReviewers");box.replaceChildren();
 if(!nov())return;
 const users=await get(sb.from("ln_reviewers").select("user_id,granted_at").eq("novel_id",nov()));
 for(const user of users){
  const row=dom("article","");
  row.append(dom("span",user.user_id));
  if(!readOnly()){
   const b=dom("button","Эрх цуцлах");b.type="button";
   b.onclick=async()=>{
    if(!confirm("Энэ reviewer-ийн эрхийг цуцлах уу?"))return;
    try{await get(sb.from("ln_reviewers").delete().eq("novel_id",nov()).eq("user_id",user.user_id));
    await refreshReviewers();}catch(e){msg(e);}
   };
   row.append(b);
  }
  box.append(row);
 }
 if(!users.length)box.append(dom("p","Reviewer бүртгэлгүй."));
}
$("#laReviewerForm").onsubmit=async e=>{
 e.preventDefault();if(readOnly()||!nov())return;
 const id=field("#laReviewerUID").trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){studio.notes("Зөв UUID оруулна уу.");return;}
 try{
  await get(studio.state.sb.from("ln_reviewers").upsert({novel_id:nov(),user_id:id},{onConflict:"novel_id,user_id"}));
  e.target.reset();await refreshReviewers();studio.notes("Reviewer эрхийг олголоо.");
 }catch(err){msg(err);}
};
async function refreshReviewNotes(){
 const novelSelect=$("#laReviewerNovelPick"),sel=$("#laReviewChapterPick"),box=$("#laReviewNotes"),preview=$("#laReviewReading");
 const previousNovel=novelSelect.value||nov();
 const previousChapter=sel.value;
 novelSelect.replaceChildren();sel.replaceChildren();box.replaceChildren();preview.replaceChildren();
 studio.state.novels.forEach(n=>{const o=dom("option",n.title);o.value=n.id;novelSelect.append(o);});
 novelSelect.value=studio.state.novels.some(n=>n.id===previousNovel)?previousNovel:nov();
 studio.state.chapters.forEach(c=>{const o=dom("option",c.title);o.value=c.id;sel.append(o);});
 if(previousChapter&&studio.state.chapters.some(c=>c.id===previousChapter))sel.value=previousChapter;
 if(!sel.value)return;
 const chapter=studio.state.chapters.find(c=>c.id===sel.value);
 preview.append(dom("h3",chapter?.title||""));
 for(const block of chapter?.blocks||[]){
   if(block.type==="paragraph")preview.append(dom("p",block.text||""));
   else if(block.type==="illustration"&&/^https:\/\//i.test(block.src||"")){
     const img=document.createElement("img");img.src=block.src;img.alt=block.alt||"Зураг";
     img.loading="lazy";img.style.maxWidth="100%";preview.append(img);
   }
 }
 const notes=await get(studio.state.sb.from("ln_review_notes").select("note,created_at,user_id")
  .eq("chapter_id",sel.value).order("created_at",{ascending:false}).limit(50));
 notes.forEach(n=>{const row=dom("article","");
  row.append(dom("strong",new Date(n.created_at).toLocaleString()));
  row.append(dom("p",n.note));box.append(row);
 });
 if(!notes.length)box.append(dom("p","Тэмдэглэл байхгүй."));
}
$("#laReviewChapterPick").onchange=()=>refreshReviewNotes().catch(msg);
$("#laReviewerNovelPick").onchange=async e=>{studio.state.novel=e.target.value;studio.state.chapter=null;try{await studio.loadChapters();}catch(err){msg(err);}};
$("#laReviewNoteForm").onsubmit=async e=>{
 e.preventDefault();
 const id=field("#laReviewChapterPick"),note=field("#laReviewNote").trim();
 if(!id||!note)return;
 try{
  await get(studio.state.sb.from("ln_review_notes").insert({chapter_id:id,note,user_id:studio.state.user.id}));
  e.target.reset();await refreshReviewNotes();
 }catch(err){msg(err);}
};
async function refreshPanels(){
 try{
  await Promise.all([refreshGlossary(),refreshQueue(),refreshAnalytics(),refreshReviewers(),refreshReviewNotes()]);
 }catch(err){msg(err);}
}
window.addEventListener("rr-ln-ready",()=>{
 studio=window.RRNovelStudio;
 studio.refreshGlossary=refreshGlossary;
 if(readOnly()){
  $("#laReviewerForm").hidden=true;$("#laGlossaryForm").hidden=true;
 }
 refreshPanels();
});
window.addEventListener("rr-ln-selection",()=>{if(studio)refreshPanels();});
})();