/* Public LN loader. RLS remains authoritative; explicitly exclude all unpublished records. */
window.RR_LN_READY=(async()=>{
  try{
    await window.RR_SUPABASE_READY;
    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_KEY)return;
    const db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);
    window.RR_LN_CLIENT=db;
    const novels=await db.from("ln_novels").select("*").eq("publication_status","published").order("title");
    if(novels.error)throw novels.error;
    if(!novels.data?.length)return;
    const ids=novels.data.map(n=>n.id);
    const chapters=await db.from("ln_chapters")
      .select("id,novel_id,volume_number,sort_order,slug,title,blocks,status,release_at,created_at")
      .in("novel_id",ids).in("status",["scheduled","published"])
      .order("volume_number").order("sort_order");
    if(chapters.error)throw chapters.error;
    const now=Date.now();
    const visible=(chapters.data||[]).filter(c=>c.status==="published" ||
      (c.status==="scheduled" && c.release_at && Date.parse(c.release_at)<=now));
    const map=new Map(ids.map(id=>[id,new Map()]));
    for(const c of visible){
      const volumes=map.get(c.novel_id),number=c.volume_number||1;
      if(!volumes.has(number))volumes.set(number,{number,title:number+"-р боть",complete:false,chapters:[]});
      const safeBlocks=(Array.isArray(c.blocks)?c.blocks:[]).filter(b=>b &&
        (b.type==="paragraph"&&typeof b.text==="string" || b.type==="illustration"&&
        typeof b.src==="string"&&/^https:\/\//i.test(b.src))).map(b=>({
         type:b.type,text:b.text||"",src:b.src||"",alt:b.alt||"",caption:b.caption||""
      }));
      volumes.get(number).chapters.push({
        id:c.slug,label:c.title,readMinutes:Math.max(1,Math.ceil(safeBlocks.filter(b=>b.type==="paragraph")
         .reduce((sum,b)=>sum+b.text.length,0)/700)),blocks:safeBlocks,
        dbChapterId:c.id,createdAt:c.created_at
      });
    }
    const converted=novels.data.map(n=>({
      id:n.slug,dbId:n.id,title:n.title,subtitle:n.subtitle||"",author:n.author||"",
      illustrator:n.illustrator||"",originalVolumes:n.original_volumes||0,
      genres:n.genres||[],status:"Нийтлэгдсэн",rating:null,cover:n.cover_url||"assets/ln-sample-cover.svg",
      synopsis:n.synopsis||"",characters:[],volumes:[...map.get(n.id).values()].sort((a,b)=>a.number-b.number)
    }));
    // Prefer the published database record when a demo slug is duplicated.
    const original=Array.isArray(window.RR_LIGHT_NOVELS)?window.RR_LIGHT_NOVELS:[];
    const liveSlugs=new Set(converted.map(n=>n.id));
    window.RR_LIGHT_NOVELS=[...converted,...original.filter(n=>!liveSlugs.has(n.id))];
    window.RR_LN_PUBLIC=converted;
  }catch(error){console.warn("[Red Ribbon] LN database unavailable; showing sample:",error.message);}
})();
