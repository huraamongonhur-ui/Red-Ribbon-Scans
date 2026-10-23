/* Light Novel Studio: admin-only writing + reviewer access. RLS enforces all permissions. */
(async()=>{
"use strict";
const $=q=>document.querySelector(q);
const $$=q=>[...document.querySelectorAll(q)];
const note=msg=>{$("#laNotice").textContent=msg;};
const errorText=e=>e?.message||String(e||"Тодорхойгүй алдаа");
const dom=(name,text,cls)=>{const x=document.createElement(name);x.textContent=text||"";if(cls)x.className=cls;return x;};
const get=async promise=>{const result=await promise;if(result.error)throw result.error;return result.data;};
const state={sb:null,user:null,isAdmin:false,novels:[],chapters:[],novel:null,chapter:null};
const currentNovel=()=>state.novels.find(n=>n.id===state.novel);
const selectedChapter=()=>state.chapters.find(c=>c.id===state.chapter);
const activeTab=id=>{$$("#laTabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));$$("[data-panel]").forEach(e=>e.hidden=e.dataset.panel!==id);};
$$("#laTabs button").forEach(b=>b.addEventListener("click",()=>activeTab(b.dataset.tab)));
function setFormNovel(n){
  state.novel=n?.id||null;
  $("#laNovelSlug").value=n?.slug||"";$("#laNovelSlug").readOnly=!!n;
  for(const [id,key] of [["Title","title"],["Subtitle","subtitle"],["Author","author"],["Illustrator","illustrator"],["Cover","cover_url"],["Synopsis","synopsis"]])
    $("#laNovel"+id).value=n?.[key]||"";
  $("#laNovelGenres").value=(n?.genres||[]).join(", ");
  $("#laNovelVolumes").value=n?.original_volumes||0;
  $("#laNovelStatus").value=n?.publication_status||"draft";
}
function setFormChapter(c){
  state.chapter=c?.id||null;
  $("#laChapterTitle").value=c?.title||"";
  $("#laChapterSlug").value=c?.slug||"";
  $("#laChapterSlug").readOnly=!!c;
  $("#laVolumeNumber").value=c?.volume_number||1;
  $("#laChapterStatus").value=c?.status||"draft";
  $("#laReleaseAt").value=c?.release_at?new Date(new Date(c.release_at).getTime()-new Date(c.release_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
  $("#laChapterText").value=window.RRNovelQuality.textFromBlocks(c?.blocks||[]);
  $("#laVersions").replaceChildren();
  renderChapters();
  loadVersions().catch(e=>note(errorText(e)));
}
function renderNovels(){
  const select=$("#laNovelPick");select.replaceChildren();
  state.novels.forEach(n=>{
    const o=dom("option",(n.publication_status==="published"?"● ":"○ ")+n.title);
    o.value=n.id;select.append(o);
  });
  select.value=state.novel||"";
}
function renderChapters(){
  const list=$("#laChapterList");list.replaceChildren();
  state.chapters.forEach(c=>{
    const li=dom("li","");li.draggable=state.isAdmin;li.dataset.id=c.id;
    li.classList.toggle("active",c.id===state.chapter);
    li.append(dom("span","☰  V"+c.volume_number+" · "+c.title+" · "+c.status));
    const open=dom("button","Засах");open.type="button";
    open.onclick=()=>setFormChapter(c);
    li.append(open);
    if(state.isAdmin){
      for(const [label,direction] of [["↑",-1],["↓",1]]){
        const move=dom("button",label);move.type="button";move.setAttribute("aria-label",direction<0?"Бүлгийг дээш":"Бүлгийг доош");
        move.onclick=()=>{
          if(direction<0&&li.previousElementSibling)list.insertBefore(li,li.previousElementSibling);
          else if(direction>0&&li.nextElementSibling)list.insertBefore(li.nextElementSibling,li);
        };
        li.append(move);
      }
    }
    li.addEventListener("dragstart",e=>{if(!state.isAdmin)return;e.dataTransfer.setData("text/plain",c.id);li.classList.add("dragging");});
    li.addEventListener("dragend",()=>li.classList.remove("dragging"));
    li.addEventListener("dragover",e=>{if(state.isAdmin)e.preventDefault();});
    li.addEventListener("drop",e=>{
      e.preventDefault();const dragged=list.querySelector('[data-id="'+e.dataTransfer.getData("text/plain")+'"]');
      if(dragged&&dragged!==li)list.insertBefore(dragged,li);
    });
    list.append(li);
  });
}
async function loadNovels(){
  state.novels=await get(state.sb.from("ln_novels").select("*").order("title"));
  if(!state.novels.some(n=>n.id===state.novel))state.novel=state.novels[0]?.id||null;
  renderNovels();setFormNovel(currentNovel());await loadChapters();
}
async function loadChapters(){
  state.chapters=state.novel?await get(state.sb.from("ln_chapters").select("*").eq("novel_id",state.novel).order("volume_number").order("sort_order").order("created_at")):[];
  if(!state.chapters.some(c=>c.id===state.chapter))state.chapter=state.chapters[0]?.id||null;
  setFormChapter(selectedChapter());
  window.dispatchEvent(new Event("rr-ln-selection"));
}
$("#laNovelPick").onchange=async e=>{state.novel=e.target.value;state.chapter=null;setFormNovel(currentNovel());try{await loadChapters()}catch(err){note(errorText(err));}};
$("#laNewNovel").onclick=()=>{state.novel=null;state.chapter=null;state.chapters=[];setFormNovel(null);renderChapters();$("#laNovelPick").value="";$("#laNovelMsg").textContent="Шинэ зохиол. Хадгалсны дараа сонгож бүлэг нэмнэ."};
$("#laNovelForm").onsubmit=async e=>{
 e.preventDefault();if(!state.isAdmin)return;
 const n=currentNovel();
 const record={
  slug:$("#laNovelSlug").value.trim().toLowerCase(),title:$("#laNovelTitle").value.trim(),
  subtitle:$("#laNovelSubtitle").value.trim(),author:$("#laNovelAuthor").value.trim(),
  illustrator:$("#laNovelIllustrator").value.trim(),cover_url:$("#laNovelCover").value.trim(),
  synopsis:$("#laNovelSynopsis").value.trim(),
  original_volumes:Math.max(0,Number($("#laNovelVolumes").value)||0),
  genres:$("#laNovelGenres").value.split(",").map(x=>x.trim()).filter(Boolean),
  publication_status:$("#laNovelStatus").value
 };
 if(record.cover_url&&!/^https:\/\//.test(record.cover_url)){note("Нүүр зураг зөвхөн HTTPS URL байх ёстой.");return;}
 try{
   if(record.publication_status==="published"&&!confirm("Зохиолын мэдээллийг нийтэд нээх үү? Бүлгүүд тусдаа нийтлэх төлөвтэй."))return;
   const saved=await get(n?state.sb.from("ln_novels").update(record).eq("id",n.id).select().single()
    :state.sb.from("ln_novels").insert(record).select().single());
   state.novel=saved.id;await loadNovels();$("#laNovelMsg").textContent="Хадгаллаа.";
 }catch(err){note(errorText(err));}
};
$("#laNewChapter").onclick=()=>{if(!state.novel){note("Эхлээд зохиол хадгална уу.");return;}setFormChapter(null);activeTab("editor");};
$("#laChapterForm").onsubmit=async e=>{
 e.preventDefault();if(!state.isAdmin||!state.novel)return;
 const old=selectedChapter(),status=$("#laChapterStatus").value;
 const blocks=window.RRNovelQuality.blocksFromText($("#laChapterText").value);
 if(!blocks.length){note("Хоосон бүлэг хадгалахгүй.");return;}
 if(blocks.length>2000){note("Нэг бүлэгт 2000-аас олон блок оруулахгүй.");return;}
 const release=$("#laReleaseAt").value;
 if(status==="scheduled"&&(!release||Date.parse(release)<=Date.now())){note("Scheduled бүлэгт ирээдүйн цаг сонгоно уу.");return;}
 if(["published","scheduled"].includes(status)&&old?.status!=="approved"&&old?.status!=="scheduled"&&old?.status!=="published"){
   note("Эхлээд бүлгийг Approved төлөвт хадгалаад, дараа нь нийтэлнэ.");return;
 }
 if(["published","scheduled"].includes(status)&&!confirm("Бүлгийг уншигчдад нээх үйлдлийг батлах уу?"))return;
 const record={novel_id:state.novel,title:$("#laChapterTitle").value.trim(),slug:$("#laChapterSlug").value.trim().toLowerCase(),
 volume_number:Number($("#laVolumeNumber").value)||1,sort_order:old?.sort_order??state.chapters.length+1,blocks,status,
 release_at:status==="scheduled"?new Date(release).toISOString():null};
 try{
   const saved=await get(old?state.sb.from("ln_chapters").update(record).eq("id",old.id).select().single()
   :state.sb.from("ln_chapters").insert(record).select().single());
   state.chapter=saved.id;await loadChapters();$("#laChapterMsg").textContent="Бүлэг хадгалагдлаа.";
 }catch(err){note(errorText(err));}
};
$("#laSaveOrder").onclick=async()=>{
 if(!state.isAdmin||!state.novel||!state.chapters.length)return;
 const ids=[...$("#laChapterList").children].map(li=>li.dataset.id);
 try{await get(state.sb.rpc("ln_reorder_chapters",{p_novel:state.novel,p_ids:ids}));await loadChapters();note("Бүлгийн дарааллыг хадгаллаа.");}catch(e){note(errorText(e));}
};
async function loadVersions(){
 const box=$("#laVersions");box.replaceChildren();
 if(!state.chapter||!state.isAdmin)return;
 const items=await get(state.sb.from("ln_chapter_versions").select("id,saved_at,title,status,blocks")
  .eq("chapter_id",state.chapter).order("saved_at",{ascending:false}).limit(10));
 if(!items.length)box.append(dom("p","Өмнөх хувилбар алга."));
 items.forEach(v=>{
   const row=dom("article",new Date(v.saved_at).toLocaleString()+" · "+v.status);
   const b=dom("button","Сэргээх");b.type="button";b.onclick=async()=>{
     if(!confirm("Өмнөх текстийг Draft болгон сэргээх үү?"))return;
     try{
       await get(state.sb.from("ln_chapters").update({title:v.title,blocks:v.blocks,status:"draft",release_at:null})
         .eq("id",state.chapter).select().single());
       await loadChapters();note("Хувилбар сэргээгдлээ.");
     }catch(e){note(errorText(e));}
   };row.append(b);box.append(row);
 });
}
$("#laCheckQuality").onclick=async()=>{await window.RRNovelStudio?.refreshGlossary?.();const issues=window.RRNovelQuality.analyze($("#laChapterText").value,window.RRNovelStudio.glossary||[]);$("#laQualityResults").textContent=issues.length?issues.map(x=>"• "+x.message).join("\n"):"Илэрхий давхардал, формат, нэр томьёоны зөрүү олдсонгүй. Монгол найруулгыг редактороор давхар шалгана уу.";};
$("#laAddIllustration").onclick=()=>{
 const url=$("#laIllustrationURL").value.trim();
 if(!/^https:\/\//.test(url)){note("HTTPS зураг URL оруулна уу.");return;}
 const t=$("#laChapterText");t.value+=(t.value?"\n\n":"")+"[[image:"+url+"|Зургийн тайлбар]]";t.focus();
};
$("#laArtUpload").onclick=async()=>{
 const file=$("#laArtFile").files[0],n=currentNovel();
 if(!file||!n||!state.isAdmin)return;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024||file.size===0){note("JPG/PNG/WebP 10MB хүртэл.");return;}
 if(!confirm("PUBLIC art bucket-д upload хийнэ. Нууц, зөвшөөрөлгүй зураг биш гэдгээ батлах уу?"))return;
 const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
 const path=n.slug+"/"+crypto.randomUUID()+"."+ext;
 try{
  await get(state.sb.storage.from("ln-public-art").upload(path,file,{contentType:file.type,upsert:false}));
  const {data}=state.sb.storage.from("ln-public-art").getPublicUrl(path);
  $("#laIllustrationURL").value=data.publicUrl;note("Зураг upload хийгдлээ. '+ Зураг блок' дарж текст дунд нэмнэ.");
 }catch(err){note(errorText(err));}
};
$("#laShowPreview").onclick=()=>{
 const dialog=$("#laPreviewDialog"),area=$("#laPreviewArticle");
 area.replaceChildren(dom("h2",$("#laChapterTitle").value||"Бүлэг"));
 for(const b of window.RRNovelQuality.blocksFromText($("#laChapterText").value)){
   if(b.type==="paragraph")area.append(dom("p",b.text));
   else if(/^https:\/\//.test(b.src)){const img=dom("img");img.src=b.src;img.alt=b.alt||"Зураг";img.style.maxWidth="100%";area.append(img);}
 }
 area.dataset.theme=$("#laPreviewTheme").value;dialog.showModal();
};
$("#laPreviewTheme").onchange=e=>{$("#laPreviewArticle").dataset.theme=e.target.value;};
$("#laPreviewClose").onclick=()=>$("#laPreviewDialog").close();
$("#laPreviewDialog").onclick=e=>{if(e.target.id==="laPreviewDialog")e.target.close();};
let importContent="";
$("#laImport").onclick=async()=>{
 const file=$("#laImportFile").files[0];
 if(!file)return;
 $("#laImportStatus").textContent="Файлыг уншиж байна…";
 try{importContent=await window.RRNovelQuality.importText(file);
 $("#laImportPreview").value=importContent.slice(0,120000);
 $("#laUseImport").disabled=!importContent.trim();
 $("#laImportChapters").disabled=!importContent.trim();
 $("#laImportStatus").textContent="Текст уншсан. "+window.RRNovelQuality.splitChapters(importContent).length+" хэсэг илэрлээ. Хадгалахаас өмнө шалгана уу.";}
 catch(err){importContent="";$("#laUseImport").disabled=true;$("#laImportChapters").disabled=true;$("#laImportStatus").textContent=errorText(err);}
};
$("#laUseImport").onclick=()=>{
 if(!importContent)return;$("#laChapterText").value=importContent;
 $("#laChapterStatus").value="draft";activeTab("editor");
 note("Импортолсон текст Editor-т орлоо. Бүлэг болон догол мөрийг шалгаж хадгална уу.");
};
$("#laImportChapters").onclick=async()=>{
 if(!state.isAdmin||!state.novel||!importContent.trim()){note("Эхлээд зохиол болон импортын файл сонгоно уу.");return;}
 const items=window.RRNovelQuality.splitChapters(importContent);
 if(items.length>80){note("Нэг удаад 80 хүртэл бүлэг хадгална уу.");return;}
 if(items.some(item=>item.text.length>300000)){note("Хэт том бүлэг байна; файлаа хуваагаарай.");return;}
 if(!confirm(items.length+" хэсгийг нийтлээгүй Draft бүлэг болгож хадгалах уу?"))return;
 const button=$("#laImportChapters");button.disabled=true;
 const stamp=Date.now().toString(36);
 let saved=0;
 try{
   for(let i=0;i<items.length;i++){
     const item=items[i];
     const blocks=window.RRNovelQuality.blocksFromText(item.text);
     if(!blocks.length)continue;
     const row={novel_id:state.novel,title:item.title.slice(0,180),
       slug:"import-"+stamp+"-"+(i+1),volume_number:1,
       sort_order:state.chapters.length+i+1,status:"draft",release_at:null,blocks};
     await get(state.sb.from("ln_chapters").insert(row));
     saved++;
     $("#laImportStatus").textContent=saved+" / "+items.length+" Draft хадгаллаа…";
   }
   await loadChapters();activeTab("editor");
   note(saved+" бүлэг Draft хэлбэрээр хадгалагдлаа. Review хийхээс өмнө шалгана уу.");
 }catch(err){
   note(saved+" бүлэг хадгалагдсан; дараагийн бүлэг дээр алдаа: "+errorText(err)+". Дахин импортлохоос өмнө давхардлыг шалгаарай.");
 }finally{button.disabled=false;}
};
async function start(){
 try{
  await window.RR_SUPABASE_READY;
  if(!window.SUPABASE_URL||!window.SUPABASE_KEY||!window.supabase)throw Error("Supabase public config олдсонгүй.");
  const sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);state.sb=sb;
  const {data:userData,error:userError}=await sb.auth.getUser();if(userError||!userData?.user)throw Error("Эхлээд сайтад нэвтэрнэ үү.");
  state.user=userData.user;
  const check=await sb.rpc("is_admin");if(check.error)throw check.error;
  state.isAdmin=check.data===true;
  const reviewerRows=state.isAdmin?[]:await get(sb.from("ln_reviewers").select("novel_id").eq("user_id",state.user.id));
  if(!state.isAdmin&&!reviewerRows.length)throw Error("Light Novel Studio эрх байхгүй.");
  $("#laIdentity").textContent=state.isAdmin?"Admin":"Reviewer";
  $("#laApp").hidden=false;
  if(!state.isAdmin){
   $$("#laTabs button").forEach(b=>b.hidden=b.dataset.tab!=="reviewers");
   $("#laNovelForm").hidden=true;$("#laNewNovel").hidden=true;$("#laNewChapter").hidden=true;
   $("#laSaveOrder").hidden=true;activeTab("reviewers");
  }
  await loadNovels();
  note("Light Novel Studio бэлэн. Сонгосон зохиол: "+(currentNovel()?.title||"байхгүй"));
  window.RRNovelStudio={state,notes:note,loadNovels,loadChapters,activeTab,glossary:[]};
  window.dispatchEvent(new Event("rr-ln-ready"));
 }catch(err){note("Нэвтрэлт / database тохиргоо: "+errorText(err)+". light_novel_admin.sql болон light_novel_admin_extra.sql миграцийг шалгана уу.");}
}
start();
})();