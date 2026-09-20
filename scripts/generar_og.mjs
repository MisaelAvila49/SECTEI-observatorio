// generar_og.mjs: dibuja src/images/og-grupos-originarios.png, la imagen de
// 1200 x 630 que muestran las vistas previas al compartir un enlace.
//
// Se compone en HTML con la misma paleta de marca y el mismo dumbbell de la
// cubierta (src/images/portada-brecha.svg, generado desde los datos), y se
// captura con el navegador instalado vía playwright-core. Así la imagen
// representa el dato del tablero y se regenera con un comando.
//
// Uso: node scripts/generar_og.mjs   (después de scripts/generar_portada.py)
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svgDatos = fs.readFileSync(path.join(RAIZ, "src/images/portada-brecha.svg"), "utf8");
const logo = fs.readFileSync(path.join(RAIZ, "src/images/social_data_blanco.svg"), "utf8");
const SALIDA = path.join(RAIZ, "src/images/og-grupos-originarios.png");

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap");
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: "Inter", "Segoe UI", Arial, sans-serif; color: #fff;
    background:
      radial-gradient(circle at 88% 12%, rgba(196,16,27,.55), transparent 42%),
      radial-gradient(circle at 8% 96%, rgba(196,16,27,.35), transparent 40%),
      radial-gradient(rgba(255,255,255,.07) 1.2px, transparent 1.2px) 0 0 / 18px 18px,
      linear-gradient(160deg, #2a2a27, #121211); }
  .marco { position: absolute; inset: 28px; border: 1px solid rgba(255,255,255,.22); border-radius: 10px; }
  .franja { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: #c4101b; }
  .texto { position: absolute; left: 84px; top: 78px; width: 610px; }
  .eyebrow { font-family: "JetBrains Mono", Consolas, monospace; font-size: 17px; letter-spacing: .2em; text-transform: uppercase; color: #ff8d93; }
  h1 { font-size: 62px; line-height: 1.04; letter-spacing: -.02em; margin: 22px 0 22px; font-weight: 700; }
  p { font-size: 25px; line-height: 1.35; color: rgba(255,255,255,.86); }
  .fuentes { position: absolute; left: 84px; bottom: 76px; font-size: 19px; color: rgba(255,255,255,.7); }
  .logo { position: absolute; right: 84px; bottom: 64px; width: 250px; }
  .logo svg { width: 100%; height: auto; }
  .dato { position: absolute; right: 76px; top: 96px; width: 390px; }
  .dato svg { width: 100%; height: auto; }
  .leyenda { position: absolute; right: 76px; top: 300px; width: 390px; display: flex; gap: 22px; font-size: 16px; color: rgba(255,255,255,.82); }
  .leyenda i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
</style></head><body>
  <div class="franja"></div><div class="marco"></div>
  <div class="texto">
    <span class="eyebrow">Tablero de datos · Social Data Ibero</span>
    <h1>Grupos originarios</h1>
    <p>El acceso digital de la población indígena de México: internet, celular y computadora, comparados con el resto de la población.</p>
  </div>
  <div class="dato">${svgDatos}</div>
  <div class="leyenda"><span><i style="background:#FFB3B8"></i>Población indígena</span><span><i style="background:#B8D8F7"></i>Resto</span></div>
  <div class="fuentes">INEGI · Censo 2020 · ENIGH 2020 - 2024 · ENDUTIH 2025</div>
  <div class="logo">${logo}</div>
</body></html>`;

const navegador = await chromium.launch({channel: "msedge"});
const pagina = await navegador.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
await pagina.setContent(html, {waitUntil: "networkidle"});
await pagina.waitForTimeout(600);
await pagina.screenshot({path: SALIDA, clip: {x: 0, y: 0, width: 1200, height: 630}});
await navegador.close();
console.log(`[ok] ${SALIDA} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
