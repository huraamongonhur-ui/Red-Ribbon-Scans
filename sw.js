const CACHE_NAME='red-ribbon-v1';
const STATIC_ASSETS=[
  './',
  './index.html',
  './reader.html',
  './style.css',
  './config.js',
  './social.js',
  './manga.json',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==location.origin){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res.ok&&res.type==='basic'){
          const clone=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise=fetch(e.request).then(res=>{
        if(res.ok){
          const clone=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>cached);
      return cached||fetchPromise;
    })
  );
});

self.addEventListener('message',e=>{
  if(e.data==='skipWaiting')self.skipWaiting();
});