// Service worker do William Checklist
// - reconhece o app como instalável de verdade
// - recebe fotos compartilhadas de outros apps (Galeria) via Web Share Target

var CACHE_COMPARTILHADO = 'checklist-compartilhado';

self.addEventListener('install', function(event){
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);
  var ehCompartilhamento = event.request.method === 'POST' && url.pathname.indexOf('William_Checklist.html') !== -1;

  if (ehCompartilhamento) {
    event.respondWith(receberFotosCompartilhadas(event.request));
    return;
  }

  event.respondWith(fetch(event.request));
});

async function registrarDiagnostico(cache, dados){
  try {
    await cache.put('/__compartilhado-debug', new Response(JSON.stringify(dados), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) { /* diagnóstico é melhor-esforço, nunca deve travar o fluxo real */ }
}

async function receberFotosCompartilhadas(request){
  var cache;
  try {
    cache = await caches.open(CACHE_COMPARTILHADO);

    // limpa qualquer foto (e diagnóstico) compartilhada anterior que não tenha sido usada
    var chavesAntigas = await cache.keys();
    await Promise.all(chavesAntigas.map(function(k){ return cache.delete(k); }));

    var formData = await request.formData();
    var arquivos = formData.getAll('photos');

    // diagnóstico: registra tudo que realmente veio no formData (nomes de campo, se é arquivo, tamanho)
    // pra dar pra investigar remotamente quando o resultado não bate com o esperado
    var camposRecebidos = [];
    formData.forEach(function(valor, chave){
      if (valor && typeof valor.arrayBuffer === 'function') {
        camposRecebidos.push(chave + '=File(nome=' + (valor.name || '?') + ', ' + valor.size + 'b, tipo=' + (valor.type || '?') + ')');
      } else {
        camposRecebidos.push(chave + '=' + String(valor).slice(0, 60));
      }
    });

    var i = 0;
    for (var idx = 0; idx < arquivos.length; idx++) {
      var arquivo = arquivos[idx];
      if (arquivo && typeof arquivo.arrayBuffer === 'function') {
        var chave = '/__compartilhado-foto-' + i;
        await cache.put(chave, new Response(arquivo, { headers: { 'Content-Type': arquivo.type || 'image/jpeg' } }));
        i++;
      }
    }

    await registrarDiagnostico(cache, { etapa: 'ok', totalCamposFormData: camposRecebidos.length, campos: camposRecebidos, fotosSalvas: i });

    return Response.redirect('./William_Checklist.html?compartilhado=1', 303);
  } catch (e) {
    if (cache) await registrarDiagnostico(cache, { etapa: 'erro', mensagem: String(e && e.message || e) });
    return Response.redirect('./William_Checklist.html?erro_compartilhar=1', 303);
  }
}
