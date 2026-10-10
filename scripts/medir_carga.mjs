// Mide la carga de páginas de dist/ y el repintado al cambiar un filtro.
// Uso: node scripts/medir_carga.mjs [ruta ...]   (salida JSON por renglón)
// Por página: bytes descargados (y los cinco archivos más pesados), tiempo
// hasta la primera gráfica, tiempo hasta que la página deja de cambiar,
// tareas largas del hilo principal y, al mover el primer filtro, cuánto tarda
// en repintar. Sirve dist/ con rangos de bytes (PMTiles) como en producción.
// Con RED=1 emula una conexión de 10 Mbps y 40 ms de latencia (sin caché).
// Los MB reportados son los que viajan por la red (texto comprimido con gzip).
import {chromium} from "playwright-core";
import {TIPOS} from "./servidor_estatico.mjs";
import {createServer} from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import {gzipSync} from "node:zlib";
import path from "node:path";

// Servidor propio de la medicion: rangos de bytes (PMTiles) y gzip para los
// tipos de texto, como hace GitHub Pages; parquet, wasm y pmtiles van sin
// comprimir (supuesto conservador).
const COMPRIME = /\.(html|js|css|csv|json|geojson|svg|txt)$/;
const cacheGz = new Map();
function servirEstatico(raiz, puerto) {
  return new Promise((ok) => {
    const srv = createServer((req, res) => {
      let f = path.join(raiz, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, "index.html");
      else if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
      if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
      const datos = readFileSync(f);
      const tipo = TIPOS[path.extname(f)] ?? "application/octet-stream";
      const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
      if (m) {
        const ini = +m[1], fin = m[2] ? +m[2] : datos.length - 1;
        res.writeHead(206, {"content-type": tipo, "accept-ranges": "bytes", "content-range": `bytes ${ini}-${fin}/${datos.length}`, "content-length": fin - ini + 1});
        res.end(datos.subarray(ini, fin + 1)); return;
      }
      if (COMPRIME.test(f) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
        if (!cacheGz.has(f)) cacheGz.set(f, gzipSync(datos, {level: 6}));
        const gz = cacheGz.get(f);
        res.writeHead(200, {"content-type": tipo, "content-encoding": "gzip", "content-length": gz.length, "accept-ranges": "bytes"});
        res.end(gz); return;
      }
      res.writeHead(200, {"content-type": tipo, "content-length": datos.length, "accept-ranges": "bytes"});
      res.end(datos);
    });
    srv.listen(puerto, "127.0.0.1", () => ok(srv));
  });
}

const RAIZ = path.join(import.meta.dirname, "..", "dist");
const PUERTO = 8897;
const RUTAS = process.argv.slice(2).length ? process.argv.slice(2) : ["/encuestas/endutih/uso", "/mapa"];
const s = await servirEstatico(RAIZ, PUERTO);
const b = await chromium.launch({channel: "msedge"});

for (const ruta of RUTAS) {
  const ctx = await b.newContext({viewport: {width: 1366, height: 900}});
  await ctx.addInitScript(() => {
    window.__largas = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas += e.duration; }).observe({type: "longtask", buffered: true});
    // Ultimo cambio del DOM en main: para saber cuando se quedo quieta la pagina.
    window.__ultimo = performance.now();
    document.addEventListener("DOMContentLoaded", () => {
      const main = document.querySelector("#observablehq-main") ?? document.body;
      new MutationObserver(() => { window.__ultimo = performance.now(); }).observe(main, {childList: true, subtree: true, attributes: true});
    });
  });
  const p = await ctx.newPage();
  if (process.env.RED) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", {cacheDisabled: true});
    await cdp.send("Network.emulateNetworkConditions", {offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8});
  }
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PUERTO}${ruta}`, {waitUntil: "load", timeout: 180000});
  const esMapa = ruta === "/mapa" || ruta.startsWith("/mapa-");
  const listo = esMapa ? ".mapa-leyenda-paso, .maplibregl-canvas" : "#observablehq-main svg:not(.motivo) g[aria-label]";
  await p.waitForSelector(listo, {timeout: 180000});
  const primera = Date.now() - t0;
  // Quieta: 800 ms sin cambios en main.
  await p.waitForFunction(() => performance.now() - window.__ultimo > 800, null, {timeout: 180000, polling: 100});
  const quieta = await p.evaluate(() => Math.round(window.__ultimo));
  const recursos = await p.evaluate(() => performance.getEntriesByType("resource").map((r) => ({n: r.name.replace(location.origin, ""), b: r.encodedBodySize || r.transferSize || 0})));
  const total = recursos.reduce((a, r) => a + r.b, 0);
  const pesados = [...recursos].sort((a, c) => c.b - a.b).slice(0, 5).map((r) => `${(r.b / 1e6).toFixed(2)} MB ${r.n.split("?")[0].split("/").pop()}`);
  const largasCarga = await p.evaluate(() => Math.round(window.__largas));

  // Filtro: el primer <select> del primer panel pasa a su segunda opción.
  const cambio = await p.evaluate(async () => {
    const sel = document.querySelector("#observablehq-main .panel-filtros select, #observablehq-main .panel-mapa select, #observablehq-main select");
    if (!sel || sel.options.length < 2) return null;
    const otra = [...sel.options].find((o) => o.value !== sel.value && !o.disabled);
    if (!otra) return null;
    window.__largas = 0;
    const t = performance.now();
    window.__ultimo = t;
    sel.value = otra.value;
    sel.dispatchEvent(new Event("input", {bubbles: true}));
    sel.dispatchEvent(new Event("change", {bubbles: true}));
    // Espera a que main deje de cambiar 600 ms.
    await new Promise((ok) => { const r = () => (performance.now() - window.__ultimo > 600 ? ok() : setTimeout(r, 50)); setTimeout(r, 50); });
    return {etiqueta: (sel.labels?.[0]?.textContent || sel.name || sel.id || "select").trim().slice(0, 40), a: otra.textContent.trim().slice(0, 40), ms: Math.round(window.__ultimo - t), largas: Math.round(window.__largas)};
  });
  console.log(JSON.stringify({ruta, red: process.env.RED ? "10 Mbps" : "local", mb: +(total / 1e6).toFixed(2), archivos: recursos.length, primeraGraficaMs: primera, quietaMs: quieta, tareasLargasCargaMs: largasCarga, filtro: cambio, pesados}));
  await ctx.close();
}
await b.close();
s.close();
