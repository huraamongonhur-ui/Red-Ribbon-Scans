/* Red Ribbon Scans — My Library 2.0 page, never reads other users' lists. */
(async () => {
  const $ = s => document.querySelector(s);
  const message = $('#myLibraryMessage');
  const panel = $('#myLibraryPanel');
  const catalogue = new Map();
  const recent = new Map();
  let sb = null, store = null, tab = 'all', currentId = null;

  const tell = text => { message.textContent = text; };
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
    $('#myCountAll').textContent=String(store.getEntries().length);
    $('#myCountReading').textContent=String(counts.reading);
    $('#myCountCompleted').textContent=String(counts.completed);
    $('#myCountPlanned').textContent=String(counts.planned);
    tell('Таны жагсаалт аккаунттай холбогдсон. Өөр төхөөрөмжөөс нэвтрэхэд мөн харагдана.');
    $('#myLibraryTabs').querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.tab === tab));
    });

    const filter = $('#myLibrarySearch').value.trim().toLocaleLowerCase();
    const entries = store.getEntries()
      .filter(item => (tab === 'all' || item.status === tab))
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
      select.append(sel('status','Жагсаалтаас хасах',''));
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

  $('#myLibraryTabs').onclick=event => {
    const button=event.target.closest('[data-tab]');
    if (!button) return;
    tab=button.dataset.tab;render();
  };
  $('#myLibrarySearch').oninput=render;
  window.addEventListener('rr-library-change',render);

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
