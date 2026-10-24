const CACHE_NAME='red-ribbon-v20';
const STATIC_ASSETS=[
  './',
  './index.html',
  './reader.html',
  './my-library.html',
  './admin.html',
  './style.css',
  './config.js',
  './social.js',
  './profile.js',
  './catalog.js',
  './discover.js',
  './features.js',
  './features-home.js',
  './features.css',
  './manga.html',
  './manga-detail.js',
  './feedback.html',
  './feedback.js',
  './admin-workflow.js',
  './stats.html',
  './stats.js',
  './site-extras.js',
  './reader-extras.js',
  './extras.css',
  './simple-comix.css',
  './admin-bulk.js',
  './admin-activity.js',
  './my-library-store.js',
  './my-library.js',
  './my-library.css',
  './admin.js',
  './admin.css',
  './manga.json',
  './manifest.json',
  './assets/red-ribbon-logo.webp'
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
  // Never cache login requests or third-party/API responses.
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  // Never cache runtime configuration or API responses.
  if(url.pathname.startsWith('/api/'))return;
  // Keep HTML, metadata, JS and CSS fresh; use cached assets only when offline.
  if(e.request.mode==='navigate'||url.pathname.endsWith('/manga.json')||/\.(?:js|css)$/.test(url.pathname)){
    e.respondWith(fetch(e.request).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,copy));}
      return res;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  // Same-origin: cache first, then network
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