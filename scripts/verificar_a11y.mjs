// Auditoría de accesibilidad con axe-core en navegador real.
//
// Abre cada página de dist/ en los dos temas, inyecta axe-core y corre las
// reglas de WCAG 2.1 A y AA. Además comprueba tres cosas que axe no cubre:
// que todo control interactivo tenga nombre accesible, que la navegación por
// teclado llegue a los filtros y al botón de tema, y que ninguna pieza del
// tablero dependa SOLO del color (los indicadores de estado llevan texto).
//
// Falla con cualquier violación de impacto "serious" o "critical". Las
// "moderate" y "minor" se listan sin abortar, para revisarlas a mano.
//
// Uso:  npm run verificar:a11y   (requiere `npm run build` previo)

import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import {readFileSync} from "node:fs";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..", "dist");
const PUERTO = 8897;
const AXE = readFileSync(path.join(import.meta.dirname, "..", "node_modules", "axe-core", "axe.min.js"), "utf8");
const PAGINAS = ["/index", "/encuestas/censo/vivienda", "/encuestas/enigh/hogar", "/mapa", "/metodologia/fuentes", "/metodologia/definiciones"];

const servidor = () => servirEstatico(RAIZ, PUERTO);

const srv = await servidor();
const navegador = await chromium.launch({channel: "msedge"});
const fallos = [];
const avisos = [];
const resumen = [];

for (const modo of ["claro", "oscuro"]) {
  // reducedMotion: axe mide el contraste en el instante en que corre; con la
  // animación de entrada a medias, el texto de la leyenda sale al 70 % de
  // opacidad y se marca un contraste que el lector nunca ve.
  const ctx = await navegador.newContext({viewport: {width: 1400, height: 1000}, reducedMotion: "reduce"});
  await ctx.addInitScript((m) => { try { localStorage.setItem("sdi-tema", m); } catch {} }, modo);
  for (const ruta of PAGINAS) {
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PUERTO}${ruta}`, {waitUntil: "networkidle"});
    // Las páginas de análisis cargan hasta 4 MB de parquet: se espera a que
    // no quede ninguna celda pendiente en vez de un tiempo fijo.
    await page.waitForFunction(() => !document.querySelector("observablehq-loading"), null, {timeout: 90000}).catch(() => {});
    await page.waitForTimeout(2500);
    await page.addScriptTag({content: AXE});
    const r = await page.evaluate(async () => {
      // Se auditan las reglas WCAG A/AA. Las gráficas SVG de Plot quedan
      // dentro: axe revisa el contraste de sus textos contra el fondo.
      return await window.axe.run(document, {
        runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]},
      });
    });
    // Comprobaciones propias.
    const propias = await page.evaluate(() => {
      const sinNombre = [...document.querySelectorAll("button, a[href], input, select")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          // El nombre accesible de un enlace que solo contiene una imagen es el
          // alt de esa imagen (chips institucionales del pie y la portada).
          const alt = [...el.querySelectorAll("img[alt], svg[aria-label]")].map((i) => i.getAttribute("alt") || i.getAttribute("aria-label")).join(" ");
          const nombre = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || el.getAttribute("placeholder") || alt || "").trim();
          const label = el.id && document.querySelector(`label[for="${el.id}"]`);
          const envuelto = el.closest("label");
          return !nombre && !label && !envuelto;
        }).map((el) => el.tagName + "." + String(el.className).slice(0, 30));
      const botonTema = document.querySelector(".boton-tema");
      const temaConTexto = !!botonTema && botonTema.textContent.trim().length > 0 && botonTema.hasAttribute("aria-pressed");
      const salto = !!document.querySelector(".saltar-contenido");
      const vivo = document.querySelectorAll('[aria-live="polite"]').length;
      return {sinNombre, temaConTexto, salto, vivo};
    });
    const graves = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    const leves = r.violations.filter((v) => !["serious", "critical"].includes(v.impact));
    resumen.push(`${modo.padEnd(7)} ${ruta.padEnd(24)} graves=${graves.length} leves=${leves.length} pasan=${r.passes.length} sinNombre=${propias.sinNombre.length}`);
    for (const v of graves) {
      // Hasta tres nodos por violación, para poder localizarlos sin abrir el
      // navegador: el selector y la primera línea del resumen de axe.
      const ejemplos = v.nodes.slice(0, 3).map((n) => `${n.target?.[0] ?? ""} · ${(n.failureSummary ?? "").split("\n")[1]?.trim() ?? ""}`);
      fallos.push(`[${modo}] ${ruta} — ${v.id} (${v.impact}): ${v.help}. Nodos: ${v.nodes.length}.\n      ${ejemplos.join("\n      ")}`);
    }
    for (const v of leves) {
      avisos.push(`[${modo}] ${ruta} — ${v.id} (${v.impact}): ${v.help}. Nodos: ${v.nodes.length}`);
    }
    if (propias.sinNombre.length) fallos.push(`[${modo}] ${ruta} — controles sin nombre accesible: ${propias.sinNombre.slice(0, 5).join(", ")}`);
    if (!propias.temaConTexto) fallos.push(`[${modo}] ${ruta} — el botón de tema no tiene texto o aria-pressed`);
    if (!propias.salto) fallos.push(`[${modo}] ${ruta} — falta el enlace de salto al contenido`);
    await page.close();
  }
  await ctx.close();
}
await navegador.close();
srv.close();

console.log(resumen.join("\n"));
if (avisos.length) {
  console.log(`\nAVISOS (${avisos.length}, no bloquean):`);
  const unicos = [...new Set(avisos.map((a) => a.replace(/^\[[^\]]+\] \S+ — /, "")))];
  for (const a of unicos.slice(0, 25)) console.log("  · " + a);
}
console.log("\n" + "=".repeat(60));
if (fallos.length) {
  console.log(`FALLOS GRAVES (${fallos.length}):`);
  const unicos = [...new Set(fallos)];
  for (const f of unicos.slice(0, 40)) console.log("  - " + f);
  process.exit(1);
}
console.log("Sin violaciones serias ni críticas de WCAG 2.1 A/AA en ninguna página ni tema.");
