/* User Profile 2.0 — install profile_2.sql before using profile editing. */
(() => {
  const allowedEmojis = ['📚','🌸','🦊','🐱','🐼','🐉','⭐','🎮'];
  window.RRProfile = {
    create(sb, onUpdate = () => {}) {
      let session = null, profile = null, emoji = '📚', changedEmoji = false;
      let generation = 0, readCount = 0, commentCount = 0, reviewCount = 0;
      const dialog = document.createElement('dialog');
      dialog.className = 'profile-modal';
      dialog.setAttribute('aria-labelledby', 'profileTitle');
      dialog.innerHTML = "<div class=\"profile-top\">\n  <div><span class=\"profile-kicker\">RED RIBBON / ACCOUNT</span><h2 id=\"profileTitle\">Миний профайл<span class=\"heading-dot\">.</span></h2></div>\n  <button type=\"button\" class=\"profile-close\" id=\"profileClose\" aria-label=\"Хаах\">✕</button>\n</div>\n<div class=\"profile-overview\">\n  <div class=\"profile-avatar\" id=\"profileAvatar\" aria-label=\"Аватар\">📚</div>\n  <div class=\"profile-overview-text\">\n    <strong id=\"profileDisplayName\">Хэрэглэгч</strong>\n    <small id=\"profileJoined\"></small>\n    <p id=\"profileDisplayBio\">Танилцуулга нэмээрэй.</p>\n  </div>\n</div>\n<p class=\"profile-status\" id=\"profileStatus\" role=\"status\" aria-live=\"polite\">Ачаалж байна…</p>\n<div class=\"profile-stats\" aria-label=\"Хэрэглэгчийн статистик\">\n  <div><strong id=\"profileReadCount\">—</strong><span>Уншсан бүлэг</span></div>\n  <div><strong id=\"profileCommentCount\">—</strong><span>Сэтгэгдэл</span></div>\n  <div><strong id=\"profileReviewCount\">—</strong><span>Үнэлгээ</span></div>\n  <div><strong id=\"profileFavCount\">—</strong><span>Дуртай манга</span></div>\n</div>\n<section class=\"profile-section\" aria-labelledby=\"profileBadgeTitle\">\n  <h3 id=\"profileBadgeTitle\">Амжилтын тэмдэг</h3>\n  <div id=\"profileBadges\" class=\"profile-badges\"></div>\n</section>\n<section class=\"profile-section\" aria-labelledby=\"profileFavTitle\">\n  <div class=\"profile-section-heading\"><h3 id=\"profileFavTitle\">Миний дуртай манга</h3><small>Аккаунттай синк</small></div>\n  <div id=\"profileFavorites\" class=\"profile-favorites\"><p class=\"profile-muted\">Дуртай манга алга.</p></div>\n</section>\n<section class=\"profile-section\" aria-labelledby=\"profileEditTitle\">\n  <h3 id=\"profileEditTitle\">Профайлаа засах</h3>\n  <form id=\"profileForm\" class=\"profile-form\">\n    <label for=\"profileUsername\">Хэрэглэгчийн нэр</label>\n    <input id=\"profileUsername\" name=\"username\" minlength=\"2\" maxlength=\"24\" required autocomplete=\"nickname\">\n    <label for=\"profileBio\">Танилцуулга <small>(280 тэмдэгт хүртэл)</small></label>\n    <textarea id=\"profileBio\" name=\"bio\" maxlength=\"280\" rows=\"3\" placeholder=\"Өөрийгөө товч танилцуулаарай…\"></textarea>\n    <label>Аватар сонгох</label>\n    <div id=\"profileEmojiChoices\" class=\"profile-emoji-choices\" role=\"group\" aria-label=\"Аватар сонгох\">\n      <button type=\"button\" data-avatar=\"📚\" aria-label=\"Аватар 📚\">📚</button>\n      <button type=\"button\" data-avatar=\"🌸\" aria-label=\"Аватар 🌸\">🌸</button>\n      <button type=\"button\" data-avatar=\"🦊\" aria-label=\"Аватар 🦊\">🦊</button>\n      <button type=\"button\" data-avatar=\"🐱\" aria-label=\"Аватар 🐱\">🐱</button>\n      <button type=\"button\" data-avatar=\"🐼\" aria-label=\"Аватар 🐼\">🐼</button>\n      <button type=\"button\" data-avatar=\"🐉\" aria-label=\"Аватар 🐉\">🐉</button>\n      <button type=\"button\" data-avatar=\"⭐\" aria-label=\"Аватар ⭐\">⭐</button>\n      <button type=\"button\" data-avatar=\"🎮\" aria-label=\"Аватар 🎮\">🎮</button>\n    </div>\n    <label for=\"profileImage\">Эсвэл аватар зураг оруулах</label>\n    <input type=\"file\" id=\"profileImage\" accept=\"image/png,image/jpeg,image/webp\">\n    <small class=\"profile-muted\">PNG / JPG / WebP, 2 MB хүртэл. Аватар зураг нийтэд харагдана.</small>\n    <p id=\"profileSaveStatus\" class=\"profile-save-status\" role=\"status\" aria-live=\"polite\"></p>\n    <button class=\"btn primary profile-submit\" id=\"profileSave\" type=\"submit\">Өөрчлөлт хадгалах</button>\n  </form>\n</section>\n<div class=\"profile-actions\">\n  <button class=\"btn\" id=\"profileImport\" type=\"button\">Энэ төхөөрөмжийн уншсан түүхийг аккаунтад хадгалах</button>\n  <button class=\"btn\" id=\"profileLogout\" type=\"button\">Гарах</button>\n</div>";
      document.body.append(dialog);
      const $ = selector => dialog.querySelector(selector);
      const status = $('#profileStatus');
      const saveStatus = $('#profileSaveStatus');
      const fileInput = $('#profileImage');
      const saveButton = $('#profileSave');

      function favorites() {
        const store=window.RRLibraryStore;
        if (store?.isSignedIn()) return store.getFavoriteIds();
        try {
          const ids = JSON.parse(localStorage.getItem('rr_favs') || '[]');
          return Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : [];
        } catch { return []; }
      }
      function history() {
        try {
          const items = JSON.parse(localStorage.getItem('rr_hist') || '[]');
          return Array.isArray(items) ? items : [];
        } catch { return []; }
      }

      function renderAvatar() {
        const target = $('#profileAvatar');
        target.replaceChildren();
        const path = profile?.avatar_path;
        if (session && path && path.startsWith(session.user.id + '/')) {
          const { data } = sb.storage.from('profile-avatars').getPublicUrl(path);
          if (data?.publicUrl) {
            const image = document.createElement('img');
            image.alt = 'Аватар зураг';
            image.src = data.publicUrl;
            image.onerror = () => { target.textContent = emoji; };
            target.append(image);
            return;
          }
        }
        target.textContent = emoji;
      }
      function selectAvatar() {
        dialog.querySelectorAll('[data-avatar]').forEach(button => {
          const isSelected = button.dataset.avatar === emoji && (changedEmoji || !profile?.avatar_path);
          button.classList.toggle('chosen', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
      }
      function renderBadges() {
        const badges = [
          ['🌱','Эхний алхам','1 бүлэг унших',readCount >= 1],
          ['📖','Номын хорхой','5 бүлэг унших',readCount >= 5],
          ['👑','Манга мастер','20 бүлэг унших',readCount >= 20],
          ['💬','Ярилцагч','1 сэтгэгдэл',commentCount >= 1],
          ['⭐','Шүүмжлэгч','3 манга үнэлэх',reviewCount >= 3],
          ['❤️','Цуглуулагч','3 манга дуртайд нэмэх',favorites().length >= 3]
        ];
        const holder = $('#profileBadges');
        holder.replaceChildren();
        for (const [icon,name,hint,earned] of badges) {
          const item = document.createElement('div');
          item.className = 'profile-badge' + (earned ? ' earned' : '');
          const symbol = document.createElement('span');
          symbol.textContent = icon;
          symbol.setAttribute('aria-hidden', 'true');
          const title = document.createElement('b'); title.textContent = name;
          const sub = document.createElement('small'); sub.textContent = earned ? 'Авсан' : hint;
          item.append(symbol,title,sub);
          holder.append(item);
        }
      }
      async function renderFavorites() {
        const holder = $('#profileFavorites');
        const ids = favorites().slice(0, 6);
        $('#profileFavCount').textContent = String(favorites().length);
        if (!ids.length) {
          holder.textContent = 'Дуртай манга алга.';
          return;
        }
        try {
          const list = window.RRCatalog
            ? await window.RRCatalog.load()
            : await (async () => {
                const response = await fetch('manga.json');
                if (!response.ok) throw Error('Catalog unavailable');
                return response.json();
              })();
          const entries = ids.map(id => list.find(m => m.id === id)).filter(Boolean);
          holder.replaceChildren();
          for (const manga of entries) {
            const chapter = manga.chapters?.[manga.chapters.length - 1];
            if (!chapter) continue;
            const link = document.createElement('a');
            link.className = 'profile-favorite';
            link.textContent = manga.title;
            link.href = 'reader.html?m=' + encodeURIComponent(manga.id) + '&c=' + encodeURIComponent(chapter.n);
            holder.append(link);
          }
          if (!holder.children.length) holder.textContent = 'Манга олдсонгүй.';
        } catch { holder.textContent = 'Манганы жагсаалт ачаалагдсангүй.'; }
      }
      function render() {
        if (!session || !profile) return;
        emoji = allowedEmojis.includes(profile.avatar_emoji) ? profile.avatar_emoji : '📚';
        changedEmoji = false;
        $('#profileDisplayName').textContent = profile.username;
        $('#profileDisplayBio').textContent = profile.bio || 'Танилцуулга нэмээрэй.';
        $('#profileJoined').textContent = 'Нэгдсэн: ' +
          new Date(profile.created_at || session.user.created_at).toLocaleDateString('mn-MN', {year:'numeric',month:'long'});
        $('#profileUsername').value = profile.username;
        $('#profileBio').value = profile.bio || '';
        fileInput.value = '';
        $('#profileReadCount').textContent = String(readCount);
        $('#profileCommentCount').textContent = String(commentCount);
        $('#profileReviewCount').textContent = String(reviewCount);
        renderAvatar(); selectAvatar(); renderBadges(); renderFavorites();
        onUpdate();
      }
      async function refresh() {
        if (!session) return;
        const uid = session.user.id, ticket = ++generation;
        status.textContent = 'Профайл ачаалж байна…';
        const [p,h,c,r] = await Promise.all([
          sb.from('profiles').select('username,bio,avatar_emoji,avatar_path,created_at').eq('id',uid).maybeSingle(),
          sb.from('reading_history').select('manga_id',{count:'exact',head:true}).eq('user_id',uid),
          sb.from('comments').select('id',{count:'exact',head:true}).eq('user_id',uid),
          sb.from('reviews').select('id',{count:'exact',head:true}).eq('user_id',uid)
        ]);
        if (!session || session.user.id !== uid || ticket !== generation) return;
        if (p.error || !p.data) {
          saveButton.disabled = true;
          status.textContent = 'Профайл ачаалагдсангүй. Supabase дээр profile_2.sql-г ажиллуулсан эсэхийг шалгаарай.';
          return;
        }
        saveButton.disabled = false;
        profile = p.data;
        readCount = h.count ?? 0;
        commentCount = c.count ?? 0;
        reviewCount = r.count ?? 0;
        render();
        $('#profileImport').disabled = Boolean(h.error);
        status.textContent = h.error
          ? 'Уншлагын статистик идэвхгүй байна. profile_2.sql-г ажиллуулна уу.'
          : (window.RRLibraryStore?.isFavoritesReady()
            ? 'Уншсан бүлэг болон дуртай манга аккаунттай синк хийгдэнэ.'
            : 'Уншсан бүлэг аккаунттай синк хийгдэнэ. Дуртай манганы синк тохиргоог шалгаарай.');
      }
      $('#profileClose').onclick = () => dialog.close();
      dialog.addEventListener('click',e => { if (e.target === dialog) dialog.close(); });
      dialog.querySelectorAll('[data-avatar]').forEach(button => {
        button.onclick = () => {
          emoji = button.dataset.avatar; changedEmoji = true;
          fileInput.value = '';
          selectAvatar();
          // Selecting a preset removes the currently displayed uploaded image.
          $('#profileAvatar').textContent = emoji;
        };
      });
      fileInput.onchange = () => {
        if (fileInput.files?.length) {
          changedEmoji = false;
          selectAvatar();
          saveStatus.textContent = 'Зургийг хадгалах үед байршуулна.';
        }
      };
      $('#profileForm').onsubmit = async event => {
        event.preventDefault();
        if (!session || !profile) return;
        const uid = session.user.id;
        const username = $('#profileUsername').value.trim();
        const bio = $('#profileBio').value.trim();
        if (username.length < 2 || username.length > 24 || bio.length > 280) {
          saveStatus.textContent = 'Нэр эсвэл танилцуулгын уртыг шалгана уу.';
          return;
        }
        const file = fileInput.files?.[0];
        const ext = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
        if (file && (!ext[file.type] || file.size > 2097152)) {
          saveStatus.textContent = '2 MB-аас бага PNG, JPG эсвэл WebP зураг сонгоно уу.';
          return;
        }
        saveButton.disabled = true;
        saveStatus.textContent = 'Хадгалж байна…';
        const oldPath = profile.avatar_path;
        let newPath = null;
        try {
          if (file) {
            newPath = uid + '/' + crypto.randomUUID() + '.' + ext[file.type];
            const uploaded = await sb.storage.from('profile-avatars')
              .upload(newPath,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
            if (uploaded.error) throw uploaded.error;
          }
          const avatarPath = newPath || (changedEmoji ? null : oldPath);
          const saved = await sb.from('profiles')
            .update({username,bio,avatar_emoji:emoji,avatar_path:avatarPath,updated_at:new Date().toISOString()})
            .eq('id',uid)
            .select('username,bio,avatar_emoji,avatar_path,created_at')
            .single();
          if (saved.error) throw saved.error;
          profile = saved.data;
          if (oldPath && oldPath !== avatarPath && oldPath.startsWith(uid + '/')) {
            sb.storage.from('profile-avatars').remove([oldPath]).then(() => {});
          }
          render();
          saveStatus.textContent = 'Профайл хадгалагдлаа.';
        } catch (error) {
          if (newPath) await sb.storage.from('profile-avatars').remove([newPath]);
          saveStatus.textContent = 'Алдаа: ' + (error?.message || 'Хадгалж чадсангүй');
        } finally { saveButton.disabled = false; }
      };
      $('#profileImport').onclick = async () => {
        if (!session) return;
        const uid = session.user.id;
        const items = history().filter(row => row && typeof row.m === 'string' && row.m.length <= 200 &&
          (typeof row.c === 'number' || typeof row.c === 'string'));
        const unique = new Map();
        for (const item of items) {
          const chapter = String(item.c);
          if (chapter.length > 64) continue;
          const key = item.m + '\0' + chapter;
          if (!unique.has(key)) {
            const date = new Date(item.t);
            unique.set(key,{user_id:uid,manga_id:item.m,chapter,
              read_at:Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()});
          }
        }
        const rows = [...unique.values()].slice(0,200);
        if (!rows.length) { status.textContent = 'Энэ төхөөрөмжийн уншсан түүх хоосон байна.'; return; }
        const button = $('#profileImport');
        button.disabled = true;
        status.textContent = 'Уншсан түүхийг синк хийж байна…';
        try {
          for (let i=0;i<rows.length;i+=50) {
            const result = await sb.from('reading_history').upsert(rows.slice(i,i+50),
              {onConflict:'user_id,manga_id,chapter',ignoreDuplicates:true});
            if (result.error) throw result.error;
          }
          await refresh();
          status.textContent = rows.length + ' хүртэл бүлгийн түүх синк хийгдлээ.';
        } catch(error) {
          status.textContent = 'Синк амжилтгүй: ' + (error?.message || 'Алдаа');
        } finally { button.disabled = false; }
      };
      window.addEventListener('rr-library-change',() => {
        if (dialog.open && session) { renderBadges(); renderFavorites(); }
      });
      $('#profileLogout').onclick = async () => { dialog.close(); await sb.auth.signOut(); };
      return {
        open() {
          if (!session) return;
          if (!dialog.open) dialog.showModal();
          saveStatus.textContent = '';
          refresh();
        },
        setSession(value) {
          const previousId = session?.user?.id;
          session = value;
          if (previousId !== value?.user?.id) {
            generation++;
            profile = null;
            if (dialog.open) dialog.close();
          }
        },
        getName() { return profile?.username || null; },
        async recordRead(mangaId,chapter) {
          if (!session || !mangaId || chapter == null) return;
          const result = await sb.from('reading_history').upsert({
            user_id:session.user.id,manga_id:String(mangaId),chapter:String(chapter),
            read_at:new Date().toISOString()
          },{onConflict:'user_id,manga_id,chapter'});
          if (result.error) console.debug('[Red Ribbon] Reading history:',result.error.message);
        }
      };
    }
  };
})();
