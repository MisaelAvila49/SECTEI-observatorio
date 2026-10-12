// generar_og.mjs: dibuja src/images/og-grupos-originarios.png, la imagen de
// 1200 x 630 que muestran las vistas previas al compartir un enlace.
//
// Repite la portada del inicio: el nombre del observatorio a la izquierda y,
// a la derecha, la tapa «Las lenguas» con los nombres de las 30 lenguas más
// habladas en la ciudad, del tamaño de cuántos las hablan. El muro sale del
// mismo loader que usa la portada (src/data/muro_lenguas.json.js), así que la
// imagen representa el dato y se regenera con un comando. El nombre del
// archivo no cambia para no romper los enlaces ya compartidos.
//
// Uso: node scripts/generar_og.mjs
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logo = fs.readFileSync(path.join(RAIZ, "src/images/social_data_gris.svg"), "utf8");
const {lenguas} = JSON.parse(execFileSync(process.execPath, ["src/data/muro_lenguas.json.js"], {cwd: RAIZ, encoding: "utf8"}));
const SALIDA = path.join(RAIZ, "src/images/og-grupos-originarios.png");
const escapar = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const muro = lenguas.map((l, i) => `<span class="${i < 5 ? "mayor" : i < 12 ? "media" : ""}" style="--k:${l.k}">${escapar(l.nombre)}</span>`).join(" ");

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..700&family=Schibsted+Grotesk:wght@400..800&display=swap">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #ffffff; color: #1d1d1b; font-family: "Schibsted Grotesk", "Segoe UI", Arial, sans-serif; position: relative; overflow: hidden; }
  .texto { position: absolute; left: 72px; top: 70px; width: 600px; }
  .eyebrow { font-size: 21px; font-weight: 600; color: #c4101b; }
  h1 { font: 600 66px/1.04 "Newsreader", Georgia, serif; letter-spacing: -.015em; margin: 18px 0 20px; }
  h1 .clave { color: #c4101b; }
  p { font: 400 30px/1.3 "Newsreader", Georgia, serif; color: #4a4846; }
  .fuentes { position: absolute; left: 72px; bottom: 58px; font-size: 19px; color: #4a4846; }
  .tapa { position: absolute; right: 80px; top: 48px; width: 380px; height: 534px; background: #eef0f1; border-radius: 3px 8px 8px 3px;
    box-shadow: 0 30px 60px -20px rgba(29,29,27,.35), 0 12px 24px -12px rgba(29,29,27,.25); overflow: hidden; container-type: inline-size; }
  .tapa::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 7%;
    background: linear-gradient(90deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,.08) 35%, rgba(255,255,255,.22) 48%, rgba(0,0,0,.06) 62%, transparent 100%); }
  .sello { position: absolute; left: 11cqw; top: 8cqw; font-size: 2.9cqw; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #c4101b; }
  .muro { position: absolute; left: 11cqw; right: 8cqw; top: 16cqw; display: flex; flex-wrap: wrap; align-items: baseline; gap: .05em .32em; font-family: "Newsreader", Georgia, serif; line-height: 1; color: #8a8682; }
  .muro span { font-size: calc(2.6cqw + var(--k) * 8.4cqw); }
  .muro .mayor { color: #c4101b; font-weight: 600; }
  .muro .media { color: #1d1d1b; }
  .t-titulo { position: absolute; left: 11cqw; right: 8cqw; bottom: 20cqw; font: 600 9.6cqw/1.02 "Newsreader", Georgia, serif; }
  .t-sub { font: 400 4.4cqw/1.25 "Newsreader", Georgia, serif; color: #4a4846; margin-top: 2.6cqw; }
  .logo { position: absolute; right: 8cqw; bottom: 7cqw; width: 26cqw; }
  .logo svg { width: 100%; height: auto; display: block; }
</style></head><body>
  <div class="texto">
    <span class="eyebrow">Tablero de datos de Social Data Ibero</span>
    <h1>Observatorio de <span class="clave">Pueblos Indígenas</span> de la Ciudad de México</h1>
    <p>Dónde vive y qué lenguas habla</p>
  </div>
  <div class="fuentes">INEGI · INALI · CONAPO · CONEVAL · 1990 - 2025</div>
  <div class="tapa">
    <span class="sello">Social Data Ibero</span>
    <div class="muro">${muro}</div>
    <div class="t-titulo">Observatorio de Pueblos Indígenas<div class="t-sub">de la Ciudad de México</div></div>
    <div class="logo">${logo}</div>
  </div>
</body></html>`;

const navegador = await chromium.launch({channel: "msedge"});
const pagina = await navegador.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
await pagina.setContent(html, {waitUntil: "networkidle"});
await pagina.evaluate(() => document.fonts.ready);
await pagina.waitForTimeout(600);
await pagina.screenshot({path: SALIDA, clip: {x: 0, y: 0, width: 1200, height: 630}});
await navegador.close();
console.log(`[ok] ${SALIDA} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
