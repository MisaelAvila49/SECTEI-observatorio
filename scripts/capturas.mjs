import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import {chromium} from "playwright-core";
const DIST = path.resolve("dist"); const PUERTO = 8871;
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".csv":"text/csv",".parquet":"application/octet-stream",".svg":"image/svg+xml",".png":"image/png",".pmtiles":"application/octet-stream",".geojson":"application/json",".webp":"image/webp"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  let f = path.join(DIST, p); if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(f); const ext = path.extname(f);
  const range = req.headers.range;
  if (range) { const m = /bytes=(\d+)-(\d*)/.exec(range); const a = +m[1], b = m[2] ? +m[2] : st.size - 1;
    res.writeHead(206, {"Content-Type": MIME[ext] ?? "application/octet-stream", "Content-Range": `bytes ${a}-${b}/${st.size}`, "Content-Length": b - a + 1, "Accept-Ranges": "bytes"});
    return fs.createReadStream(f, {start: a, end: b}).pipe(res); }
  res.writeHead(200, {"Content-Type": MIME[ext] ?? "application/octet-stream", "Content-Length": st.size, "Accept-Ranges": "bytes"}); fs.createReadStream(f).pipe(res);
});
srv.listen(PUERTO);
const salida = process.argv[2]; const modo = process.argv[3] ?? "claro";
const rutas = process.argv.slice(4);
const br = await chromium.launch({channel: "msedge"});
const ctx = await br.newContext({viewport: {width: 1440, height: 900}, colorScheme: "light"});
await ctx.addInitScript((m) => { try { localStorage.setItem("sdi-tema", m); } catch {} }, modo);
for (const ruta of rutas) {
  const pg = await ctx.newPage(); const errores = [];
  pg.on("pageerror", (e) => errores.push(String(e))); pg.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await pg.goto(`http://127.0.0.1:${PUERTO}${ruta}`, {waitUntil: "networkidle"}); await pg.waitForTimeout(3500);
  const nombre = ruta.replace(/\//g, "_").replace(/^_/, "") || "index";
  await pg.screenshot({path: path.join(salida, `${nombre}-${modo}.png`), fullPage: true});
  const alto = await pg.evaluate(() => document.body.scrollHeight);
  console.log(ruta, "alto", alto, errores.length ? "ERRORES: " + errores.slice(0, 5).join(" | ") : "sin errores");
  await pg.close();
}
await br.close(); srv.close();
