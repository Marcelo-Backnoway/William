// Service worker mínimo — existe só para o Chrome reconhecer o app
// como instalável de verdade (sem isso, "Adicionar à tela inicial"
// cria um atalho comum, com a barra do navegador aparecendo).
self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  self.clients.claim();
});
self.addEventListener('fetch', function(event){
  event.respondWith(fetch(event.request));
});
