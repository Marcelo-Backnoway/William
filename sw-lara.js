// Service worker da Lara — mesmo propósito do sw-index.js:
// fazer o Chrome reconhecer este app como instalável de verdade (sem barra),
// com escopo próprio para não interferir nos outros apps do William.
self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  self.clients.claim();
});
self.addEventListener('fetch', function(event){
  event.respondWith(fetch(event.request));
});
