/* Client-side ZIP importer. Requires JSZip and authenticated admin RLS.
   ZIP entries: <chapter-number>/<page-number>.png|jpg|webp; no nested or unsafe paths. */
(async()=>{
 const $=s=>document.querySelector(s);
 const notice=$('#bulkNotice'),button=$('#bulkUpload'),picker=$('#bulkManga');
 if(!button||!notice)return;
 const allowed={'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp'};
 const maxArchive=80*1024*1024,maxPage=10*1024*1024,maxFiles=320;
 let sb=null,processing=false;
 function parseEntries(zip) {
   const groups=new Map();
   for(const [path,entry] of Object.entries(zip.files)){
     if(entry.dir)continue;
     const match=/^([0-9]{1,5})\/([a-zA-Z0-9_-]{1,48})\.(png|jpg|jpeg|webp)$/i.exec(path);
     if(!match)throw Error('ZIP бүтэц буруу: '+path+' (жишээ: 1/001.png)');
     const chapter=Number(match[1]),extension=match[3].toLowerCase();
     if(chapter<1||chapter>99999)throw Error('Бүлгийн дугаар буруу: '+path);
     if(!groups.has(chapter))groups.set(chapter,[]);
     groups.get(chapter).push({path,entry,extension,mime:allowed[extension]});
   }
   const count=[...groups.values()].reduce((n,a)=>n+a.length,0);
   let totalUncompressed=0;
   for(const group of groups.values())for(const item of group){
     const size=Number(item.entry?._data?.uncompressedSize);
     if(!Number.isFinite(size)||size<1||size>maxPage)
       throw Error('Зургийн хэмжээ буруу эсвэл 10 MB-аас их: '+item.path);
     totalUncompressed+=size;
   }
   if(totalUncompressed>240*1024*1024)
     throw Error('ZIP доторх нийт зураг 240 MB-аас их.');
   if(count<1||count>maxFiles)throw Error('ZIP дотор 1–320 зураг байх ёстой.');
   for(const [chapter,files] of groups){
     files.sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}));
     if(files.length>80)throw Error('Бүлэг '+chapter+': 80-аас олон зураг байна.');
   }
   return groups;
 }
 try{
   sb=await window.RRCatalog.client();
   if(!sb)throw Error('Supabase холболт байхгүй');
   const [user,admin]=await Promise.all([sb.auth.getUser(),sb.rpc('is_admin')]);
   if(user.error||!user.data?.user||admin.error||admin.data!==true){
     notice.textContent='Энэ боломж зөвхөн админд нээлттэй.';return;
   }
   const mangas=await sb.from('catalog_manga').select('id,title').order('title');
   if(mangas.error)throw mangas.error;
   for(const m of mangas.data||[]){
     const option=document.createElement('option');option.value=m.id;option.textContent=m.title;picker.append(option);
   }
   $('#bulkPanel').hidden=false;
   notice.textContent='Зурагтай ZIP: 1/001.png, 1/002.png, 2/001.png… (80 MB хүртэл).';
 }catch(e){notice.textContent='ZIP upload бэлэн биш: '+e.message;return}
 button.onclick=async()=>{
   if(processing)return;
   const zipFile=$('#bulkZip').files?.[0],id=picker.value;
   if(!id||!zipFile){notice.textContent='Манга болон ZIP файлаа сонгоно уу.';return}
   if(zipFile.size<1||zipFile.size>maxArchive){notice.textContent='ZIP хэмжээ 80 MB-аас бага байх ёстой.';return}
   if(typeof JSZip==='undefined'){notice.textContent='ZIP сан ачаалагдсангүй. Интернэтээ шалгана уу.';return}
   processing=true;button.disabled=true;const uploaded=[];
   try{
     const archive=await JSZip.loadAsync(zipFile);
     const groups=parseEntries(archive);
     const remote=await sb.from('catalog_manga').select('id,chapters,updated_at').eq('id',id).single();
     if(remote.error)throw remote.error;
     const oldChapters=Array.isArray(remote.data.chapters)?remote.data.chapters:[];
     if(oldChapters.length+groups.size>200)throw Error('200-аас олон бүлэг болохоор байна.');
     const replacements=[...groups.keys()].filter(n=>oldChapters.some(c=>Number(c.n)===n));
     if(replacements.length&&!confirm('Одоо байгаа '+replacements.join(', ')+' дугаартай бүлгүүдийн зургийг солих уу?'))return;
     const next=oldChapters.filter(c=>!groups.has(Number(c.n)));
     const batch=crypto.randomUUID();
     for(const [chapter,files] of [...groups].sort((a,b)=>a[0]-b[0])){
       const urls=[];
       for(let i=0;i<files.length;i++){
         const item=files[i];
         // Decompress only one entry at a time and enforce each uncompressed size.
         const blob=await item.entry.async('blob');
         if(blob.size<1||blob.size>maxPage)throw Error(item.path+' зураг 10 MB-аас хэтэрсэн эсвэл хоосон.');
         const path='manga/'+id+'/chapters/'+chapter+'/zip-'+batch+'-'+String(i+1).padStart(3,'0')+'.'+item.extension;
         const result=await sb.storage.from('manga-assets').upload(path,blob,{contentType:item.mime,upsert:false});
         if(result.error)throw result.error;
         uploaded.push(path);
         const url=sb.storage.from('manga-assets').getPublicUrl(path).data.publicUrl;
         urls.push(url);
         notice.textContent='Бүлэг '+chapter+' · '+(i+1)+'/'+files.length+' зураг байршуулсан';
       }
       const previous=oldChapters.find(c=>Number(c.n)===chapter);
       next.push({n:chapter,title:previous?.title||'',date:previous?.date||new Date().toISOString().slice(0,10),pages:{urls}});
     }
     next.sort((a,b)=>Number(a.n)-Number(b.n));
     const save=await sb.from('catalog_manga').update({chapters:next}).eq('id',id)
       .eq('updated_at',remote.data.updated_at).select('id').maybeSingle();
     if(save.error)throw save.error;
     if(!save.data)throw Error('Манга өөр төхөөрөмжөөс шинэчлэгдсэн байна. Хуудсыг дахин ачаалаад оролдоно уу.');
     notice.textContent='ZIP-ээс '+groups.size+' бүлэг хадгаллаа. Зураг амжилттай нийтлэгдсэн.';
   }catch(e){
     notice.textContent='ZIP upload алдаа: '+e.message;
     if(uploaded.length){
       const result=await sb.storage.from('manga-assets').remove(uploaded);
       if(result.error)notice.textContent+=' Өмнөх байршуулсан зургуудыг цэвэрлэж чадсангүй.';
     }
   }finally{processing=false;button.disabled=false}
 };
})();