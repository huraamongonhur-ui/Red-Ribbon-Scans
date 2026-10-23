/* Statistics 2.0 — authenticated data is owner-scoped by SQL RLS. */
(async()=>{
 const $=q=>document.querySelector(q);
 const stats={};
 const localArray=()=>{
   try{const data=JSON.parse(localStorage.getItem('rr_hist')||'[]');return Array.isArray(data)?data:[]}
   catch{return []}
 };
 const addLink=(target,label,href,description)=>{
   const article=document.createElement('article');article.className='feature-ticket';
   const a=document.createElement('a');a.href=href;a.textContent=label;
   const sub=document.createElement('small');sub.textContent=description;
   article.append(a,sub);target.append(article);
 };
 const fromGuests=()=>{
   const rows=localArray().filter(h=>h&&h.m&&h.c!=null)
     .map(h=>({manga_id:String(h.m),chapter:String(h.c),page:1,
       bookmarked:false,read_at:new Date(Number(h.t)||0).toISOString()}));
   let keys=[];
   try{keys=Object.keys(localStorage).filter(x=>x.startsWith('rr_guest_mark_'))}catch{}
   for(const k of keys){
     try{
       const x=JSON.parse(localStorage.getItem(k)||'{}');
       const suffix=k.slice('rr_guest_mark_'.length);
       const separator=suffix.lastIndexOf('_');
       if(separator<1)continue;
       const manga_id=suffix.slice(0,separator),chapter=suffix.slice(separator+1);
       const existing=rows.find(r=>r.manga_id===manga_id&&r.chapter===chapter);
       if(existing){existing.page=Number(x.page)||1;existing.bookmarked=Boolean(x.bookmarked);}
       else rows.push({manga_id,chapter,page:Number(x.page)||1,bookmarked:Boolean(x.bookmarked),
         read_at:new Date(Number(x.at)||Date.now()).toISOString()});
     }catch{}
   }
   return rows;
 };
 async function load(){
   const notice=$('#statsNotice');$('#statsRefresh').disabled=true;
   try{
     const [catalog,sb]=await Promise.all([window.RRCatalog.load(),window.RRCatalog.client()]);
     let rows=[],signed=false;
     if(sb){
       const {data:{user}}=await sb.auth.getUser();
       if(user){
         signed=true;
         const result=await sb.from('user_chapter_progress')
           .select('manga_id,chapter,page,bookmarked,read_at')
           .eq('user_id',user.id).order('read_at',{ascending:false}).limit(1000);
         if(result.error)throw Error('Ахиц синк хийхэд алдаа гарлаа. next_10.sql-г шалгана уу. '+result.error.message);
         rows=result.data||[];
       }
     }
     if(!signed)rows=fromGuests();
     rows.sort((a,b)=>new Date(b.read_at)-new Date(a.read_at));
     const names=new Map(catalog.map(m=>[m.id,m]));
     const valid=rows.filter(r=>r?.manga_id&&r.chapter!=null);
     $('#statSeries').textContent=String(new Set(valid.map(r=>r.manga_id)).size);
     $('#statChapters').textContent=String(new Set(valid.map(r=>r.manga_id+'|'+r.chapter)).size);
     $('#statWeek').textContent=String(valid.filter(r=>(Date.now()-new Date(r.read_at).getTime())<=7*86400000).length);
     $('#statBookmarks').textContent=String(valid.filter(r=>r.bookmarked).length);
     const recent=$('#statsRecent'),marks=$('#statsMarks');
     recent.replaceChildren();marks.replaceChildren();
     for(const r of valid.slice(0,80)){
       const m=names.get(r.manga_id);if(!m)continue;
       if(!m.chapters.some(c=>String(c.n)===String(r.chapter)))continue;
       const href='reader.html?m='+encodeURIComponent(r.manga_id)+'&c='+encodeURIComponent(r.chapter)+'&p='+encodeURIComponent(Math.max(1,Number(r.page)||1));
       const label=m.title+' · Бүлэг '+r.chapter;
       if(recent.childElementCount<15)addLink(recent,label,href,'Хуудас '+r.page);
       if(r.bookmarked)addLink(marks,label,href,'★ Хуудас '+r.page);
     }
     if(!recent.childElementCount)recent.textContent='Одоогоор уншсан бүлэг алга.';
     if(!marks.childElementCount)marks.textContent='Хадгалсан хуудас алга.';
     notice.textContent=signed?'Аккаунттай синк хийгдсэн ахиц.':'Зочин: зөвхөн энэ төхөөрөмжийн ахиц. Нэвтэрснээр шинэ ахиц аккаунттай хадгалагдана.';
   }catch(e){notice.textContent='Статистик ачаалж чадсангүй: '+e.message;}
   finally{$('#statsRefresh').disabled=false}
 }
 $('#statsRefresh').onclick=load;
 await load();
})();