/* Admin Dashboard 3.0 — submissions and editorial queue, guarded by is_admin() and RLS. */
(async()=>{
 const $=s=>document.querySelector(s),notice=$('#workflowNotice'),wrapper=$('#workflowPanel');
 if(!wrapper)return;
 const stageLabels={planned:'Төлөвлөсөн',translating:'Орчуулж байна',editing:'Редактор хянаж байна',
   ready:'Нийтлэхэд бэлэн',published:'Нийтлэгдсэн',paused:'Түр зогссон'};
 const statusLabels={new:'Шинэ',reviewing:'Хянаж байна',approved:'Зөвшөөрсөн',resolved:'Шийдвэрлэсэн',rejected:'Татгалзсан'};
 const select=(values,selected)=>{
   const control=document.createElement('select');
   for(const [id,label] of Object.entries(values)){
     const option=document.createElement('option');option.value=id;option.textContent=label;control.append(option)
   }
   control.value=selected;return control;
 };
 const el=(tag,value)=>{const node=document.createElement(tag);node.textContent=String(value);return node;};
 let sb,working=false;
 const refresh=async()=>{
   if(working)return;
   const [ticketResult,workflowResult,mangaResult]=await Promise.all([
     sb.from('reader_submissions').select('id,kind,manga_title,manga_id,chapter,page_number,message,status,admin_note,created_at').order('created_at',{ascending:false}).limit(80),
     sb.from('manga_workflow').select('manga_id,stage,target_date,notes').order('updated_at',{ascending:false}).limit(100),
     sb.from('catalog_manga').select('id,title').order('title')
   ]);
   if(ticketResult.error||workflowResult.error||mangaResult.error){
     notice.textContent='Админ мэдээлэл ачаалагдсангүй. community_3.sql-г ажиллуулсан эсэхээ шалгана уу.';
     return;
   }
   const tickets=ticketResult.data||[],steps=workflowResult.data||[],mangas=mangaResult.data||[];
   $('#workflowCount').textContent=String(tickets.filter(t=>!['resolved','rejected'].includes(t.status)).length);
   const reports=$('#adminTickets');reports.replaceChildren();
   if(!tickets.length)reports.textContent='Хүсэлт, алдаа мэдээлэл одоохондоо алга.';
   for(const ticket of tickets){
     const row=document.createElement('article');row.className='workflow-ticket';
     row.append(el('strong',(ticket.kind==='page_report'?'Хуудасны алдаа':ticket.kind==='comment_report'?'Сэтгэгдлийн мэдээлэл':'Манга хүсэлт')+' #'+ticket.id),
       el('p',(ticket.manga_title||ticket.manga_id||'Нэргүй')+
         (ticket.chapter?' · Бүлэг '+ticket.chapter:'')+(ticket.page_number?' · Хуудас '+ticket.page_number:'')),
       el('p',ticket.message));
     const status=select(statusLabels,ticket.status),notes=document.createElement('textarea');
     notes.rows=2;notes.maxLength=1000;notes.value=ticket.admin_note||'';
     notes.setAttribute('aria-label','Админы тайлбар');
     const save=el('button','Төлөв хадгалах');save.type='button';save.className='btn primary';
     save.onclick=async()=>{
       save.disabled=true;
       const {error}=await sb.from('reader_submissions')
         .update({status:status.value,admin_note:notes.value.trim()}).eq('id',ticket.id);
       notice.textContent=error?'Хадгалж чадсангүй: '+error.message:'Хүсэлтийн төлөв шинэчлэгдлээ.';
       save.disabled=false;
       if(!error)refresh();
     };
     row.append(status,notes,save);reports.append(row);
   }
   const queue=$('#adminWorkflow');queue.replaceChildren();
   if(!mangas.length)queue.textContent='Онлайн манга алга. Эхлээд манга нэмнэ үү.';
   const byId=new Map(steps.map(s=>[s.manga_id,s]));
   for(const manga of mangas){
     const previous=byId.get(manga.id)||{stage:'planned',target_date:'',notes:''};
     const row=document.createElement('article');row.className='workflow-ticket';
     row.append(el('strong',manga.title));
     const stage=select(stageLabels,previous.stage),date=document.createElement('input');
     date.type='date';date.value=previous.target_date||'';
     date.setAttribute('aria-label',manga.title+' — зорилтот огноо');
     const notes=document.createElement('textarea');notes.rows=2;notes.maxLength=1000;
     notes.value=previous.notes||'';notes.setAttribute('aria-label',manga.title+' — төлөвлөгөө');
     const save=el('button','Төлөвлөгөө хадгалах');save.type='button';save.className='btn primary';
     save.onclick=async()=>{
       save.disabled=true;
       const record={manga_id:manga.id,stage:stage.value,target_date:date.value||null,notes:notes.value.trim()};
       const {error}=await sb.from('manga_workflow').upsert(record,{onConflict:'manga_id'});
       notice.textContent=error?'Төлөвлөгөө хадгалах алдаа: '+error.message:'Ажлын төлөвлөгөө хадгалагдлаа.';
       save.disabled=false;
     };
     row.append(stage,date,notes,save);queue.append(row);
   }
 };
 $('#workflowRefresh').onclick=refresh;
 try{
   sb=await window.RRCatalog.client();
   if(!sb)throw Error('Supabase тохиргоо олдсонгүй');
   const {data:{user},error}=await sb.auth.getUser();
   if(error||!user){notice.textContent='Админ эрхтэй аккаунтаар нэвтэрнэ үү.';return}
   const check=await sb.rpc('is_admin');
   if(check.error||check.data!==true){notice.textContent='Админ эрх байхгүй.';return}
   wrapper.hidden=false;
   notice.textContent='Хүсэлт болон редакцийн ажлын төлөв.';
   await refresh();
 }catch(error){notice.textContent='Админ самбарын алдаа: '+error.message}
})();