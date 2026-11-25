const cacheName="stillroom-"+BUILD_ID;
self.addEventListener("install",event=>{event.waitUntil((async()=>{
 const cache=await caches.open(cacheName);
 await cache.addAll(CORE_FILES);
 await self.skipWaiting();
})());});
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith("stillroom-")&&key!==cacheName)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
   const cache=await caches.open(cacheName);
   const key=url.pathname==="/"?"/index.html":event.request;
   const saved=await cache.match(key);
   if(saved)return saved;
   const response=await fetch(event.request);
   if(response.ok && url.pathname.startsWith("/vendor/"))await cache.put(key,response.clone());
   return response;
 })());
});
