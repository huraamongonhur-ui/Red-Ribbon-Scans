/* Red Ribbon Scans — My Library 2.0 page, never reads other users' lists. */
(async () => {
  const $ = s => document.querySelector(s);
  const message = $('#myLibraryMessage');
  const panel = $('#myLibraryPanel');
  const catalogue = new Map();
  const recent = new Map();
  let sb = null, store = null, tab = 'all', currentId = null;

  const tell = text => { message.textContent = text; };
  const getLocalFavorites = () => {
    try {
      const values=JSON.parse(localStorage.getItem('rr_favs')||'[]');
      return Array.isArray(values) ? [...new Set(values.filter(id=>typeof id==='string'))] : [];
    } catch {return [];}
  };
  const sel = (name,text,value) => {
    const element = document.createElement('option');
    element.value=value;element.textContent=text;return element;
  };

  function render() {
    if (!store || !store.isSignedIn()) {
      panel.hidden = true;
      $('#myLibraryUser').textContent = 'Нэвтрээгүй';
      tell('Миний санг ашиглахын тулд эхлээд нэвтэрнэ үү.');
      if (!message.querySelector('a')) {
        const link = document.createElement('a');
        link.href='index.html';link.className='btn primary my-library-login';
        link.textContent='Нэвтрэх хуудас руу очих →';
        message.append(document.createTextNode(' '),link);
      }
      return;
    }
    if (!store.isReady()) {
      panel.hidden = true;
      tell(store.getError()
        ? 'My Library өгөгдөл ачаалж чадсангүй. my_library_2.sql-г Supabase дээр ажиллуулсан эсэхийг шалгана уу.'
        : 'Хувийн жагсаалт ачаалж байна…');
      return;
    }
    panel.hidden=false;
    const counts = store.getCounts();
    const allMangaIds = new Set([...store.getEntries().map(item => item.id), ...store.getFavoriteIds()]);
    $('#myCountAll').textContent=String(allMangaIds.size);
    $('#myCountReading').textContent=String(counts.reading);
    $('#myCountCompleted').textContent=String(counts.completed);
    $('#myCountPlanned').textContent=String(counts.planned);
    $('#myCountFavorites').textContent=String(store.getFavoriteCount());
    tell(store.isFavoritesReady()
      ? 'Жагсаалт болон зүрхэлсэн манганууд аккаунттай синк хийгдэнэ.'
      : 'Ангиллууд ажиллаж байна. Зүрхэлсэн мангануудаа синк хийхийн тулд favorites_cloud.sql-г Supabase дээр Run хийнэ үү.');
    const localFavs = getLocalFavorites().filter(id => !store.isFavorite(id) && catalogue.has(id));
    $('#myLibraryImport').hidden = !store.isFavoritesReady() || !localFavs.length;
    $('#myLibraryTabs').querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.tab === tab));
    });

    const filter = $('#myLibrarySearch').value.trim().toLocaleLowerCase();
    const ids = new Set([...store.getEntries().map(x=>x.id),...store.getFavoriteIds()]);
    const entries = [...ids].map(id => ({
      id, status:store.getStatus(id), favorite:store.isFavorite(id)
    }))
      .filter(item => tab==='all' || (tab==='favorites' ? item.favorite : item.status===tab))
      .filter(item => (catalogue.get(item.id)?.title || item.id).toLocaleLowerCase().includes(filter))
      .sort((a,b) => (catalogue.get(a.id)?.title || a.id).localeCompare(catalogue.get(b.id)?.title || b.id,'mn'));
    const grid = $('#myLibraryGrid');
    grid.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className='my-library-empty';
      empty.textContent = filter ? 'Хайлтанд тохирох манга алга.' :
        tab === 'all' ? 'Одоохондоо жагсаалт хоосон байна. Манга цуглуулгаас эхний мангагаа нэмээрэй.' :
        'Энэ ангилалд одоогоор манга алга.';
      grid.append(empty);
      return;
    }
    for (const item of entries) {
      const manga = catalogue.get(item.id);
      const card = document.createElement('article');
      card.className='my-library-card';

      const cover = document.createElement('div');
      cover.className='my-library-cover';
      if (manga?.cover) {
        const img = document.createElement('img');
        img.src = manga.cover.replace(/^\/+/, '');
        img.alt = '';
        img.loading='lazy';
        img.onerror = () => img.remove();
        cover.append(img);
      }
      const information = document.createElement('div');
      information.className='my-library-info';
      const title=document.createElement('h2');
      title.textContent=manga?.title || item.id;
      const sub=document.createElement('p');
      sub.textContent=manga ? manga.chapters.length+' бүлэг' : 'Энэ манга одоогоор каталогоос олдохгүй байна.';
      information.append(title,sub);
      const label=document.createElement('label');
      label.className='my-library-label';
      label.textContent='Миний жагсаалт';
      const select=document.createElement('select');
      select.setAttribute('aria-label',(manga?.title || item.id)+' — жагсаалтын ангилал');
      for(const [value,heading] of Object.entries(window.RRMyLibrary.labels)) {
        select.append(sel('status',heading,value));
      }
      select.prepend(sel('status','Ангилал сонгох…',''));

      select.value=item.status;
      select.onchange=async () => {
        const previous=item.status;
        select.disabled=true;
        try { await store.setStatus(item.id,select.value); }
        catch(error) { alert('Хадгалж чадсангүй: '+(error?.message||'Алдаа')); select.value=previous; }
        finally { select.disabled=false; }
      };
      label.append(select);
      information.append(label);
      const heart = document.createElement('button');
      heart.type='button';
      heart.className='my-library-favorite'+(item.favorite?' is-favorite':'');
      heart.textContent=item.favorite?'♥ Хайртаас хасах':'♡ Хайртад нэмэх';
      heart.setAttribute('aria-pressed',String(item.favorite));
      heart.onclick=async()=>{
        heart.disabled=true;
        try { await store.setFavorite(item.id,!store.isFavorite(item.id)); }
        catch(error){ alert('Зүрхлэхэд алдаа гарлаа: '+(error?.message||'Алдаа'));heart.disabled=false; }
      };
      information.append(heart);
      const last = recent.get(item.id);
      const chapter = last?.chapter || manga?.chapters?.[0]?.n;
      if (manga && chapter != null) {
        const a = document.createElement('a');
        a.className='btn primary my-library-read';
        a.href='reader.html?m='+encodeURIComponent(item.id)+'&c='+encodeURIComponent(chapter);
        a.textContent=last ? 'Үргэлжлүүлж унших →' : 'Унших →';
        information.append(a);
      }
      card.append(cover,information);
      grid.append(card);
    }
  }

  async function loadRecent(uid) {
    const result=await sb.from('reading_history')
      .select('manga_id,chapter,read_at').eq('user_id',uid)
      .order('read_at',{ascending:false}).limit(1000);
    if (currentId !== uid || result.error) return;
    recent.clear();
    for(const item of result.data || []) {
      if (!recent.has(item.manga_id)) recent.set(item.manga_id,item);
    }
    render();
  }

  async function signedIn(session) {
    const uid=session?.user?.id || null;
    if (uid !== currentId) {
      currentId=uid;
      recent.clear();
      $('#myLibraryUser').textContent=session?.user?.user_metadata?.username ||
        session?.user?.email || 'Миний аккаунт';
      await store.setSession(session);
      if (uid) loadRecent(uid).catch(() => {});
    }
    render();
  }

  const picker = $('#addMangaDialog');
  const pickerSearch = $('#addMangaSearch');
  const pickerStatus = $('#addMangaStatus');
  $('#myLibraryAdd').onclick = () => {
    pickerSearch.value = '';
    renderPicker();
    if (!picker.open) picker.showModal();
    pickerSearch.focus();
  };
  $('#addMangaClose').onclick = () => picker.close();
  picker.addEventListener('click',event => {if(event.target===picker)picker.close();});
  pickerSearch.oninput=renderPicker;

  function renderPicker() {
    const box=$('#addMangaResults');
    box.replaceChildren();
    const q=pickerSearch.value.trim().toLocaleLowerCase();
    const candidates=[...catalogue.values()]
      .filter(m=>m.chapters?.length && m.title.toLocaleLowerCase().includes(q))
      .sort((a,b)=>a.title.localeCompare(b.title,'mn'))
      .slice(0,40);
    pickerStatus.textContent=candidates.length
      ? 'Манга сонгоод ангиллаа өөрчлөх эсвэл зүрхэлж болно.'
      : 'Тохирох манга алга.';
    for(const manga of candidates){
      const row=document.createElement('div');
      row.className='my-library-picker-row';
      const text=document.createElement('div');
      text.className='my-library-picker-title';
      const name=document.createElement('strong');
      name.textContent=manga.title;
      const info=document.createElement('small');
      info.textContent=manga.chapters.length+' бүлэг';
      text.append(name,info);
      const actions=document.createElement('div');
      actions.className='my-library-picker-actions';
      const select=document.createElement('select');
      select.setAttribute('aria-label',manga.title+' — жагсаалт');
      select.append(sel('status','Ангилалгүй',''));
      for(const [value,title] of Object.entries(window.RRMyLibrary.labels)){
        select.append(sel('status',title,value));
      }
      select.value=store?.getStatus(manga.id)||'';
      select.onchange=async()=>{
        select.disabled=true;
        try {
          await store.setStatus(manga.id,select.value);
          pickerStatus.textContent='Жагсаалт хадгалагдлаа.';
        } catch(error){
          select.value=store.getStatus(manga.id)||'';
          pickerStatus.textContent='Хадгалж чадсангүй: '+(error?.message||'Алдаа');
        } finally{select.disabled=false;}
      };
      const heart=document.createElement('button');
      heart.type='button';heart.className='btn my-library-picker-heart';
      const refresh=()=>{
        heart.textContent=store.isFavorite(manga.id)?'♥':'♡';
        heart.setAttribute('aria-pressed',String(store.isFavorite(manga.id)));
        heart.title=store.isFavorite(manga.id)?'Хайртаас хасах':'Хайртад нэмэх';
      };
      refresh();
      heart.onclick=async()=>{
        heart.disabled=true;
        try {
          await store.setFavorite(manga.id,!store.isFavorite(manga.id));
          refresh();
          pickerStatus.textContent='Зүрхний сонголт хадгалагдлаа.';
        }catch(error){pickerStatus.textContent='Зүрхлэхэд алдаа: '+(error?.message||'Алдаа');}
        finally{heart.disabled=false;}
      };
      actions.append(select,heart);
      row.append(text,actions);box.append(row);
    }
  }

  $('#myLibraryImport').onclick=async()=>{
    const local=getLocalFavorites().filter(id=>catalogue.has(id) && !store.isFavorite(id));
    if(!local.length)return;
    if(!confirm(local.length+' ширхэг энэ төхөөрөмжийн зүрхэлсэн мангыг одоогийн аккаунтад нэмэх үү?'))return;
    const button=$('#myLibraryImport');button.disabled=true;
    let succeeded=0;
    try {
      for(const id of local){
        await store.setFavorite(id,true);
        succeeded++;
      }
      tell(succeeded+' зүрхэлсэн манга аккаунттай синк хийгдлээ. Хуучин жагсаалт энэ төхөөрөмж дээр хэвээр байна.');
    }catch(error){
      tell(succeeded+' манга импортлогдлоо, цааш үргэлжлүүлэхэд алдаа гарлаа: '+(error?.message||'Алдаа'));
    }finally{button.disabled=false;}
  };

  $('#myLibraryTabs').onclick=event => {
    const button=event.target.closest('[data-tab]');
    if (!button) return;
    tab=button.dataset.tab;render();
  };
  $('#myLibrarySearch').oninput=render;
  window.addEventListener('rr-library-change',()=>{render();if(picker.open)renderPicker()});

  try {
    sb=await window.RRCatalog.client();
    if (!sb) throw Error('Supabase тохиргоо олдсонгүй');
    store=window.RRMyLibrary.create(sb);
    const [sessionResult,allManga]=await Promise.all([
      sb.auth.getSession(),
      window.RRCatalog.load()
    ]);
    for(const manga of allManga)catalogue.set(manga.id,manga);
    sb.auth.onAuthStateChange((_event,session) => {
      // Never await Supabase calls within the auth listener.
      setTimeout(() => signedIn(session).catch(error => tell(error.message)),0);
    });
    if (sessionResult.error) throw sessionResult.error;
    await signedIn(sessionResult.data.session);
  } catch(error) {
    panel.hidden=true;
    tell('Миний сан нээгдсэнгүй: '+(error?.message || 'Тодорхойгүй алдаа'));
  }
})();
