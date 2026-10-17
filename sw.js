// 星軌跳躍 Service Worker：首次載入時預先快取全部資源，之後完全離線運作
const CACHE='orbit-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('orbit-v')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const cs=await self.clients.matchAll({includeUncontrolled:true});
    cs.forEach(c=>c.postMessage('cached'));
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const hit=await c.match(req,{ignoreSearch:true}) || (req.mode==='navigate' ? await c.match('./index.html') || await c.match('./') : null);
    if(hit){
      // 背景更新（有網絡時）
      fetch(req).then(r=>{ if(r&&r.ok&&r.type==='basic') c.put(req,r.clone()); }).catch(()=>{});
      return hit;
    }
    try{
      const r=await fetch(req);
      if(r&&r.ok&&r.type==='basic') c.put(req,r.clone());
      return r;
    }catch(err){
      const fb=await c.match('./index.html');
      return fb || new Response('離線中',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
