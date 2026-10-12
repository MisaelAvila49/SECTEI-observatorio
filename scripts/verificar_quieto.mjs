// verificar_quieto.mjs: el panel de filtros pegajoso no puede hacer temblar la
// página. Para cada sección con panel pegajoso se deja la ventana en varias
// posiciones cerca del final de la sección (de 300 a 0 px antes de que empiece
// la siguiente, cada 20 px) y, con la página quieta 1 s, se cuentan los cambios
// de clase o estado de los paneles y los cambios de scrollY. Tiene que dar 0 en
// todas las posiciones, en 1366 x 768 y en 1920 x 1080.
//
// Uso: node scripts/verificar_quieto.mjs [ruta ...]   (sobre dist/, tras el build)
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import path from "node:path";

const PUERTO = 8899;
const PAGINAS = process.argv.slice(2).length ? process.argv.slice(2) : [
  "/libro/lenguas-de-mexico", "/libro/hablantes-en-el-tiempo", "/libro/variantes", "/libro/lenguas-en-riesgo",
  "/libro/la-ciudad-en-el-pais", "/libro/de-donde-vienen", "/libro/donde-viven", "/libro/colonias-y-marginacion",
  "/libro/quienes-son", "/libro/escuela-y-trabajo", "/libro/salud-y-lengua", "/libro/condiciones-de-vida",
  "/encuestas/censo/vivienda", "/encuestas/enigh/hogar", "/encuestas/endutih/uso", "/encuestas/endutih/actividades",
  "/encuestas/endutih/barreras", "/libro/discriminacion", "/libro/violencia",
];
const VENTANAS = [[1366, 768], [1920, 1080]];
const PASOS = Array.from({length: 16}, (_, i) => 300 - 20 * i); // 300, 280, ..., 0

const srv = await servirEstatico(path.join(process.cwd(), "dist"), PUERTO);
const b = await chromium.launch({channel: "msedge"});

async function revisarPagina(ruta, [w, h]) {
  const p = await b.newPage({viewport: {width: w, height: h}});
  await p.goto(`http://127.0.0.1:${PUERTO}${ruta}`, {waitUntil: "networkidle", timeout: 120000});
  await p.waitForTimeout(2500);
  // Una pasada completa primero: dibuja todo y agota las entradas de una vez.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } scrollTo(0, 0); });
  await p.waitForTimeout(1500);
  const nSec = await p.evaluate(() => document.querySelectorAll("#observablehq-main .panel-filtros[data-compacto]").length);
  const resultados = [];
  for (let i = 0; i < nSec; i++) {
    for (const d of PASOS) {
      const r = await p.evaluate(async ({i, d}) => {
        const panel = document.querySelectorAll("#observablehq-main .panel-filtros[data-compacto]")[i];
        const seccion = panel.parentElement;
        const fin = seccion.getBoundingClientRect().bottom + scrollY; // donde empieza lo que sigue
        const y = Math.max(0, Math.round(fin - d));
        scrollTo(0, y);
        await new Promise((res) => setTimeout(res, 500)); // asentarse tras el salto
        let cambiosClase = 0, cambiosScroll = 0, ultimoY = scrollY, sigue = true;
        const mo = new MutationObserver((ms) => { cambiosClase += ms.length; });
        for (const el of document.querySelectorAll("#observablehq-main .panel-filtros[data-compacto]")) mo.observe(el, {attributes: true, attributeFilter: ["class", "style"]});
        const mirar = () => { if (!sigue) return; if (scrollY !== ultimoY) { cambiosScroll++; ultimoY = scrollY; } requestAnimationFrame(mirar); };
        requestAnimationFrame(mirar);
        await new Promise((res) => setTimeout(res, 1000));
        sigue = false; mo.disconnect();
        return {d, y, cambiosClase, cambiosScroll, pegado: panel.classList.contains("pegado")};
      }, {i, d});
      resultados.push({seccion: i + 1, ...r});
    }
  }
  await p.close();
  return {nSec, resultados};
}

let totalPos = 0, totalMalas = 0;
const malas = [];
for (const v of VENTANAS) {
  console.log(`\n=== ${v[0]} x ${v[1]} ===`);
  // Cuatro páginas en paralelo para no tardar media hora.
  const cola = [...PAGINAS];
  const trabajo = async () => {
    while (cola.length) {
      const ruta = cola.shift();
      const {nSec, resultados} = await revisarPagina(ruta, v);
      const m = resultados.filter((r) => r.cambiosClase || r.cambiosScroll);
      totalPos += resultados.length; totalMalas += m.length;
      const sumaC = resultados.reduce((s, r) => s + r.cambiosClase, 0), sumaS = resultados.reduce((s, r) => s + r.cambiosScroll, 0);
      console.log(`${m.length ? "FALLA" : "ok   "} ${ruta.padEnd(32)} secciones=${String(nSec).padStart(2)} posiciones=${String(resultados.length).padStart(3)} con cambios=${String(m.length).padStart(3)} clase=${sumaC} scrollY=${sumaS}`);
      for (const r of m) malas.push(`${v[0]}x${v[1]} ${ruta} sección ${r.seccion} a ${r.d} px del final: clase ${r.cambiosClase}, scrollY ${r.cambiosScroll}`);
    }
  };
  await Promise.all([trabajo(), trabajo(), trabajo(), trabajo()]);
}
await b.close(); srv.close();
console.log("\n" + "=".repeat(60));
console.log(`Posiciones revisadas: ${totalPos}; con cambios: ${totalMalas}`);
for (const m of malas.slice(0, 40)) console.log("  " + m);
if (totalMalas) { console.log("El panel pegajoso mueve la página en reposo."); process.exit(1); }
console.log("Ninguna posición cambia de clase ni de scroll en reposo.");
