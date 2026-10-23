/* Red Ribbon Scans Light Novel UI — no framework or API keys required.
   Content is passed through textContent rather than interpolated into HTML. */
(() => {
"use strict";
const novel = window.RR_LIGHT_NOVEL;
if (!novel) return;
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const storage = {
  get(key, fallback) { try { const raw=localStorage.getItem(key); return raw===null?fallback:JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* private mode / quota */ } }
};
const prefix = "rr-ln-v2-"+novel.id+"-";
const el = (tag, attrs={}, text="") => {
  const node=document.createElement(tag);
  Object.entries(attrs).forEach(([key,value]) => {
    if (key==="className") node.className=value;
    else if (key==="dataset") Object.entries(value).forEach(([name,v]) => node.dataset[name]=v);
    else node.setAttribute(key,String(value));
  });
  if (text) node.textContent=text;
  return node;
};
const chapters = novel.volumes.flatMap(volume => volume.chapters.map(chapter=>({...chapter, volumeNumber:volume.number})));
const chapterUrl = id => "light-novel-reader.html?c="+encodeURIComponent(id);
const persistedProgress = () => storage.get(prefix+"progress", null);

function initDetail(){
  $("#novelTitle").textContent=novel.title;
  $("#novelSubtitle").textContent=novel.subtitle;
  $("#novelAuthor").textContent=novel.author;
  $("#novelIllustrator").textContent=novel.illustrator;
  $("#novelVolumes").textContent=novel.originalVolumes+" (эх зохиол)";
  $("#novelStatus").textContent=novel.status;
  $("#novelSynopsis").textContent=novel.synopsis;
  $("#novelCover").src=novel.cover;
  $("#novelHeroBackground").src=novel.cover;
  $("#novelRating").textContent=novel.rating===null?"Үнэлгээ байхгүй":String(novel.rating)+" / 5";
  for (const genre of novel.genres) $("#novelGenres").append(el("span",{className:"ln-tag"},genre));

  const saved = persistedProgress();
  const begin = $("#startReading");
  begin.href=chapterUrl(saved && chapters.some(ch=>ch.id===saved.chapterId)?saved.chapterId:chapters[0].id);
  begin.textContent=saved?"↗ Үргэлжлүүлэн унших":"↗ Уншиж эхлэх";
  const bookmark=$("#bookmarkNovel");
  const redrawBookmark=()=>{
    const chosen=!!storage.get(prefix+"bookmark",false);
    bookmark.setAttribute("aria-pressed",String(chosen));
    bookmark.textContent=chosen?"♥ Санд нэмэгдсэн":"♡ Миний санд нэмэх";
  };
  bookmark.addEventListener("click",()=>{storage.set(prefix+"bookmark",!storage.get(prefix+"bookmark",false));redrawBookmark();});
  redrawBookmark();
  const list=$("#volumeList");
  for (const volume of novel.volumes){
    const wrapper=el("div",{className:"ln-volume"});
    const heading=el("div",{className:"ln-volume-heading"});
    heading.append(el("strong",{},volume.title),el("span",{className:"ln-muted"},volume.complete?"Дууссан":"Дээж · "+volume.chapters.length+" хэсэг"));
    wrapper.append(heading);
    volume.chapters.forEach((ch,index)=>{
      const a=el("a",{className:"ln-chapter-link",href:chapterUrl(ch.id)});
      const left=el("div");
      left.append(el("strong",{},ch.label),el("small",{},ch.readMinutes+" мин · Тайлбарласан дээж"));
      a.append(left,el("span",{"aria-hidden":"true"},"→"));
      wrapper.append(a);
    });
    list.append(wrapper);
  }
  for (const character of novel.characters){
    const c=el("article",{className:"ln-character"});
    const art=el("div",{className:"ln-character-art","aria-label":"Дүрийн зураг оруулах байрлал"}, "✧");
    c.append(art,el("div",{className:"ln-kicker"},character.role),el("h3",{},character.name),el("p",{},character.description));
    $("#characterGrid").append(c);
  }
  const tabs=$$('[role="tab"]');
  const setTab=(id,focus=false)=>{
    tabs.forEach(tab=>{
      const active=tab.id===id;
      tab.setAttribute("aria-selected",String(active));
      tab.tabIndex=active?0:-1;
      const panel=document.getElementById(tab.getAttribute("aria-controls"));
      if(panel) panel.hidden=!active;
      if(active&&focus) tab.focus();
    });
  };
  tabs.forEach((tab,i)=>{
    tab.addEventListener("click",()=>setTab(tab.id));
    tab.addEventListener("keydown",evt=>{
      if(!["ArrowRight","ArrowLeft","Home","End"].includes(evt.key)) return;
      evt.preventDefault();
      let target=evt.key==="Home"?0:evt.key==="End"?tabs.length-1:(i+(evt.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
      setTab(tabs[target].id,true);
    });
  });
  setTab(tabs[0].id);
}

function initReader(){
  const requested=new URLSearchParams(location.search).get("c");
  const index=Math.max(0,chapters.findIndex(ch=>ch.id===requested));
  const chapter=chapters[index];
  const title=$("#readerChapterTitle");
  title.textContent=chapter.label;
  $("#readerHeaderTitle").textContent=novel.title;
  $("#readerHeaderSubtitle").textContent=chapter.label;
  $("#readerPosition").textContent=(index+1)+" / "+chapters.length+" хэсэг";
  document.title=chapter.label+" — "+novel.title+" | Red Ribbon Scans";
  const prev=chapters[index-1],next=chapters[index+1];
  for(const a of $$(".ln-prev")){a.href=prev?chapterUrl(prev.id):"#";a.setAttribute("aria-disabled",String(!prev));}
  for(const a of $$(".ln-next")){a.href=next?chapterUrl(next.id):"#";a.setAttribute("aria-disabled",String(!next));}
  const body=$("#readingBody");
  for(const block of chapter.blocks){
    if(block.type==="paragraph") body.append(el("p",{},block.text));
    else if(block.type==="illustration"&&block.src){
      const figure=el("figure",{className:"ln-illustration"});
      const open=el("button",{type:"button","aria-label":"Зургийг томруулж үзэх"});
      const img=el("img",{src:block.src,alt:block.alt||"",loading:"lazy"});
      const modal=$("#imageModal");
      open.append(img);
      open.addEventListener("click",()=>{
        $("#expandedIllustration").src=block.src;
        $("#expandedIllustration").alt=block.alt||"Томруулсан зураг";
        modal.showModal();
      });
      figure.append(open,el("figcaption",{},block.caption||""));
      body.append(figure);
    }
  }
  $("#closeImageModal").addEventListener("click",()=>$("#imageModal").close());
  $("#imageModal").addEventListener("click",e=>{if(e.target.id==="imageModal")e.target.close();});
  const drawer=$("#chapterModal");
  const menu=$("#chapterLinks");
  chapters.forEach(ch=>{
    const link=el("a",{href:chapterUrl(ch.id)},ch.label);
    if(ch.id===chapter.id) link.setAttribute("aria-current","page");
    menu.append(link);
  });
  $$(".ln-chapter-menu").forEach(btn=>btn.addEventListener("click",()=>drawer.showModal()));
  $("#closeChapterModal").addEventListener("click",()=>drawer.close());
  drawer.addEventListener("click",e=>{if(e.target===drawer)drawer.close();});

  const settingsPanel=$("#readerSettings");
  const toggle=$("#settingsToggle");
  const closeSettings=()=>{settingsPanel.hidden=true;toggle.setAttribute("aria-expanded","false");};
  toggle.addEventListener("click",()=>{settingsPanel.hidden=!settingsPanel.hidden;toggle.setAttribute("aria-expanded",String(!settingsPanel.hidden));});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSettings();});
  document.addEventListener("pointerdown",event=>{
    if(!settingsPanel.hidden&&!settingsPanel.contains(event.target)&&!toggle.contains(event.target))closeSettings();
  });
  const defaults={font:"serif",size:19,spacing:1.95,theme:"dark",width:760};
  const stored=storage.get(prefix+"settings", {});
  const pref={
    font:["serif","sans"].includes(stored.font)?stored.font:defaults.font,
    size:Number.isFinite(+stored.size)?Math.min(30,Math.max(14,+stored.size)):defaults.size,
    spacing:Number.isFinite(+stored.spacing)?Math.min(2.5,Math.max(1.4,+stored.spacing)):defaults.spacing,
    theme:["dark","light","sepia","oled"].includes(stored.theme)?stored.theme:defaults.theme,
    width:defaults.width
  };
  function applySettings(){
    document.body.dataset.readerTheme=pref.theme;
    body.dataset.font=pref.font;
    document.documentElement.style.setProperty("--ln-font-size",pref.size+"px");
    document.documentElement.style.setProperty("--ln-line-height",String(pref.spacing));
    $("#fontSize").value=pref.size;
    $("#fontSizeValue").textContent=pref.size+"px";
    $("#lineSpacing").value=pref.spacing;
    $("#lineSpacingValue").textContent=Number(pref.spacing).toFixed(2);
    $("#fontFamily").value=pref.font;
    $$(".ln-theme-option").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.theme===pref.theme)));
    storage.set(prefix+"settings",pref);
  }
  $("#fontSize").addEventListener("input",event=>{pref.size=Number(event.target.value);applySettings();});
  $("#lineSpacing").addEventListener("input",event=>{pref.spacing=Number(event.target.value);applySettings();});
  $("#fontFamily").addEventListener("change",event=>{pref.font=event.target.value;applySettings();});
  $$(".ln-theme-option").forEach(btn=>btn.addEventListener("click",()=>{pref.theme=btn.dataset.theme;applySettings();}));
  $("#resetSettings").addEventListener("click",()=>{Object.assign(pref,defaults);applySettings();});
  applySettings();

  const nav=$("#readerTop");
  let lastY=window.scrollY, ticking=false;
  const track=$("#readingProgress");
  const percentage=$("#progressPercent");
  const currentState=()=>({
    chapterId:chapter.id,
    percent:Math.round(100*Math.min(1,window.scrollY/Math.max(1,document.documentElement.scrollHeight-window.innerHeight))),
    scrollY:Math.round(window.scrollY),
    updatedAt:Date.now()
  });
  const sync=()=>{
    const y=window.scrollY;
    const distance=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const pct=Math.min(100,Math.max(0,y/distance*100));
    track.style.width=pct.toFixed(1)+"%";
    percentage.textContent=Math.round(pct)+"% уншсан";
    const diff=y-lastY;
    if(Math.abs(diff)>5){
      if(y<90 || diff<0 || !settingsPanel.hidden) nav.classList.remove("is-hidden");
      else if(diff>0) nav.classList.add("is-hidden");
    }
    lastY=y;
    storage.set(prefix+"progress",currentState());
    ticking=false;
  };
  const onScroll=()=>{
    if(!ticking){ticking=true;requestAnimationFrame(sync);}
  };
  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("resize",onScroll,{passive:true});
  // Restore the last position for this chapter, not a position from another chapter.
  const progress=persistedProgress();
  if(progress&&progress.chapterId===chapter.id&&Number.isFinite(progress.scrollY)){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      window.scrollTo({top:Math.max(0,Math.min(progress.scrollY,document.documentElement.scrollHeight-window.innerHeight)),behavior:"instant"});
      sync();
    }));
  } else sync();
}

if(document.body.dataset.page==="detail")initDetail();
else if(document.body.dataset.page==="reader")initReader();
})();