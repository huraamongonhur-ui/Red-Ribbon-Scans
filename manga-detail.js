/* Manga Details 2.0: safe DOM, no unescaped admin titles. */
(async()=>{
 const $=s=>document.querySelector(s),notice=$('#mangaNotice'),panel=$('#mangaDetail');
 const id=new URLSearchParams(location.search).get('m');
 if(!id){notice.textContent='Манга сонгоогүй байна.';return;}
 let manga,store=null;
 const refresh=()=>{
   if(!store)return;
   const signed=store.isSignedIn();
   $('#detailHeart').disabled=!signed||!store.isFavoritesReady();
   $('#detailStatus').disabled=!signed||!store.isReady();
   $('#detailHeart').textContent=store.isFavorite(id)?'♥ Дуртайгаас хасах':'♡ Дуртайд нэмэх';
   $('#detailHeart').setAttribute('aria-pressed',String(store.isFavorite(id)));
   $('#detailStatus').value=store.getStatus(id)||'';
 };
 const element=(tag,text)=>{const e=document.createElement(tag);e.textContent=String(text);return e};
 try{
   const [all,sb]=await Promise.all([window.RRCatalog.load(),window.RRCatalog.client()]);
   manga=all.find(m=>m.id===id);
   if(!manga||!manga.chapters.length){notice.textContent='Манга олдсонгүй.';return;}
   document.title=manga.title+' — Red Ribbon Scans';
   $('#detailTitle').textContent=manga.title;
   $('#detailDescription').textContent=manga.description||'Энэ манганы танилцуулга хараахан нэмэгдээгүй байна.';
   if(manga.cover){
     const img=new Image();img.src=manga.cover;img.alt=manga.title+' нүүр зураг';
     img.onerror=()=>img.remove();$('#detailCover').append(img);
   }
   for(const genre of manga.genres||[]){
     const tag=element('span',genre);tag.className='details-tag';$('#detailGenres').append(tag);
   }
   $('#detailMeta').textContent=manga.chapters.length+' бүлэг';
   const chapters=[...manga.chapters].sort((a,b)=>Number(b.n)-Number(a.n));
   const readUrl=n=>'reader.html?m='+encodeURIComponent(id)+'&c='+encodeURIComponent(n);
   $('#detailStart').href=readUrl(chapters[chapters.length-1].n);
   $('#detailReport').href='feedback.html?kind=report&m='+encodeURIComponent(id);
   for(const chapter of chapters){
     const a=document.createElement('a');a.className='details-chapter';
     a.href=readUrl(chapter.n);
     const name=element('strong','Бүлэг '+chapter.n+(chapter.title?' — '+chapter.title:''));
     const date=element('small',chapter.date||'');
     a.append(name,date);$('#detailChapters').append(a);
   }
   panel.hidden=false;notice.textContent='';
   if(!sb){$('#detailMeta').textContent+=' · Нэвтрэх боломж түр хаалттай';return;}
   store=window.RRMyLibrary.create(sb);
   const {data:session}=await sb.auth.getSession();
   await store.setSession(session?.session||null);
   sb.auth.onAuthStateChange((_event,s)=>setTimeout(()=>store.setSession(s).then(refresh),0));
   window.addEventListener('rr-library-change',refresh);
   $('#detailHeart').onclick=async()=>{
     const b=$('#detailHeart');b.disabled=true;
     try{await store.setFavorite(id,!store.isFavorite(id))}
     catch(err){notice.textContent='Зүрхлэхэд алдаа: '+err.message}
     finally{refresh()}
   };
   $('#detailStatus').onchange=async e=>{
     const select=e.target,old=store.getStatus(id);
     select.disabled=true;
     try{await store.setStatus(id,select.value)}
     catch(err){select.value=old;notice.textContent='Хадгалах алдаа: '+err.message}
     finally{refresh()}
   };
   const {data:rating}=await sb.from('manga_ratings').select('avg,n').eq('manga_id',id).maybeSingle();
   if(rating)$('#detailMeta').textContent+=' · ★ '+rating.avg+' ('+rating.n+' үнэлгээ)';
   refresh();
 }catch(err){notice.textContent='Манга ачаалж чадсангүй: '+err.message}
})();