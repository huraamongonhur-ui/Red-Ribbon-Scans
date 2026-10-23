/* Runtime manga catalog: merge GitHub's static manga.json with admin-managed Supabase entries.
   Dynamic rows override static rows with the same ID; offline/failure falls back to static.
   Supabase public publishable/anon key is used with RLS; no server-secret is exposed. */
(() => {
  let sharedClient;
  const canonical = m => {
    if (!m || typeof m.id !== 'string' || typeof m.title !== 'string') return null;
    const chapters = Array.isArray(m.chapters) ? m.chapters.filter(c =>
      c && c.n != null && c.pages && typeof c.pages === 'object') : [];
    return {
      id:m.id, title:m.title,
      description:typeof m.description==='string' ? m.description : '',
      genres:Array.isArray(m.genres) ? m.genres.filter(g => typeof g === 'string') : [],
      cover:typeof m.cover === 'string' ? m.cover : '',
      chapters
    };
  };

  async function client() {
    await (window.RR_SUPABASE_READY || Promise.resolve());
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!sharedClient) {
      sharedClient = window.RR_SB || (window.RR_SB =
        window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
    }
    return sharedClient;
  }

  async function staticManga() {
    const result = await fetch('manga.json', {cache:'no-store'});
    if (!result.ok) throw Error('manga.json unavailable');
    const json = await result.json();
    if (!Array.isArray(json)) throw Error('Invalid manga.json catalog');
    return json.map(canonical).filter(Boolean);
  }

  async function managedManga(sb) {
    const {data,error} = await sb.from('catalog_manga')
      .select('id,title,description,genres,cover,chapters').order('updated_at',{ascending:false});
    if (error) throw error;
    return (data || []).map(canonical).filter(Boolean);
  }

  async function load() {
    let original = [];
    try { original = await staticManga(); }
    catch(error) { console.warn('[Red Ribbon] Static catalog:',error.message); }
    try {
      const sb = await client();
      if (!sb) return original;
      const dynamic = await managedManga(sb);
      const ids = new Set(dynamic.map(m => m.id));
      return [...dynamic,...original.filter(m => !ids.has(m.id))];
    } catch(error) {
      console.warn('[Red Ribbon] Managed catalog unavailable:',error.message);
      return original;
    }
  }

  window.RRCatalog = {client,staticManga,managedManga,load};
})();
