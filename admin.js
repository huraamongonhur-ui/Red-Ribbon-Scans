/* Red Ribbon Scans — Admin Dashboard 2.0.
   UI checks public.is_admin(), and RLS enforces permissions on all writes. */
(async () => {
  const $ = selector => document.querySelector(selector);
  const notice = $('#adminNotice');
  const panel = $('#adminPanel');
  const MAX_FILE = 10 * 1024 * 1024;
  const TYPES = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const MAX_CHAPTER_PAGES = 80;

  let sb, original = [], managed = [], current = null, activeId = null, saving = false;
  const errText = error => error?.message || 'Тодорхойгүй алдаа';
  const setText = (selector, value) => { $(selector).textContent = String(value); };
  const say = message => { notice.textContent = message; };
  const btn = (label, action, className = '') => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.className = 'btn ' + className;
    b.onclick = action;
    return b;
  };
  const count = async table => {
    const {count,error} = await sb.from(table).select('*',{count:'exact',head:true});
    return error ? '—' : String(count ?? 0);
  };
  const validateFile = f => {
    if (!f || !TYPES[f.type] || f.size < 1 || f.size > MAX_FILE) {
      throw Error('Зөвхөн 10 MB-аас бага JPG, PNG, WebP зураг оруулна уу.');
    }
  };
  const copy = value => typeof structuredClone === 'function'
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));

  async function upload(file, path) {
    validateFile(file);
    const uploaded = await sb.storage.from('manga-assets')
      .upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
    if (uploaded.error) throw uploaded.error;
    const {data} = sb.storage.from('manga-assets').getPublicUrl(path);
    if (!data?.publicUrl) throw Error('Зургийн public URL олдсонгүй');
    return data.publicUrl;
  }
  async function undoUploads(paths) {
    if (!paths.length) return;
    try { await sb.storage.from('manga-assets').remove(paths); }
    catch(error) { console.warn('Could not clean failed upload:',error); }
  }
  const mangaById = id => managed.find(m=>m.id===id) || original.find(m=>m.id===id);
  const isManaged = id => managed.some(m=>m.id===id);
  const combined = () => {
    const ids = new Set(managed.map(m=>m.id));
    return [...managed,...original.filter(m=>!ids.has(m.id))];
  };
  const getCover = id => mangaById(id)?.cover || '';

  function renderMangaList() {
    const search = $('#adminSearch').value.trim().toLocaleLowerCase();
    const items = combined().filter(m =>
      m.title.toLocaleLowerCase().includes(search) || m.id.includes(search));
    const box = $('#adminMangaList');
    box.replaceChildren();
    if (!items.length) { box.textContent = 'Манга олдсонгүй.'; return; }
    for (const manga of items) {
      const managedRow = isManaged(manga.id);
      const row = document.createElement('div'); row.className='admin-manga-row';
      if (manga.id === activeId) row.classList.add('selected');
      if (manga.cover) {
        const cover = document.createElement('img');
        cover.src = manga.cover; cover.alt = ''; cover.loading='lazy';
        cover.onerror = () => cover.remove(); row.append(cover);
      }
      const info = document.createElement('div'); info.className='admin-manga-info';
      const title = document.createElement('b'); title.textContent=manga.title;
      const desc = document.createElement('small');
      desc.textContent = (managedRow ? 'Онлайн' : 'GitHub') +
        ' · ' + manga.chapters.length + ' бүлэг · ' + manga.id;
      info.append(title,desc); row.append(info);
      const actions=document.createElement('div'); actions.className='admin-manga-actions';
      actions.append(btn('Харах',()=>selectManga(manga.id)));
      if (!managedRow) actions.append(btn('Импортлох',()=>importStatic(manga.id),'primary'));
      row.append(actions); box.append(row);
    }
  }

  function previewCover(value) {
    const box = $('#mangaCoverPreview');
    box.replaceChildren();
    if (!value) { box.hidden=true; return; }
    const image=document.createElement('img');
    image.src=value; image.alt='Нүүр зургийн урьдчилсан харагдац';
    image.onerror=()=>{box.hidden=true};
    box.append(image);box.hidden=false;
  }

  function resetMangaForm() {
    activeId=null;current=null;
    $('#mangaForm').reset();
    for (const el of ['#mangaTitle','#mangaGenres','#mangaCover']) $(el).disabled = false;
    $('#mangaId').readOnly=false;
    $('#mangaFormHeading').textContent='Шинэ манга нэмэх';
    $('#saveManga').disabled=false;
    $('#deleteManga').hidden=true;
    $('#mangaStatus').textContent='';
    previewCover('');
    $('#chapterPanel').hidden=true;
    $('#chapterHelp').hidden=false;
    renderMangaList();
  }

  function selectManga(id) {
    const manga=mangaById(id); if (!manga) return;
    activeId=id;current=copy(manga);
    const editable=isManaged(id);
    $('#mangaId').value=manga.id;
    $('#mangaId').readOnly=true;
    $('#mangaTitle').value=manga.title;
    $('#mangaGenres').value=(manga.genres||[]).join(', ');
    $('#mangaCover').value='';
    $('#mangaFormHeading').textContent=(editable?'Засах: ':'Импорт шаардана: ')+manga.title;
    $('#saveManga').disabled=!editable;
    $('#deleteManga').hidden=!editable;
    $('#mangaStatus').textContent=editable ? 'Онлайн манга: өөрчлөлт шууд нийтлэгдэнэ.' :
      'Энэ бол GitHub-ийн манга. Жагсаалтын «Импортлох» товчийг дарна уу.';
    for(const el of ['#mangaTitle','#mangaGenres','#mangaCover']) $(el).disabled=!editable;
    previewCover(getCover(id));
    $('#chapterPanel').hidden=!editable;
    $('#chapterHelp').hidden=editable;
    resetChapterForm();
    if(editable) renderChapterList();
    renderMangaList();
  }

  async function importStatic(id) {
    if (saving) return;
    const manga=original.find(m=>m.id===id);
    if (!manga || isManaged(id)) return;
    if (!confirm('"' + manga.title + '" мангаг Supabase-д хуулж, вебээс удирдах уу? GitHub файл хэвээр үлдэнэ.')) return;
    saving=true;say('Манга импортолж байна…');
    try {
      const {error}=await sb.from('catalog_manga').insert({
        id:manga.id,title:manga.title,genres:manga.genres||[],
        cover:manga.cover||'',chapters:manga.chapters||[]
      });
      if (error) throw error;
      await reload(id); say('Манга импортлогдлоо. Одоо бүлэг болон нүүр зургийг өөрчилж болно.');
    } catch(error) { say('Импорт алдаа: '+errText(error)); }
    finally {saving=false}
  }

  async function reload(selectId=null) {
    const [staticRows,liveRows]=await Promise.all([
      window.RRCatalog.staticManga(),window.RRCatalog.managedManga(sb)
    ]);
    original=staticRows;managed=liveRows;
    const all=combined();
    setText('#statManga',all.length);
    setText('#statChapters',all.reduce((sum,m)=>sum+m.chapters.length,0));
    renderMangaList();
    const [users,comments,reviews]=await Promise.all([
      count('profiles'),count('comments'),count('reviews')
    ]);
    setText('#statUsers',users);setText('#statComments',comments);setText('#statReviews',reviews);
    if (selectId && mangaById(selectId)) selectManga(selectId);
    else resetMangaForm();
  }

  function renderChapterList() {
    const target=$('#adminChapterList'); target.replaceChildren();
    if (!current) return;
    const chapters=[...current.chapters].sort((a,b)=>Number(a.n)-Number(b.n));
    if (!chapters.length) {
      const p=document.createElement('p');p.className='admin-tip';p.textContent='Бүлэг алга. Доорх формоор нэмнэ үү.';target.append(p);return;
    }
    for(const ch of chapters){
      const line=document.createElement('div');line.className='admin-chapter-row';
      const name=document.createElement('span');
      name.textContent='Бүлэг '+ch.n+(ch.title?' · '+ch.title:'');
      const editButton=btn('Засах',()=>editChapter(ch.n));
      line.append(name,editButton); target.append(line);
    }
  }

  function resetChapterForm() {
    $('#chapterForm').reset();
    $('#chapterNo').readOnly=false;
    $('#chapterStatus').textContent='';
    $('#deleteChapter').hidden=true;
  }

  function editChapter(n) {
    if(!current)return;
    const ch=current.chapters.find(x=>Number(x.n)===Number(n));if(!ch)return;
    $('#chapterNo').value=ch.n;$('#chapterNo').readOnly=true;
    $('#chapterTitle').value=ch.title||'';
    $('#chapterImages').value='';
    const p=ch.pages||{};
    const count=Array.isArray(p.urls)?p.urls.length:p.count||0;
    $('#chapterStatus').textContent=count+' зурагтай бүлэг. Шинэ зураг сонговол хуучин зургийн жагсаалтыг солино.';
    $('#deleteChapter').hidden=false;
  }

  $('#newManga').onclick=resetMangaForm;
  $('#adminSearch').oninput=renderMangaList;
  $('#resetChapter').onclick=resetChapterForm;

  $('#mangaForm').onsubmit=async event=>{
    event.preventDefault();if(saving)return;
    const id=$('#mangaId').value.trim().toLowerCase();
    const title=$('#mangaTitle').value.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id)||!title||title.length>160) {
      $('#mangaStatus').textContent='ID эсвэл нэр буруу байна.';return;
    }
    if (activeId && id!==activeId) {$('#mangaStatus').textContent='ID-г өөрчилж болохгүй.';return}
    if (!activeId && original.some(m=>m.id===id)) {
      $('#mangaStatus').textContent='Энэ ID GitHub-д байна. Эхлээд Импортлох товч дарна уу.';return;
    }
    const genreList=[...new Set($('#mangaGenres').value.split(',').map(x=>x.trim()).filter(Boolean))].slice(0,15);
    const file=$('#mangaCover').files?.[0];
    saving=true;$('#saveManga').disabled=true;
    const uploaded=[];
    try {
      let cover=current?.cover||'';
      if(file){
        validateFile(file);
        const path='manga/'+id+'/covers/'+crypto.randomUUID()+'.'+TYPES[file.type];
        cover=await upload(file,path);uploaded.push(path);
      }
      const record={id,title,genres:genreList,cover,chapters:current?.chapters||[]};
      const {error}=await sb.from('catalog_manga').upsert(record,{onConflict:'id'});
      if(error)throw error;
      await reload(id);
      $('#mangaStatus').textContent='Манга амжилттай хадгалагдлаа.';
      say('Манга хадгалагдлаа. Сайтын каталог автоматаар шинэчлэгдэнэ.');
    }catch(error){
      await undoUploads(uploaded);
      $('#mangaStatus').textContent='Хадгалж чадсангүй: '+errText(error);
    }finally{saving=false;$('#saveManga').disabled=false;}
  };

  $('#deleteManga').onclick=async ()=>{
    if(saving||!activeId||!isManaged(activeId))return;
    if(!confirm('"' + current.title + '" онлайн мангыг БҮРМӨСӨН устгах уу? Бүлгүүд ч каталогт харагдахаа болино.'))return;
    saving=true;
    const {error}=await sb.from('catalog_manga').delete().eq('id',activeId);
    if(error) say('Устгах алдаа: '+errText(error));
    else {
      await reload();
      say('Онлайн манга устлаа. Хэрэв GitHub эх файл байсан бол тэр манга дахин харагдана. Storage дахь зураг тусдаа үлдэнэ.');
    }
    saving=false;
  };

  $('#chapterForm').onsubmit=async event=>{
    event.preventDefault();
    if(saving||!current||!isManaged(current.id))return;
    const n=Number($('#chapterNo').value);
    const title=$('#chapterTitle').value.trim();
    if(!Number.isInteger(n)||n<1||n>99999||title.length>160){
      $('#chapterStatus').textContent='Бүлгийн дугаар эсвэл нэр буруу байна.';return;
    }
    const old=current.chapters.find(c=>Number(c.n)===n);
    const files=[...($('#chapterImages').files||[])];
    if(files.length>MAX_CHAPTER_PAGES){
      $('#chapterStatus').textContent='Нэг бүлэгт 80 хүртэл зураг оруулна.';return;
    }
    if(!old&&!files.length){
      $('#chapterStatus').textContent='Шинэ бүлэг нэмэхэд зураг сонгоно уу.';return;
    }
    if(old&&files.length&&!confirm('Бүлэг '+n+'-ийн одоогийн зургуудын жагсаалтыг шинээр солих уу?'))return;
    if(!old&&current.chapters.length>=200){
      $('#chapterStatus').textContent='Нэг мангад 200 хүртэл бүлэг оруулна.';return;
    }
    try {files.forEach(validateFile)}
    catch(error){$('#chapterStatus').textContent=errText(error);return;}
    files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
    saving=true;$('#saveChapter').disabled=true;
    const uploaded=[];
    try{
      let pages=old?.pages||{};
      if(files.length){
        const urls=[];
        for(let i=0;i<files.length;i++){
          $('#chapterStatus').textContent='Зураг байршуулж байна: '+(i+1)+' / '+files.length;
          const file=files[i];
          const path='manga/'+current.id+'/chapters/'+n+'/'+String(i+1).padStart(3,'0')+'-'+crypto.randomUUID()+'.'+TYPES[file.type];
          urls.push(await upload(file,path));
          uploaded.push(path);
        }
        pages={urls};
      }
      const next=copy(current.chapters).filter(c=>Number(c.n)!==n);
      next.push({n,title,date:old?.date||new Date().toISOString().slice(0,10),pages});
      next.sort((a,b)=>Number(a.n)-Number(b.n));
      const {error}=await sb.from('catalog_manga').update({chapters:next}).eq('id',current.id);
      if(error)throw error;
      await reload(current.id);
      $('#chapterStatus').textContent='Бүлэг '+n+' хадгалагдлаа.';
      say('Бүлэг нийтлэгдлээ. Манга уншигч дээр харагдана.');
    }catch(error){
      await undoUploads(uploaded);
      $('#chapterStatus').textContent='Алдаа: '+errText(error);
    }finally{saving=false;$('#saveChapter').disabled=false;}
  };

  $('#deleteChapter').onclick=async ()=>{
    if(saving||!current)return;
    const n=Number($('#chapterNo').value);
    if(!current.chapters.some(c=>Number(c.n)===n))return;
    if(!confirm('Бүлэг '+n+'-ийг сайтаас устгах уу? Storage зураг устахгүй.'))return;
    saving=true;
    const remaining=current.chapters.filter(c=>Number(c.n)!==n);
    const {error}=await sb.from('catalog_manga').update({chapters:remaining}).eq('id',current.id);
    if(error)$('#chapterStatus').textContent='Алдаа: '+errText(error);
    else {await reload(current.id);say('Бүлэг '+n+' каталогноос устлаа.');}
    saving=false;
  };

  try {
    sb=await window.RRCatalog.client();
    if(!sb)throw Error('Supabase тохиргоо холбогдоогүй байна.');
    const {data,error}=await sb.auth.getUser();
    if(error || !data?.user) {
      say('Админ самбарт орохын тулд эхлээд нүүр хуудсанд нэвтэрнэ үү.');
      const a=document.createElement('a');a.href='index.html';a.textContent='Нүүр хуудас → Нэвтрэх';a.className='btn primary';notice.append(' ',a);
      return;
    }
    const permission=await sb.rpc('is_admin');
    if(permission.error || permission.data!==true){
      say('Хандалт хаалттай. Энэ аккаунтад админ эрх байхгүй.');
      return;
    }
    $('#adminIdentity').textContent=data.user.user_metadata?.username||data.user.email||'Админ';
    panel.hidden=false;
    say('Админ эрх баталгаажлаа. Өөрчлөлтүүд Supabase-д шууд хадгалагдана.');
    await reload();
  }catch(error){
    say('Админ самбар ачаалагдсангүй: '+errText(error)+'. admin_2.sql-г ажиллуулсан эсэхийг шалгана уу.');
    console.error('[Red Ribbon] Admin Dashboard:',error);
  }
})();
