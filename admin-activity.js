/* Admin Activity Log: read-only client; actual entries written by database triggers. */
(async()=>{
 const $=s=>document.querySelector(s),notice=$('#adminAuditNotice'),target=$('#adminAuditRows');
 if(!target)return;
 try{
   const sb=await window.RRCatalog.client();if(!sb)throw Error('Supabase тохиргоо байхгүй');
   const {data:{user}}=await sb.auth.getUser();
   const permission=await sb.rpc('is_admin');
   if(!user||permission.error||permission.data!==true){notice.textContent='Зөвхөн админ харах эрхтэй.';return}
   $('#adminAuditPanel').hidden=false;
   const refresh=async()=>{
     notice.textContent='Өөрчлөлтийн түүх ачаалж байна…';
     const {data,error}=await sb.from('admin_activity_log')
       .select('id,actor,event,manga_id,recorded_at')
       .order('recorded_at',{ascending:false}).limit(100);
     target.replaceChildren();
     if(error){notice.textContent='Log уншиж чадсангүй. next_10.sql-г шалгана уу.';return}
     if(!data?.length){notice.textContent='Одоогоор бүртгэл алга.';return}
     for(const log of data){
       const item=document.createElement('article');item.className='feature-ticket';
       const label=document.createElement('strong');
       label.textContent=log.event+' · '+(log.manga_id||'—');
       const secondary=document.createElement('small');
       secondary.textContent=new Date(log.recorded_at).toLocaleString('mn-MN')+' · '+(log.actor||'System');
       item.append(label,secondary);target.append(item);
     }
     notice.textContent='Сүүлийн '+data.length+' өөрчлөлт.';
   };
   $('#adminAuditRefresh').onclick=refresh;await refresh();
 }catch(e){notice.textContent='Activity Log алдаа: '+e.message}
})();