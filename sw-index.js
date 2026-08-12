// Service worker do índice (William) — mesmo propósito do sw.js do Reflexo:
// fazer o Chrome reconhecer este site como instalável de verdade (sem barra).
self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  self.clients.claim();
});
self.addEventListener('fetch', function(event){
  event.respondWith(fetch(event.request));
});
