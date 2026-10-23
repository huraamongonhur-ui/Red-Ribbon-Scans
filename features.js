/* Red Ribbon Scans — discoverability helpers; no external AI or server calls. */
(() => {
  const chapters = m => Array.isArray(m?.chapters) ? m.chapters.filter(c=>c&&c.n!=null) : [];
  const dateOf = c => {
    const t=Date.parse(c?.date||'');
    return Number.isFinite(t)?t:0;
  };
  const updates = (mangas,limit=12) =>
    (Array.isArray(mangas)?mangas:[]).flatMap(m =>
      chapters(m).map(ch=>({
        manga_id:m.id,title:m.title,cover:m.cover||'',chapter:ch.n,
        chapterTitle:ch.title||'',date:ch.date||'',timestamp:dateOf(ch)
      })))
      .sort((a,b)=>b.timestamp-a.timestamp||String(b.chapter).localeCompare(String(a.chapter),undefined,{numeric:true}))
      .slice(0,Math.max(0,limit));
  const genreScore = (m,seen) => (m.genres||[]).reduce((score,g)=>score+(seen.get(g.toLowerCase())||0),0);
  const recommendations = (mangas,history,favorites,limit=6) => {
    const items=Array.isArray(mangas)?mangas:[];
    const visits=new Set((Array.isArray(history)?history:[]).map(h=>h?.m).filter(Boolean));
    const liked=new Set(Array.isArray(favorites)?favorites:[]);
    const seen=new Map(),byId=new Map(items.map(m=>[m.id,m]));
    for(const id of new Set([...visits,...liked])){
      for(const genre of byId.get(id)?.genres||[]){
        const k=genre.toLowerCase();
        seen.set(k,(seen.get(k)||0)+(liked.has(id)?3:1));
      }
    }
    return items.filter(m=>chapters(m).length && !visits.has(m.id) && !liked.has(m.id))
      .sort((a,b)=>genreScore(b,seen)-genreScore(a,seen)||
        dateOf(chapters(b).at(-1))-dateOf(chapters(a).at(-1)))
      .slice(0,limit);
  };
  const filterManga = (mangas,{q='',genre='',minChapters=0,minRating=0,ratings={}}={}) =>
    (Array.isArray(mangas)?mangas:[]).filter(m=>
      m.title.toLocaleLowerCase().includes(String(q).toLocaleLowerCase()) &&
      (!genre||(m.genres||[]).includes(genre)) &&
      chapters(m).length>=Number(minChapters||0) &&
      (!Number(minRating)||Number(ratings[m.id]||0)>=Number(minRating)));
  window.RRFeatures={updates,recommendations,filterManga,chapters};
})();
