// scripts/servidor_estatico.mjs
// Servidor de dist/ para los verificadores de navegador. Responde peticiones de
// rango (206): PMTiles lee el archivo de teselas por fragmentos y, sin eso, el
// mapa falla con "Server returned no content-length header". GitHub Pages sí
// las atiende, así que el servidor de pruebas tiene que comportarse igual.
import {createServer} from "node:http";
import {createReadStream, existsSync, statSync} from "node:fs";
import path from "node:path";

export const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".csv": "text/csv", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".woff2": "font/woff2", ".parquet": "application/octet-stream",
  ".pmtiles": "application/octet-stream", ".geojson": "application/json", ".wasm": "application/wasm",
};

export function servirEstatico(raiz, puerto) {
  return new Promise((listo) => {
    const s = createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index";
      let f = path.join(raiz, p);
      if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
      let tam;
      try { tam = statSync(f); } catch { rsp.writeHead(404).end("no"); return; }
      if (!tam.isFile()) { rsp.writeHead(404).end("no"); return; }
      const cabeceras = {"content-type": TIPOS[path.extname(f)] ?? "application/octet-stream", "accept-ranges": "bytes"};
      const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
      if (m) {
        const a = +m[1], b = m[2] ? Math.min(+m[2], tam.size - 1) : tam.size - 1;
        rsp.writeHead(206, {...cabeceras, "content-range": `bytes ${a}-${b}/${tam.size}`, "content-length": b - a + 1});
        createReadStream(f, {start: a, end: b}).pipe(rsp);
      } else {
        rsp.writeHead(200, {...cabeceras, "content-length": tam.size});
        createReadStream(f).pipe(rsp);
      }
    });
    s.listen(puerto, () => listo(s));
  });
}
