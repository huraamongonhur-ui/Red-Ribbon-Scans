/* Homepage: Latest updates, recommendations (local genres), no AI or server functions. */
(()=>{
 const $=s=>document.querySelector(s);
 let all=[];
 const history=()=>{
   try{const rows=JSON.parse(localStorage.getItem('rr_hist')||'[]');return Array.isArray(rows)?rows:[]}
   catch{return []}
 };
 const favorites=()=>{
   const cloud=window.RRLibraryStore;
   if(cloud?.isSignedIn())return cloud.getFavoriteIds();
   try{const ids=JSON.parse(localStorage.getItem('rr_favs')||'[]');return Array.isArray(ids)?ids:[]}
   catch{return []}
 };
 const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=String(text);return node};
 const render=()=>{
   if(!all.length)return;
   const latest=$('#latestUpdates');latest.replaceChildren();
   const items=window.RRFeatures.updates(all,9);
   for(const item of items){
     const card=make('article','');card.className='home-feature-card';
     card.append(make('p',item.date||'Шинэ бүлэг'),make('h3',item.title));
     const a=make('a','Бүлэг '+item.chapter+' →');
     a.href='reader.html?m='+encodeURIComponent(item.manga_id)+'&c='+encodeURIComponent(item.chapter);
     card.append(a);latest.append(card);
   }
   if(!items.length)latest.textContent='Одоогоор бүлэг алга.';
   const out=$('#recommendations');out.replaceChildren();
   const recs=window.RRFeatures.recommendations(all,history(),favorites(),6);
   for(const item of recs){
     const card=make('article','');card.className='home-feature-card';
     card.append(make('p',(item.genres||[]).slice(0,2).join(' · ')||'Манга'));
     card.append(make('h3',item.title));
     const link=make('a','Дэлгэрэнгүй →');link.href='manga.html?m='+encodeURIComponent(item.id);
     card.append(link);out.append(card);
   }
   if(!recs.length)out.textContent='Манганы санал одоогоор алга.';
 };
 window.addEventListener('rr-catalog-loaded',e=>{all=Array.isArray(e.detail)?e.detail:[];render()});
 window.addEventListener('rr-library-change',render);
 if(Array.isArray(window.RR_CATALOG_SNAPSHOT)){
   all=window.RR_CATALOG_SNAPSHOT;
   render();
 }
})();
