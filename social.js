(() => {
  const U = window.SUPABASE_URL, K = window.SUPABASE_KEY;
  if (!U || U.includes('PASTE') || !window.supabase) return;
  const sb = supabase.createClient(U, K);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isReader = document.body.classList.contains('reader');
  let session = null, signup = false, isAdmin = false;

  // ---- нэвтрэх цонх ----
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form id="af"><h2 id="at">Нэвтрэх</h2>
    <label id="ul" hidden>Хэрэглэгчийн нэр<input id="au" maxlength="24" autocomplete="nickname"></label>
    <label>Имэйл<input id="ae" type="email" required autocomplete="email"></label>
    <label>Нууц үг<input id="ap" type="password" minlength="6" required autocomplete="current-password"></label>
    <p id="am" class="msg" role="status"></p>
    <div class="row"><button class="btn primary" id="as">Нэвтрэх</button><button class="btn" type="button" id="ax">Хаах</button></div>
    <button class="lnk" type="button" id="aw">Бүртгэлгүй юу? Бүртгүүлэх</button></form>`;
  document.body.append(dlg);
  const setMode = s => {
    signup = s;
    $('#at', dlg).textContent = s ? 'Бүртгүүлэх' : 'Нэвтрэх';
    $('#as', dlg).textContent = s ? 'Бүртгүүлэх' : 'Нэвтрэх';
    $('#aw', dlg).textContent = s ? 'Бүртгэлтэй юу? Нэвтрэх' : 'Бүртгэлгүй юу? Бүртгүүлэх';
    $('#ul', dlg).hidden = !s;
    $('#am', dlg).textContent = '';
  };
  const openLogin = () => { setMode(false); dlg.showModal(); };
  $('#aw', dlg).onclick = () => setMode(!signup);
  $('#ax', dlg).onclick = () => dlg.close();
  $('#af', dlg).onsubmit = async e => {
    e.preventDefault();
    const msg = $('#am', dlg), email = $('#ae', dlg).value.trim(), password = $('#ap', dlg).value;
    msg.textContent = 'Түр хүлээнэ үү...';
    if (signup) {
      const username = $('#au', dlg).value.trim();
      if (username.length < 2) { msg.textContent = 'Хэрэглэгчийн нэр 2-24 тэмдэгттэй байна.'; return; }
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
      if (error) { msg.textContent = 'Алдаа: ' + error.message; return; }
      if (!data.session) { msg.textContent = 'Имэйлээ шалгаж, баталгаажуулах холбоос дээр дарна уу.'; return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { msg.textContent = 'Имэйл эсвэл нууц үг буруу байна.'; return; }
    }
    dlg.close();
  };

  // ---- толгой хэсгийн товч ----
  const acct = document.createElement('button');
  acct.className = 'btn acct'; acct.type = 'button';
  (isReader ? $('.bar') : $('header .header-actions')).append(acct);
  acct.onclick = () => session ? sb.auth.signOut() : openLogin();
  const renderAcct = () => {
    acct.textContent = session ? `${session.user.user_metadata?.username || 'Хэрэглэгч'}${isAdmin ? ' (админ)' : ''}, гарах` : 'Нэвтрэх';
  };

  // ---- үнэлгээний дундаж (нүүр хуудас) ----
  async function loadRatings() {
    const { data } = await sb.from('manga_ratings').select('*');
    window.RR = {};
    (data || []).forEach(r => { window.RR[r.manga_id] = Number(r.avg).toFixed(1); });
    if (typeof draw === 'function') draw();
  }

  // ---- reader: үнэлгээ ба сэтгэгдэл ----
  let box;
  function ready() {
    if (typeof m !== 'undefined' && m && typeof ch !== 'undefined' && ch) {
      box = document.createElement('section');
      box.className = 'wrap social';
      $('#end').after(box);
      drawSocial();
    } else setTimeout(ready, 150);
  }
  const when = d => new Date(d).toLocaleDateString('mn-MN');

  async function drawSocial() {
    const mid = m.id, cn = String(ch.n);
    const { data: sum } = await sb.from('manga_ratings').select('*').eq('manga_id', mid).maybeSingle();
    const avg = sum ? `Дундаж үнэлгээ: ★ ${Number(sum.avg).toFixed(1)} (${sum.n} хүн)` : 'Одоогоор үнэлгээ алга.';
    if (!session) {
      box.innerHTML = `<h2>Сэтгэгдэл ба үнэлгээ</h2><p>${avg}</p>
        <p>Сэтгэгдэл, үнэлгээг унших, бичихийн тулд нэвтэрнэ үү.</p>
        <button class="btn primary" id="lg" type="button">Нэвтрэх</button>`;
      $('#lg', box).onclick = openLogin;
      return;
    }
    const uid = session.user.id;
    const [rv, cm] = await Promise.all([
      sb.from('reviews').select('id,rating,body,created_at,user_id,profiles(username)').eq('manga_id', mid).order('created_at', { ascending: false }).limit(50),
      sb.from('comments').select('id,body,created_at,user_id,profiles(username)').eq('manga_id', mid).eq('chapter', cn).order('created_at', { ascending: false }).limit(100)
    ]);
    const mine = (rv.data || []).find(r => r.user_id === uid);
    const item = (x, extra = '') => `<article class="cm"><b>${esc(x.profiles?.username || 'Хэрэглэгч')}</b> <small>${when(x.created_at)}</small>${extra}<p>${esc(x.body)}</p></article>`;
    box.innerHTML = `<h2>Үнэлгээ</h2><p>${avg}</p>
      <form id="rf"><select id="rr" aria-label="Од">${[5, 4, 3, 2, 1].map(n => `<option value="${n}"${mine && mine.rating === n ? ' selected' : ''}>${'★'.repeat(n)} ${n}</option>`).join('')}</select>
      <textarea id="rb" maxlength="1000" placeholder="Манга тухай санал (заавал биш)">${mine ? esc(mine.body) : ''}</textarea>
      <button class="btn primary">Үнэлгээ хадгалах</button></form>
      <div>${(rv.data || []).filter(r => r.body).map(r => item(r, ` <small>★ ${r.rating}</small>${isAdmin ? ` <button class="lnk" data-delr="${r.id}" type="button">Устгах</button>` : ''}`)).join('')}</div>
      <h2>Сэтгэгдэл</h2>
      <form id="cf"><textarea id="cb" maxlength="1000" required placeholder="Сэтгэгдэл бичих"></textarea><button class="btn primary">Илгээх</button></form>
      <p id="sm" class="msg" role="status"></p>
      <div>${(cm.data || []).length ? cm.data.map(c => item(c, c.user_id === uid || isAdmin ? ` <button class="lnk" data-del="${c.id}" type="button">Устгах</button>` : '')).join('') : '<p class="meta">Энэ бүлэгт сэтгэгдэл алга. Эхний сэтгэгдлийг та бичээрэй.</p>'}</div>`;
    const sm = $('#sm', box);
    $('#rf', box).onsubmit = async e => {
      e.preventDefault();
      const { error } = await sb.from('reviews').upsert({ user_id: uid, manga_id: mid, rating: +$('#rr', box).value, body: $('#rb', box).value.trim() }, { onConflict: 'user_id,manga_id' });
      if (error) { sm.textContent = 'Хадгалж чадсангүй: ' + error.message; return; }
      drawSocial();
    };
    $('#cf', box).onsubmit = async e => {
      e.preventDefault();
      const body = $('#cb', box).value.trim();
      if (!body) return;
      const { error } = await sb.from('comments').insert({ user_id: uid, manga_id: mid, chapter: cn, body });
      if (error) { sm.textContent = 'Илгээж чадсангүй: ' + error.message; return; }
      drawSocial();
    };
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      await sb.from('comments').delete().eq('id', b.dataset.del);
      drawSocial();
    });
    box.querySelectorAll('[data-delr]').forEach(b => b.onclick = async () => {
      await sb.from('reviews').delete().eq('id', b.dataset.delr);
      drawSocial();
    });
  }

  // ---- эхлүүлэх ----
  let started = false;
  sb.auth.onAuthStateChange((_ev, s) => {
    session = s;
    renderAcct();
    setTimeout(async () => {
      isAdmin = s ? !!(await sb.rpc('is_admin')).data : false;
      renderAcct();
      if (!started) {
        started = true;
        if (isReader) ready(); else loadRatings();
      } else if (isReader && box) drawSocial();
    }, 0);
  });
})();
