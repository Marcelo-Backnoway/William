// Service worker do William Checklist
// - reconhece o app como instalável de verdade
// - recebe fotos compartilhadas de outros apps (Galeria) via Web Share Target
//
// IMPORTANTE: request.formData() se mostrou pouco confiável pra ler o corpo do
// compartilhamento nesse aparelho (retornava 0 campos sem erro nenhum) — então
// o corpo é lido como bytes crus e o multipart é separado manualmente abaixo.

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

// ---------- Parser manual de multipart/form-data (bytes crus) ----------
function encontrarSubarray(buffer, padrao, inicio){
  outer:
  for (var i = inicio; i <= buffer.length - padrao.length; i++){
    for (var j = 0; j < padrao.length; j++){
      if (buffer[i + j] !== padrao[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function parsearMultipartDeBuffer(buffer, contentTypeHeader){
  var m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader || '');
  if (!m) return { erro: 'sem boundary no Content-Type', arquivos: [] };
  var boundary = (m[1] || m[2]).trim();
  var boundaryBytes = new TextEncoder().encode('--' + boundary);

  var partes = [];
  var pos = encontrarSubarray(buffer, boundaryBytes, 0);
  while (pos !== -1) {
    var proximo = encontrarSubarray(buffer, boundaryBytes, pos + boundaryBytes.length);
    if (proximo === -1) break;
    partes.push(buffer.subarray(pos + boundaryBytes.length, proximo));
    pos = proximo;
  }

  var CRLFCRLF = [13, 10, 13, 10];
  var arquivos = [];
  partes.forEach(function(trecho){
    var inicio = 0;
    if (trecho[0] === 13 && trecho[1] === 10) inicio = 2; // pula \r\n que sobra logo após o boundary
    var fimHeaders = encontrarSubarray(trecho, CRLFCRLF, inicio);
    if (fimHeaders === -1) return;

    var headersTxt = new TextDecoder().decode(trecho.subarray(inicio, fimHeaders));
    var nomeCampoM = /name="([^"]*)"/i.exec(headersTxt);
    var nomeArquivoM = /filename="([^"]*)"/i.exec(headersTxt);
    var tipoM = /Content-Type:\s*([^\r\n]+)/i.exec(headersTxt);
    if (!nomeCampoM || nomeCampoM[1] !== 'photos' || !nomeArquivoM) return; // só nos interessa o campo "photos" (bate com o manifest)

    var corpoInicio = fimHeaders + 4;
    var corpoFim = trecho.length;
    if (trecho[corpoFim - 2] === 13 && trecho[corpoFim - 1] === 10) corpoFim -= 2; // remove \r\n final antes do próximo boundary

    var dados = trecho.subarray(corpoInicio, corpoFim);
    arquivos.push({
      nome: nomeArquivoM[1] || 'foto.jpg',
      tipo: tipoM ? tipoM[1].trim() : 'image/jpeg',
      dados: dados
    });
  });

  return { erro: null, arquivos: arquivos };
}

async function receberFotosCompartilhadas(request){
  var cache;
  try {
    cache = await caches.open(CACHE_COMPARTILHADO);

    // limpa qualquer foto (e diagnóstico) compartilhada anterior que não tenha sido usada
    var chavesAntigas = await cache.keys();
    await Promise.all(chavesAntigas.map(function(k){ return cache.delete(k); }));

    var contentTypeHeader = request.headers.get('content-type') || '';
    var bufferBruto = new Uint8Array(await request.arrayBuffer());
    var resultado = parsearMultipartDeBuffer(bufferBruto, contentTypeHeader);

    var listaArquivos = resultado.arquivos || [];
    for (var i = 0; i < listaArquivos.length; i++) {
      var chave = '/__compartilhado-foto-' + i;
      await cache.put(chave, new Response(listaArquivos[i].dados, { headers: { 'Content-Type': listaArquivos[i].tipo || 'image/jpeg' } }));
    }

    await registrarDiagnostico(cache, {
      etapa: 'ok',
      bufferBytes: bufferBruto.length,
      contentType: contentTypeHeader,
      erroParser: resultado.erro,
      totalArquivosParseados: listaArquivos.length,
      fotosSalvas: i
    });

    return Response.redirect('./William_Checklist.html?compartilhado=1', 303);
  } catch (e) {
    if (cache) await registrarDiagnostico(cache, { etapa: 'erro', mensagem: String(e && e.message || e) });
    return Response.redirect('./William_Checklist.html?erro_compartilhar=1', 303);
  }
}
