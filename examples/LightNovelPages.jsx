"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Optional React + Tailwind implementation for future Next.js migration.
 * The current Red Ribbon Scans production site remains plain HTML/CSS/JS.
 * Copy sample art to /public/assets when using this file in a Next project.
 */
const themeStyles = {
  dark: { screen: "bg-slate-900 text-slate-100", paper: "bg-slate-800 text-slate-100", panel: "bg-slate-800/95 text-slate-100 border-white/10" },
  light: { screen: "bg-slate-100 text-slate-800", paper: "bg-white text-slate-800", panel: "bg-white/95 text-slate-900 border-slate-200" },
  sepia: { screen: "bg-[#e7d9b4] text-[#443722]", paper: "bg-[#fef3c7] text-[#4e3b2b]", panel: "bg-[#f7ebc9]/95 text-[#443722] border-[#8d7556]/30" },
  oled: { screen: "bg-black text-gray-100", paper: "bg-black text-gray-100", panel: "bg-black/95 text-gray-100 border-white/15" }
};
const initialPreferences = { theme: "dark", font: "serif", fontSize: 19, lineHeight: 1.95 };
const getStored = (key, fallback) => {
  try { return JSON.parse(window.localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
function Badge({ children }) {
  return <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">{children}</span>;
}
function PrimaryLink({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 font-semibold text-white shadow-xl shadow-violet-700/20 transition hover:brightness-110">{children}</button>;
}
function EmptyNotice({ children }) {
  return <div className="rounded-2xl border border-dashed border-violet-300/25 bg-violet-400/5 p-6 text-sm leading-7 text-slate-400">{children}</div>;
}

/**
 * Props: novel={title,subtitle,author,illustrator,volumes,genres,rating,status,cover,synopsis,characters,chapters}
 * onRead(id), onBack(), onLibraryToggle(saved)
 */
export function NovelDetailPage({ novel, onRead=()=>{}, onBack=()=>{}, onLibraryToggle=()=>{} }) {
  const [tab, setTab] = useState("Synopsis");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(getStored("rr-ln-bookmark-"+novel.id, false)); }, [novel.id]);
  const toggleSaved = () => {
    const value = !saved;
    setSaved(value);
    window.localStorage.setItem("rr-ln-bookmark-"+novel.id, JSON.stringify(value));
    onLibraryToggle(value);
  };
  const tabs = ["Synopsis", "Chapters", "Characters", "Reviews"];
  return <main className="min-h-screen bg-[#0f172a] text-slate-100">
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <button className="text-sm font-bold tracking-widest text-violet-200" onClick={onBack}>← RED RIBBON / NOVELS</button>
        <span className="text-xs text-slate-400">LIGHT NOVEL</span>
      </div>
    </header>
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <img src={novel.cover} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full scale-125 object-cover opacity-30 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-900/80" />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-[220px_1fr] md:gap-12 md:py-20">
        <div className="w-36 md:w-full"><img src={novel.cover} alt={novel.title+" cover art"} className="aspect-[2/3] w-full rounded-2xl object-cover shadow-2xl shadow-black/50 ring-1 ring-white/15" /></div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-violet-300">Red Ribbon Scans • Монгол орчуулга</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">{novel.title}</h1>
          <p className="mt-2 text-slate-300">{novel.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">{novel.genres.map(tag=><Badge key={tag}>{tag}</Badge>)}</div>
          <dl className="mt-7 grid grid-cols-2 gap-5 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {[["Author",novel.author],["Illustrator",novel.illustrator],["Volumes",novel.volumes],["Rating",novel.rating ?? "Not rated"],["Status",novel.status]].map(([name,value])=><div key={name}><dt className="text-xs text-slate-400">{name}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <PrimaryLink onClick={()=>onRead(novel.chapters[0]?.id)}>Start Reading →</PrimaryLink>
            <button onClick={toggleSaved} aria-pressed={saved} className="rounded-xl border border-violet-300/25 bg-white/5 px-5 py-3 font-semibold backdrop-blur-md">{saved?"♥ In Library":"♡ Add to Library"}</button>
          </div>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10" role="tablist" aria-label="Novel details">
        {tabs.map(name=><button key={name} role="tab" aria-selected={tab===name} onClick={()=>setTab(name)} className={"whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold "+(tab===name?"border-violet-400 text-violet-200":"border-transparent text-slate-400")}>{name}</button>)}
      </div>
      <section className="py-8">
        {tab==="Synopsis"&&<div className="max-w-3xl text-base leading-8 text-slate-300"><h2 className="mb-4 text-2xl font-bold text-white">Synopsis</h2>{novel.synopsis}</div>}
        {tab==="Chapters"&&<div className="max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-800/50"><h2 className="border-b border-white/10 p-5 font-bold">Volume 1 · Translation sample</h2>{novel.chapters.map((ch,i)=><button key={ch.id} onClick={()=>onRead(ch.id)} className="flex w-full items-center justify-between border-b border-white/10 p-5 text-left hover:bg-violet-300/10"><span>{ch.title}</span><span className="text-violet-300">→</span></button>)}</div>}
        {tab==="Characters"&&<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{novel.characters.map(person=><article key={person.name} className="rounded-2xl border border-white/10 bg-slate-800/70 p-5"><div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-700/40 to-purple-900/40 text-5xl">{person.art ? <img src={person.art} alt={person.name+" demo illustration"} className="h-full w-full object-cover"/> : "✧"}</div><h3 className="font-bold">{person.name}</h3><p className="mt-2 text-sm text-slate-400">{person.description}</p></article>)}</div>}
        {tab==="Reviews"&&<EmptyNotice>Reviews and comments will appear here when a moderated backend is connected. No placeholder reviews are presented as real user feedback.</EmptyNotice>}
      </section>
    </div>
  </main>;
}

function ReaderSettings({ preferences, onChange, onClose }) {
  const update = (key,value) => onChange({...preferences,[key]:value});
  return <section aria-label="Reader settings" className="absolute right-3 top-16 z-40 w-[min(350px,calc(100vw-24px))] rounded-2xl border border-violet-300/20 bg-slate-900/95 p-5 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-2xl">
    <div className="mb-4 flex justify-between"><h2 className="font-bold">Reader Settings</h2><button onClick={onClose} aria-label="Close settings">✕</button></div>
    <label className="mb-4 block text-sm">Font Size: {preferences.fontSize}px<input type="range" min="14" max="30" value={preferences.fontSize} onChange={e=>update("fontSize",Number(e.target.value))} className="mt-2 w-full accent-violet-500"/></label>
    <label className="mb-4 block text-sm">Font Family<select value={preferences.font} onChange={e=>update("font",e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-800 p-2"><option value="serif">Serif</option><option value="sans">Sans-serif</option></select></label>
    <label className="mb-4 block text-sm">Line Spacing: {preferences.lineHeight.toFixed(2)}<input type="range" min="1.4" max="2.5" step="0.05" value={preferences.lineHeight} onChange={e=>update("lineHeight",Number(e.target.value))} className="mt-2 w-full accent-violet-500"/></label>
    <div className="grid grid-cols-4 gap-2">{["light","dark","sepia","oled"].map(theme=><button key={theme} aria-pressed={preferences.theme===theme} onClick={()=>update("theme",theme)} className={"rounded-lg border p-2 text-xs capitalize "+(preferences.theme===theme?"border-violet-400 bg-violet-600/40":"border-white/20")}>{theme}</button>)}</div>
  </section>;
}

/**
 * A typography-first Reader. Content blocks: {type:"paragraph", text} or
 * {type:"illustration",src,alt,caption}. Pass onNavigate(id), onBack().
 */
export function NovelReaderPage({ novel, chapterId, onNavigate=()=>{}, onBack=()=>{} }) {
  const chapterIndex = Math.max(0, novel.chapters.findIndex(ch=>ch.id===chapterId));
  const chapter = novel.chapters[chapterIndex];
  const [preferences,setPreferences] = useState(initialPreferences);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [chapterListOpen,setChapterListOpen] = useState(false);
  const [illustration,setIllustration] = useState(null);
  const [progress,setProgress] = useState(0);
  const [navVisible,setNavVisible] = useState(true);
  const lastScroll = useRef(0);
  const key="rr-reader-settings-"+novel.id;
  useEffect(()=>{setPreferences({...initialPreferences,...getStored(key,initialPreferences)});},[key]);
  useEffect(()=>{window.localStorage.setItem(key,JSON.stringify(preferences));},[key,preferences]);
  useEffect(()=>{
    const handle=()=>{
      const y=window.scrollY;
      const scrollable=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      setProgress(Math.round(100*Math.min(1,y/scrollable)));
      if(Math.abs(y-lastScroll.current)>6)setNavVisible(y<100||y<lastScroll.current);
      lastScroll.current=y;
      window.localStorage.setItem("rr-reader-progress-"+novel.id,JSON.stringify({chapterId:chapter.id,percent:Math.round(y/scrollable*100)}));
    };
    window.addEventListener("scroll",handle,{passive:true});handle();
    return ()=>window.removeEventListener("scroll",handle);
  },[chapter.id,novel.id]);
  const colors=themeStyles[preferences.theme] ?? themeStyles.dark;
  const previous=novel.chapters[chapterIndex-1], next=novel.chapters[chapterIndex+1];
  const navigate=id=>{setChapterListOpen(false);window.scrollTo(0,0);onNavigate(id);};
  return <main className={"min-h-screen transition-colors "+colors.screen}>
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-violet-400/10"><div className="h-full bg-violet-400 transition-[width] duration-150" style={{width:progress+"%"}}/></div>
    <header className={"fixed inset-x-0 top-0 z-40 h-16 border-b backdrop-blur-2xl transition-transform duration-200 "+colors.panel+" "+(!navVisible&&!settingsOpen?"-translate-y-full":"translate-y-0")}>
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3">
        <button onClick={onBack} className="rounded-lg px-3 py-2 hover:bg-violet-500/15">← Back</button>
        <span className="truncate text-center text-xs font-semibold sm:text-sm">{chapter.title}</span>
        <div className="flex gap-2"><button onClick={()=>setChapterListOpen(true)} aria-label="Chapter list" className="rounded-lg px-3 py-2 hover:bg-violet-500/15">☷</button><button onClick={()=>setSettingsOpen(v=>!v)} aria-label="Reader settings" aria-expanded={settingsOpen} className="rounded-lg px-3 py-2 hover:bg-violet-500/15">⚙</button></div>
      </div>
      {settingsOpen&&<ReaderSettings preferences={preferences} onChange={setPreferences} onClose={()=>setSettingsOpen(false)}/>}
    </header>
    <div className="mx-auto px-3 pb-16 pt-24">
      <article className={"mx-auto max-w-[760px] rounded-2xl border border-current/10 px-5 py-10 shadow-xl shadow-black/5 sm:px-12 sm:py-14 "+colors.paper}>
        <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest opacity-60">Red Ribbon Scans · Translation Sample</p>
        <h1 className="mb-9 text-center text-2xl font-bold sm:text-3xl">{chapter.title}</h1>
        <div className={preferences.font==="serif"?"font-serif":"font-sans"} style={{fontSize:preferences.fontSize,lineHeight:preferences.lineHeight}}>
          {chapter.blocks.map((block,i)=>block.type==="paragraph"
            ? <p className="mb-[1.45em] indent-6" key={i}>{block.text}</p>
            : <figure key={i} className="my-10 text-center"><button onClick={()=>setIllustration(block)} aria-label="Expand illustration" className="w-full"><img src={block.src} alt={block.alt||""} className="mx-auto max-h-[600px] w-full rounded-2xl object-contain"/></button><figcaption className="mt-3 text-xs opacity-60">{block.caption}</figcaption></figure>)}
        </div>
      </article>
      <nav className="mx-auto mt-8 flex max-w-[760px] items-center justify-center gap-3" aria-label="Chapter navigation">
        <button disabled={!previous} onClick={()=>navigate(previous?.id)} className="rounded-xl border border-current/20 px-4 py-3 disabled:opacity-30">← Previous</button>
        <button onClick={()=>setChapterListOpen(true)} className="rounded-xl border border-current/20 px-4 py-3">Chapters</button>
        <button disabled={!next} onClick={()=>navigate(next?.id)} className="rounded-xl bg-violet-600 px-4 py-3 text-white disabled:opacity-30">Next →</button>
      </nav><p className="mt-3 text-center text-xs opacity-60">{progress}% complete · Short preview only</p>
    </div>
    {chapterListOpen&&<div role="dialog" aria-modal="true" aria-label="Chapter list" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" onClick={()=>setChapterListOpen(false)}><section className={"w-full max-w-md rounded-2xl border p-5 shadow-2xl "+colors.panel} onClick={e=>e.stopPropagation()}><div className="mb-4 flex justify-between"><strong>Chapters</strong><button onClick={()=>setChapterListOpen(false)}>✕</button></div>{novel.chapters.map(ch=><button key={ch.id} onClick={()=>navigate(ch.id)} className="block w-full rounded-lg p-3 text-left hover:bg-violet-500/20">{ch.title}</button>)}</section></div>}
    {illustration&&<div role="dialog" aria-modal="true" aria-label="Expanded illustration" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3" onClick={()=>setIllustration(null)}><div className="relative max-h-[90vh] max-w-[95vw]" onClick={e=>e.stopPropagation()}><button onClick={()=>setIllustration(null)} aria-label="Close illustration" className="absolute right-2 top-2 rounded-full bg-black/80 px-3 py-2 text-white">✕</button><img src={illustration.src} alt={illustration.alt||""} className="max-h-[88vh] max-w-full rounded-xl object-contain"/></div></div>}
  </main>;
}