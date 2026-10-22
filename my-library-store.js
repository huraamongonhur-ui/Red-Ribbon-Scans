/* Red Ribbon Scans — My Library 2.0 shared Supabase store.
   Statuses belong to the authenticated account, never device-local storage. */
(() => {
  const VALID = Object.freeze({
    reading:'Уншиж байгаа',
    completed:'Дуусгасан',
    planned:'Дараа унших'
  });

  function create(sb) {
    let userId = null;
    let statuses = new Map();
    let error = null;
    let ready = false;
    let generation = 0;
    let loading = Promise.resolve();
    const pending = new Set();
    const emit = () => window.dispatchEvent(new Event('rr-library-change'));

    function setSession(session) {
      const nextId = session?.user?.id || null;
      if (userId === nextId) return loading;
      userId = nextId;
      statuses = new Map();
      error = null;
      ready = !nextId;
      const ticket = ++generation;
      emit();
      if (!nextId) {
        loading = Promise.resolve();
        return loading;
      }
      loading = (async () => {
        const {data,error:problem} = await sb.from('user_manga_library')
          .select('manga_id,status').eq('user_id',nextId);
        if (ticket !== generation) return;
        if (problem) {
          error = problem;
          ready = false;
          statuses = new Map();
        } else {
          statuses = new Map((data || []).filter(row =>
            row && typeof row.manga_id === 'string' && Object.hasOwn(VALID,row.status))
            .map(row => [row.manga_id,row.status]));
          ready = true;
          error = null;
        }
        emit();
      })().catch(reason => {
        if (ticket === generation) {
          error = reason;
          ready = false;
          emit();
        }
      });
      return loading;
    }

    async function setStatus(mangaId, status) {
      if (!userId) throw Error('Жагсаалтдаа нэмэхийн тулд эхлээд нэвтэрнэ үү.');
      if (typeof mangaId !== 'string' || !mangaId || mangaId.length > 120)
        throw Error('Манганы ID буруу байна.');
      if (status !== '' && !Object.hasOwn(VALID,status))
        throw Error('Жагсаалтын төрөл буруу байна.');
      const currentUser = userId;
      await loading;
      if (userId !== currentUser) throw Error('Аккаунт өөрчлөгдсөн байна.');
      if (!ready) throw Error('My Library тохиргоо байхгүй байна. my_library_2.sql-г Supabase дээр ажиллуулна уу.');
      if (pending.has(mangaId)) throw Error('Өмнөх хадгалалт дуусаагүй байна.');
      pending.add(mangaId);
      try {
        const result = status
          ? await sb.from('user_manga_library').upsert(
              {user_id:currentUser,manga_id:mangaId,status},
              {onConflict:'user_id,manga_id'})
          : await sb.from('user_manga_library').delete()
              .eq('user_id',currentUser).eq('manga_id',mangaId);
        if (result.error) throw result.error;
        if (userId !== currentUser) return;
        if (status) statuses.set(mangaId,status);
        else statuses.delete(mangaId);
        emit();
      } finally { pending.delete(mangaId); }
    }

    return {
      setSession,
      setStatus,
      ready: () => loading,
      isSignedIn: () => Boolean(userId),
      isReady: () => ready && Boolean(userId),
      getError: () => error,
      getStatus: id => statuses.get(id) || '',
      getEntries: () => Array.from(statuses,([id,status])=>({id,status})),
      getCounts: () => Object.fromEntries(Object.keys(VALID).map(s=>[s,
        Array.from(statuses.values()).filter(x=>x===s).length]))
    };
  }

  window.RRMyLibrary = { create, labels: VALID };
})();
