// Service worker do William Onde Está
// - reconhece o app como instalável de verdade
// - recebe fotos compartilhadas de outros apps (Galeria) via Web Share Target

var CACHE_COMPARTILHADO = 'ondeesta-compartilhado';

self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);
  var ehCompartilhamento = event.request.method === 'POST' && url.pathname.indexOf('William_OndeEsta.html') !== -1;

  if (ehCompartilhamento) {
    event.respondWith(receberFotosCompartilhadas(event.request));
    return;
  }

  event.respondWith(fetch(event.request));
});

async function receberFotosCompartilhadas(request){
  try {
    var formData = await request.formData();
    var arquivos = formData.getAll('photos');
    var cache = await caches.open(CACHE_COMPARTILHADO);

    // limpa qualquer foto compartilhada anterior que não tenha sido usada
    var chavesAntigas = await cache.keys();
    await Promise.all(chavesAntigas.map(function(k){ return cache.delete(k); }));

    var i = 0;
    for (var idx = 0; idx < arquivos.length; idx++) {
      var arquivo = arquivos[idx];
      if (arquivo && typeof arquivo.arrayBuffer === 'function') {
        var chave = '/__compartilhado-foto-' + i;
        await cache.put(chave, new Response(arquivo, { headers: { 'Content-Type': arquivo.type || 'image/jpeg' } }));
        i++;
      }
    }

    return Response.redirect('./William_OndeEsta.html?compartilhado=1', 303);
  } catch (e) {
    return Response.redirect('./William_OndeEsta.html?erro_compartilhar=1', 303);
  }
}
