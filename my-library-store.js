/* Red Ribbon Scans — My Library status and private Favorites.
   Status and heart are independent: removing a favorite never removes reading status. */
(() => {
  const VALID = Object.freeze({
    reading:'Уншиж байгаа',
    completed:'Дуусгасан',
    planned:'Дараа унших'
  });
  const validId = id => typeof id === 'string' && id.length >= 1 && id.length <= 120;

  function create(sb) {
    let userId = null, statuses = new Map(), favorites = new Set();
    let error = null, favoritesError = null, ready = false, favoritesReady = false;
    let generation = 0, loading = Promise.resolve();
    const pending = new Set(), pendingFavorites = new Set();
    const emit = () => window.dispatchEvent(new Event('rr-library-change'));

    function setSession(session) {
      const nextId = session?.user?.id || null;
      if (userId === nextId) return loading;
      userId = nextId;
      statuses = new Map();
      favorites = new Set();
      error = null; favoritesError = null;
      ready = false; favoritesReady = false;
      const ticket = ++generation;
      emit();
      if (!nextId) {
        loading = Promise.resolve();
        return loading;
      }
      loading = (async () => {
        const [library, hearts] = await Promise.all([
          sb.from('user_manga_library').select('manga_id,status').eq('user_id',nextId),
          sb.from('user_manga_favorites').select('manga_id').eq('user_id',nextId)
        ]);
        if (ticket !== generation) return;
        error = library.error || null;
        favoritesError = hearts.error || null;
        ready = !error;
        favoritesReady = !favoritesError;
        if (ready) {
          statuses = new Map((library.data || []).filter(row =>
            validId(row?.manga_id) && Object.hasOwn(VALID,row.status))
            .map(row => [row.manga_id,row.status]));
        }
        if (favoritesReady) {
          favorites = new Set((hearts.data || []).filter(row => validId(row?.manga_id))
            .map(row => row.manga_id));
        }
        emit();
      })().catch(reason => {
        if (ticket === generation) {
          error = reason;
          favoritesError = reason;
          ready = false; favoritesReady = false;
          emit();
        }
      });
      return loading;
    }

    async function setStatus(mangaId, status) {
      if (!userId) throw Error('Эхлээд нэвтэрнэ үү.');
      if (!validId(mangaId)) throw Error('Манганы ID буруу байна.');
      if (status !== '' && !Object.hasOwn(VALID,status)) throw Error('Ангилал буруу байна.');
      const uid = userId;
      await loading;
      if (uid !== userId) throw Error('Аккаунт өөрчлөгдсөн байна.');
      if (!ready) throw Error('my_library_2.sql тохиргоог шалгана уу.');
      if (pending.has(mangaId)) throw Error('Өмнөх хадгалалт дуусаагүй.');
      pending.add(mangaId);
      try {
        const result = status
          ? await sb.from('user_manga_library').upsert(
              {user_id:uid,manga_id:mangaId,status},{onConflict:'user_id,manga_id'})
          : await sb.from('user_manga_library').delete().eq('user_id',uid).eq('manga_id',mangaId);
        if (result.error) throw result.error;
        if (uid === userId) {
          if (status) statuses.set(mangaId,status); else statuses.delete(mangaId);
          emit();
        }
      } finally { pending.delete(mangaId); }
    }

    async function setFavorite(mangaId, enabled) {
      if (!userId) throw Error('Зүрхлэхийн тулд эхлээд нэвтэрнэ үү.');
      if (!validId(mangaId)) throw Error('Манганы ID буруу байна.');
      const uid = userId;
      await loading;
      if (uid !== userId) throw Error('Аккаунт өөрчлөгдсөн байна.');
      if (!favoritesReady)
        throw Error('Supabase дээр favorites_cloud.sql файлыг Run хийнэ үү.');
      if (pendingFavorites.has(mangaId)) throw Error('Зүрхний өмнөх хадгалалт дуусаагүй байна.');
      if (favorites.has(mangaId) === Boolean(enabled)) return;
      pendingFavorites.add(mangaId);
      try {
        const result = enabled
          ? await sb.from('user_manga_favorites').upsert(
              {user_id:uid,manga_id:mangaId},{onConflict:'user_id,manga_id',ignoreDuplicates:true})
          : await sb.from('user_manga_favorites').delete().eq('user_id',uid).eq('manga_id',mangaId);
        if (result.error) throw result.error;
        if (uid === userId) {
          if (enabled) favorites.add(mangaId); else favorites.delete(mangaId);
          emit();
        }
      } finally { pendingFavorites.delete(mangaId); }
    }

    return {
      setSession, setStatus, setFavorite,
      ready: () => loading,
      isSignedIn: () => Boolean(userId),
      isReady: () => ready && Boolean(userId),
      isFavoritesReady: () => favoritesReady && Boolean(userId),
      getError: () => error,
      getFavoritesError: () => favoritesError,
      getStatus: id => statuses.get(id) || '',
      getEntries: () => Array.from(statuses,([id,status])=>({id,status})),
      getCounts: () => Object.fromEntries(Object.keys(VALID).map(s=>[s,
        Array.from(statuses.values()).filter(x=>x===s).length])),
      isFavorite: id => favorites.has(id),
      getFavoriteIds: () => [...favorites],
      getFavoriteCount: () => favorites.size
    };
  }

  window.RRMyLibrary = {create,labels:VALID};
})();
