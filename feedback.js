/* Authenticated user request/report form. All database access goes through RLS. */
(async()=>{
 const $=s=>document.querySelector(s),notice=$('#feedbackNotice');
 const params=new URLSearchParams(location.search);
 const isReport=params.get('kind')==='report';
 $('#feedbackKind').value=isReport?'page_report':'manga_request';
 $('#feedbackManga').value=(params.get('m')||'').slice(0,120);
 $('#feedbackChapter').value=(params.get('c')||'').slice(0,32);
 const page=Number(params.get('p'));
 if(Number.isInteger(page)&&page>=1&&page<=10000)$('#feedbackPage').value=String(page);
 const updateKind=()=>{
   const show=$('#feedbackKind').value==='page_report';
   document.querySelectorAll('.feedback-chapter').forEach(el=>el.hidden=!show);
 };
 $('#feedbackKind').onchange=updateKind;updateKind();
 let sb,uid;
 const showMine=async()=>{
   if(!uid)return;
   const {data,error}=await sb.from('reader_submissions')
      .select('id,kind,manga_title,manga_id,status,admin_note,created_at')
      .eq('user_id',uid).order('created_at',{ascending:false}).limit(40);
   const box=$('#mySubmissions');box.replaceChildren();
   if(error){box.textContent='Хүсэлтүүдийг уншиж чадсангүй. community_3.sql-г ажиллуулсан эсэхийг шалгана уу.';return}
   if(!data?.length){box.textContent='Одоогоор хүсэлт алга.';return}
   for(const item of data){
     const row=document.createElement('article');row.className='feature-ticket';
     const name=document.createElement('strong');name.textContent=(item.kind==='manga_request'?'Манга хүсэлт: ':'Алдаа: ')+(item.manga_title||item.manga_id||'#'+item.id);
     const status=document.createElement('small');status.textContent='Төлөв: '+item.status+' · '+new Date(item.created_at).toLocaleDateString('mn-MN');
     row.append(name,status);
     if(item.admin_note){const note=document.createElement('p');note.textContent='Админы тайлбар: '+item.admin_note;row.append(note)}
     box.append(row);
   }
 };
 try{
   sb=await window.RRCatalog.client();
   if(!sb)throw Error('Supabase тохиргоо олдсонгүй');
   const {data:{user},error}=await sb.auth.getUser();
   if(error||!user){notice.textContent='Хүсэлт илгээх, өөрийн хүсэлтээ харахын тулд эхлээд нүүр хуудсаар нэвтэрнэ үү.';return}
   uid=user.id;$('#feedbackForm').hidden=false;
   notice.textContent='Нэвтэрсэн: '+(user.email||'Хэрэглэгч');
   await showMine();
 }catch(error){notice.textContent='Холболтын алдаа: '+error.message;return}
 $('#refreshSubmissions').onclick=showMine;
 $('#feedbackForm').onsubmit=async event=>{
   event.preventDefault();
   const button=$('#feedbackSubmit');button.disabled=true;
   const kind=$('#feedbackKind').value,request=kind==='manga_request';
   const title=$('#feedbackTitle').value.trim(),mangaId=$('#feedbackManga').value.trim();
   const message=$('#feedbackMessage').value.trim();
   const page=$('#feedbackPage').value.trim()?Number($('#feedbackPage').value):null;
   if(message.length<10||message.length>1000||(request&&!title)||
      (!request&&!mangaId&&!title)||
      (!request&&page!==null&&(!Number.isInteger(page)||page<1||page>10000))){
     notice.textContent='Нэр, бүлэг болон тайлбараа шалгана уу.';button.disabled=false;return;
   }
   const payload={user_id:uid,kind,manga_title:title,manga_id:mangaId,
     chapter:request?'':$('#feedbackChapter').value.trim(),
     page_number:request?null:page,message};
   try{
     const {error}=await sb.from('reader_submissions').insert(payload);
     if(error)throw error;
     notice.textContent='Хүсэлт илгээгдлээ. Админ хянасны дараа төлөв шинэчлэгдэнэ.';
     $('#feedbackMessage').value='';await showMine();
   }catch(error){notice.textContent='Илгээхэд алдаа: '+error.message}
   finally{button.disabled=false}
 };
})();