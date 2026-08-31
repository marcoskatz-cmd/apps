// Cache minimo: solo el armazon. Los datos NUNCA se cachean, para que el
// mapa no muestre baches viejos despues de una actualizacion.
var CACHE = 'baches-v11';
var ARMAZON = ['./', './index.html', './manifest.json', './icono.svg'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ARMAZON); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; })
                         .map(function(k){ return caches.delete(k); }));
  }));
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  // La API y los tiles del mapa van siempre a la red.
  if (url.indexOf('script.google.com') > -1 || url.indexOf('basemaps') > -1) return;
  e.respondWith(
    fetch(e.request).catch(function(){ return caches.match(e.request); })
  );
});
