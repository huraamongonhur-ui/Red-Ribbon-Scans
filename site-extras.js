/* On-site alerts only: detect newly published chapters on a later visit.
   Does NOT request Web Push permission or run while the tab is closed. */
(()=>{
 const $=s=>document.querySelector(s);
 const trigger=$('#newChapterAlerts'),dialog=$('#newChapterDialog'),content=$('#newChapterList');
 if(!trigger||!dialog)return;
 let catalog=[],busy=false,notices=[];
 const safeRead=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
 const safeWrite=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data))}catch{}};
 const chapterKeys=m=>(m.chapters||[]).map(ch=>String(ch.n));
 const updateLabel=()=>{
   trigger.textContent='🔔 Шинэ бүлэг'+(notices.length?' ('+notices.length+')':'');
   trigger.setAttribute('aria-label','Дуртай манганы шинэ бүлэг: '+notices.length);
 };
 const check=async()=>{
   if(busy||!catalog.length)return;
   busy=true;
   try{
     const store=window.RRLibraryStore;
     if(store?.isSignedIn()&&!store.isFavoritesReady())return;
     let uid='guest',favorites=[];
     if(store?.isSignedIn()){
       favorites=store.getFavoriteIds();
       const sb=await window.RRCatalog.client();
       const {data:{user}}=await sb.auth.getUser();
       if(!user)return;
       uid=user.id;
     }else{
       try{const ids=JSON.parse(localStorage.getItem('rr_favs')||'[]');favorites=Array.isArray(ids)?ids:[]}catch{}
     }
     const key='rr_alert_snapshot_'+uid,old=safeRead(key),next={};
     const found=[];
     for(const id of new Set(favorites)){
       const m=catalog.find(item=>item.id===id);if(!m)continue;
       const chapters=chapterKeys(m);next[id]=chapters;
       if(!Array.isArray(old[id]))continue; // first visit establishes baseline
       const past=new Set(old[id]);
       for(const ch of chapters.filter(c=>!past.has(c))){
         found.push({id,title:m.title,chapter:ch});
       }
     }
     // Remember earlier unseen announcements until dismissed, scoped per account.
     const inboxKey='rr_alert_unread_'+uid;
     const before=safeRead(inboxKey);
     const previous=Array.isArray(before.items)?before.items:[];
     const unique=new Map([...previous,...found].map(x=>[x.id+'|'+x.chapter,x]));
     notices=[...unique.values()].slice(-30);
     safeWrite(key,next);safeWrite(inboxKey,{items:notices});
     trigger.dataset.scope=uid;updateLabel();
   }finally{busy=false}
 };
 const redraw=()=>{
   content.replaceChildren();
   if(!notices.length){content.textContent='Одоогоор шинэ бүлгийн мэдэгдэл алга.';return}
   for(const item of notices){
     const a=document.createElement('a');a.className='feature-ticket';
     a.href='reader.html?m='+encodeURIComponent(item.id)+'&c='+encodeURIComponent(item.chapter);
     a.textContent=item.title+' · Бүлэг '+item.chapter+' →';
     content.append(a);
   }
 };
 trigger.onclick=()=>{
   redraw();dialog.showModal();
   const uid=trigger.dataset.scope;
   if(uid)safeWrite('rr_alert_unread_'+uid,{items:[]});
   notices=[];updateLabel();
 };
 $('#newChapterClose').onclick=()=>dialog.close();
 window.addEventListener('rr-catalog-loaded',e=>{catalog=e.detail||[];check().catch(()=>{})});
 window.addEventListener('rr-library-change',()=>check().catch(()=>{}));
 if(Array.isArray(window.RR_CATALOG_SNAPSHOT)){
   catalog=window.RR_CATALOG_SNAPSHOT;
   check().catch(()=>{});
 }
 updateLabel();
})();