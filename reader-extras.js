/* Red Ribbon Scans 4.0 — Reader: account-isolated cloud progress, local guest bookmarks, retry controls. */
(()=>{
 const $=s=>document.querySelector(s);
 const saveLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 const readLocal=key=>{try{const obj=JSON.parse(localStorage.getItem(key)||'{}');return obj&&typeof obj==='object'?obj:{}}catch{return{}}};
 let sb=null,user=null,active=null,chapterKey='',localMark=false,cloudMark=false,remotePage=1,timer=null,revision=0;
 const state=$('#readerSaveState'),bookmark=$('#readerBookmark');
 const current=()=>{
   if(typeof m==='undefined'||!m||typeof ch==='undefined'||!ch)return null;
   return {manga_id:String(m.id),chapter:String(ch.n),
     page:Math.max(1,Math.min(10000,Number(typeof p==='undefined'?0:p)+1))};
 };
 const localKey=()=>{const c=current();return c?'rr_guest_mark_'+c.manga_id+'_'+c.chapter:''};
 const refreshButton=()=>{
   bookmark.disabled=!current();
   const flag=user?cloudMark:localMark;
   bookmark.textContent=flag?'★ Тэмдэглэгээтэй':'☆ Хуудас тэмдэглэх';
   bookmark.setAttribute('aria-pressed',String(flag));
 };
 async function connect(){
   try{
     sb=await window.RRCatalog.client();if(!sb){state.textContent='Зөвхөн энэ төхөөрөмж';return}
     const currentSession=await sb.auth.getSession();
     if(currentSession.error)throw currentSession.error;
     await switchUser(currentSession.data.session?.user||null);
     sb.auth.onAuthStateChange((_ev,session)=>setTimeout(()=>switchUser(session?.user||null),0));
   }catch(e){state.textContent='Синк холболт: '+e.message}
 }
 async function switchUser(next){
   const uid=next?.id||null;
   if(uid===user?.id)return;
   user=next||null;revision++;chapterKey='';clearTimeout(timer);cloudMark=false;
   const c=current();if(!c){refreshButton();return}
   if(!user){
     localMark=Boolean(readLocal(localKey()).bookmarked);
     state.textContent='Зочин: зөвхөн энэ төхөөрөмж';
     refreshButton();return;
   }
   state.textContent='Ахиц синк хийж байна…';
   const ok=await ensureChapter();
   if(ok)state.textContent='Ахиц уншигдлаа.';
 }
 async function ensureChapter(){
   const c=current();if(!c)return false;
   const key=(user?.id||'guest')+'|'+c.manga_id+'|'+c.chapter;
   if(key===chapterKey)return true;
   chapterKey=key;cloudMark=false;localMark=false;
   if(!user){localMark=Boolean(readLocal(localKey()).bookmarked);refreshButton();return true}
   const token=revision,uid=user.id;
   bookmark.disabled=true;
   const {data,error}=await sb.from('user_chapter_progress')
      .select('page,bookmarked').eq('user_id',uid)
      .eq('manga_id',c.manga_id).eq('chapter',c.chapter).maybeSingle();
   if(token!==revision || key!==chapterKey)return false;
   if(error){
     state.textContent='Синк уншихад алдаа: '+error.message;
     bookmark.disabled=true;chapterKey='';
     return false;
   }
   cloudMark=Boolean(data?.bookmarked);remotePage=Number(data?.page)||1;
   refreshButton();return true;
 }
 async function flush(){
   const c=current();
   if(!c)return;
   if(!(await ensureChapter()))return;
   if(!user){saveLocal(localKey(),{page:c.page,bookmarked:localMark,at:Date.now()});return}
   const token=revision,uid=user.id, key=c.manga_id+':'+c.chapter;
   const data={user_id:uid,...c,bookmarked:cloudMark};
   state.textContent='Хадгалж байна…';
   const result=await sb.from('user_chapter_progress').upsert(data,{onConflict:'user_id,manga_id,chapter'});
   if(token!==revision)return;
   state.textContent=result.error?'Синк алдаа: '+result.error.message:'Ахиц синк хийгдсэн';
   if(!result.error){remotePage=c.page;chapterKey=key;}
 }
 window.addEventListener('rr-reader-progress',()=>{
   if(!current())return;
   clearTimeout(timer);
   timer=setTimeout(()=>flush().catch(e=>{state.textContent=e.message}),1100);
 });
 bookmark.onclick=async()=>{
   if(!current()||!(await ensureChapter()))return;
   bookmark.disabled=true;
   clearTimeout(timer);
   if(user)cloudMark=!cloudMark;
   else localMark=!localMark;
   refreshButton();
   try{await flush()}catch(e){state.textContent='Тэмдэглэгээ хадгалж чадсангүй: '+e.message}
   finally{refreshButton()}
 };
 $('#readerRetry').onclick=()=>{
   const broken=[...document.querySelectorAll('#view img.pg')].filter(img=>!img.complete||img.naturalWidth===0);
   if(!broken.length){state.textContent='Дахин ачаалах зураг алга.';return}
   broken.forEach(img=>{
     const u=new URL(img.src,location.href);
     // Only retry the original image path; no arbitrary host requests.
     u.searchParams.set('rr_retry',String(Date.now()));
     img.src=u.href;
   });
   state.textContent=broken.length+' зургийг дахин ачаалж байна…';
 };
 refreshButton();
 connect();
})();