/* Red Ribbon Scans — lightweight discovery and reading shortcuts.
   Reading progress is taken only from this device's existing rr_hist records. */
(() => {
  const chaptersOf = manga => Array.isArray(manga?.chapters)
    ? manga.chapters.filter(ch => ch && ch.n != null) : [];

  function nextChapter(manga, history = []) {
    const chapters = chaptersOf(manga);
    if (!chapters.length) return null;
    const visited = new Set((Array.isArray(history) ? history : [])
      .filter(row => row && row.m === manga.id && row.c != null)
      .map(row => String(row.c)));
    const read = chapters.filter(ch => visited.has(String(ch.n))).length;
    let latestReadIndex = -1;
    chapters.forEach((ch, i) => {
      if (visited.has(String(ch.n))) latestReadIndex = i;
    });

    const nextUnread = chapters.find((ch, i) =>
      i > latestReadIndex && !visited.has(String(ch.n)))
      || chapters.find(ch => !visited.has(String(ch.n)));
    const chosen = nextUnread || chapters[chapters.length - 1];
    const label = read === 0 ? 'Эхлүүлэх'
      : nextUnread ? 'Дараагийн бүлэг' : 'Дахин унших';
    return {chapter:chosen.n,label,read,total:chapters.length,
      remaining:chapters.length-read};
  }

  function randomManga(mangas, excludeId='', rng=Math.random) {
    const eligible=(Array.isArray(mangas)?mangas:[]).filter(m=>chaptersOf(m).length);
    const fresh=eligible.filter(m=>m.id!==excludeId);
    const pool=fresh.length ? fresh : eligible;
    if (!pool.length) return null;
    const r=Number(rng());
    const index=Number.isFinite(r) ? Math.min(pool.length-1,
      Math.max(0,Math.floor(r*pool.length))) : 0;
    return pool[index];
  }

  function shareUrl(manga, baseUri) {
    const chapter=chaptersOf(manga)[0];
    if (!chapter || !manga?.id) throw Error('Хуваалцах манга олдсонгүй.');
    return new URL('reader.html?m='+encodeURIComponent(manga.id)+
      '&c='+encodeURIComponent(chapter.n),baseUri).href;
  }

  window.RRDiscover={nextChapter,randomManga,shareUrl};
})();
