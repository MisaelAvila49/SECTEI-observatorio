// Verificación de render en navegador real.
//
// Por qué existe: una gráfica sin error en consola puede seguir vacía. El
// build de Framework valida enlaces y sintaxis, no que un Plot haya dibujado
// una sola marca; y un cruce mal hecho entre dos tablas produce un SVG
// perfectamente válido con cero círculos dentro. Este script cuenta las marcas
// REALES de cada página y falla si alguna se queda por debajo de lo esperado.
//
// Comprueba además el modo oscuro, que es lo que no se puede revisar leyendo
// el CSS: la paleta de las gráficas se resuelve en JS (base.js), así que hay
// que abrir la página en cada tema y confirmar que los colores cambiaron de
// verdad. El tema se siembra en localStorage, que es de donde lo lee el sitio,
// y se abre con el `colorScheme` del navegador puesto al CONTRARIO: así se
// comprueba de paso que la preferencia del sistema no manda sobre la elección
// del lector.
//
// Uso:  npm run verificar:render
// Requiere Microsoft Edge o Chrome instalado (usa playwright-core, que ya
// viene con Framework; no descarga navegadores).

import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..", "dist");
const PUERTO = 8899;

// Qué se espera de cada página. `minimo` es el número de marcas por debajo del
// cual la gráfica se considera vacía; se fija con holgura respecto a lo que
// dibuja hoy, para que el script detecte un desplome y no una variación de un
// país que dejó de participar.
const PAGINAS = [
  // Los conteos son de la PÁGINA completa. Cada mínimo se fija por debajo de
  // lo que dibuja hoy, para detectar un desplome (una sección que dejó de
  // pintar) y no una variación chica.
  // El mapa dibuja en canvas (MapLibre), no en SVG: se cuentan los escalones
  // de la leyenda, que solo aparecen cuando los datos cargaron y se pintó.
  {ruta: "/mapa", espera: ".mapa-leyenda-paso", esperado: [
    {nombre: "escalones de la leyenda del mapa", sel: ".mapa-leyenda-paso", minimo: 4},
  ]},
  {ruta: "/index", esperado: [
    {nombre: "puntos y barras de la portada", sel: 'g[aria-label="dot"] circle, g[aria-label="rect"] rect', minimo: 30},
    {nombre: "líneas de la serie", sel: 'g[aria-label="line"] path', minimo: 2},
  ]},
];

const servidor = () => servirEstatico(RAIZ, PUERTO);

// Espera a que la página deje de agregar marcas: las gráficas se pintan tras
// cargar el CSV, así que un conteo inmediato siempre da cero.
// `espera` es un selector propio para páginas sin SVG: el mapa dibuja en
// canvas y se le espera por los escalones de su leyenda.
async function esperarDibujo(page, espera = null) {
  await page.waitForFunction(
    (sel) => document.querySelectorAll(sel ?? "#observablehq-main svg").length > 0,
    espera, {timeout: 30000}
  );
  // El primer SVG no basta: la portada pinta el dumbbell y después, en otras
  // celdas, las dos gráficas de colonias. Se espera a que no quede ninguna
  // celda pendiente y a que el conteo de marcas deje de crecer.
  await page.waitForFunction(() => !document.querySelector("observablehq-loading"), null, {timeout: 60000}).catch(() => {});
  let antes = -1;
  for (let i = 0; i < 12; i++) {
    const n = await page.evaluate(() => document.querySelectorAll("#observablehq-main svg circle, #observablehq-main svg rect, #observablehq-main svg path").length);
    if (n === antes) break;
    antes = n;
    await page.waitForTimeout(700);
  }
}

const fallos = [];
const s = await servidor();
const navegador = await chromium.launch({channel: "msedge"});

// Se prueban dos anchos porque el layout de Framework cambia dos veces: el
// índice desaparece por debajo de 1250 px y el sidebar se despega por debajo de
// 1024 px. El desbordamiento de las gráficas anchas dependía justo de eso, y a
// 1500 px no se notaba tanto como a 1280.
const VISTAS = [
  {nombre: "1500", ancho: 1500, alto: 1000},
  {nombre: "1280", ancho: 1280, alto: 900},
];

// El tema NO se fija con `colorScheme` del navegador: el tablero ignora la
// preferencia del sistema a propósito y lee su propio `localStorage`, que es lo
// que escribe el botón del sidebar. Se siembra antes de cargar la página, con
// `addInitScript`, para que el tema esté puesto antes del primer pintado, igual
// que en el uso real.
async function contexto(modo, ancho, alto) {
  // colorScheme opuesto al que se prueba: así se comprueba de paso que la
  // preferencia del sistema NO manda. Si algún día el sitio volviera a leerla,
  // esta prueba lo delata.
  const ctx = await navegador.newContext({
    colorScheme: modo === "claro" ? "dark" : "light",
    viewport: {width: ancho, height: alto},
  });
  await ctx.addInitScript((m) => {
    try {
      localStorage.setItem("sdi-tema", m);
    } catch (e) {
      /* sin almacenamiento: la página caerá al claro por omisión */
    }
  }, modo);
  return ctx;
}

for (const {nombre: vista, ancho, alto} of VISTAS)
for (const modo of ["claro", "oscuro"]) {
  const ctx = await contexto(modo, ancho, alto);
  console.log(`\n=== modo ${modo} · ${vista}px ===`);

  for (const pag of PAGINAS) {
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(String(e.message)));
    page.on("console", (m) => {
      if (m.type() === "error") errores.push(m.text());
    });

    await page.goto(`http://127.0.0.1:${PUERTO}${pag.ruta}`, {waitUntil: "networkidle"});
    await esperarDibujo(page, pag.espera ?? null);

    // Conteo global por tipo de marca. Se cuenta sobre TODA la página y no por
    // sección, porque los componentes no exponen un identificador estable por
    // gráfica; el mínimo se fija en consecuencia.
    const conteo = await page.evaluate(() => {
      const q = (s) => document.querySelectorAll(`#observablehq-main ${s}`).length;
      return {
        svg: q("svg"),
        celdas: q('g[aria-label="cell"] rect'),
        puntos: q('g[aria-label="dot"] circle'),
        lineas: q('g[aria-label="line"] path'),
        geo: q('g[aria-label="geo"] path'),
        enlaces: q('g[aria-label="link"] path'),
        vacios: [...document.querySelectorAll("#observablehq-main svg")]
          .filter((s) => s.querySelectorAll("rect, circle, path, line").length === 0).length,
      };
    });

    const marcas = conteo.celdas + conteo.puntos + conteo.lineas + conteo.geo + conteo.enlaces;
    const ok = pag.esperado.length === 0 || marcas > 0;
    console.log(
      `${ok ? "ok " : "FALLA"} ${pag.ruta.padEnd(24)} svg=${String(conteo.svg).padStart(3)} ` +
      `celdas=${String(conteo.celdas).padStart(4)} puntos=${String(conteo.puntos).padStart(4)} ` +
      `lineas=${String(conteo.lineas).padStart(4)} geo=${String(conteo.geo).padStart(4)} ` +
      `vacios=${conteo.vacios}`
    );

    for (const e of pag.esperado) {
      const n = await page.evaluate(
        (sel) => document.querySelectorAll(`#observablehq-main ${sel}`).length, e.sel);
      if (n < e.minimo) {
        fallos.push(`[${modo} ${vista}px] ${pag.ruta} — ${e.nombre}: ${n} marcas, se esperaban ${e.minimo} o más`);
      }
    }
    if (conteo.vacios > 0) {
      fallos.push(`[${modo} ${vista}px] ${pag.ruta} — ${conteo.vacios} SVG sin una sola marca dentro`);
    }

    // Desbordamiento. Las gráficas anchas se salen de la columna de texto a
    // propósito, pero deben caber entre el sidebar y el índice. El cálculo
    // usaba `100vw`, que incluye ambas columnas, y la gráfica quedaba medio
    // tapada por el sidebar: un fallo que el conteo de marcas no ve, porque
    // todas estaban dibujadas.
    const desbordes = await page.evaluate(() => {
      const lim = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return getComputedStyle(e).display === "none" || r.width < 3 ? null : r;
      };
      const sb = lim("#observablehq-sidebar");
      const toc = lim("#observablehq-toc");
      const out = [];
      for (const f of document.querySelectorAll("#observablehq-main figure, #observablehq-main .panel-filtros")) {
        const r = f.getBoundingClientRect();
        if (r.width < 3) continue;
        const clase = (f.className || "").toString().split(" ")[0];
        if (sb && r.left < sb.right - 1) out.push({clase, lado: "sidebar", px: Math.round(sb.right - r.left)});
        if (toc && r.right > toc.left + 1) out.push({clase, lado: "índice", px: Math.round(r.right - toc.left)});
        if (r.right > window.innerWidth + 1) out.push({clase, lado: "ventana", px: Math.round(r.right - window.innerWidth)});
      }
      return out;
    });
    for (const d of desbordes) {
      fallos.push(`[${modo} ${vista}px] ${pag.ruta} — «${d.clase}» invade ${d.lado} por ${d.px}px`);
    }
    for (const err of errores) {
      // El favicon y los mapas de fuentes no son errores de la página.
      if (/favicon|sourcemap|Download the React/i.test(err)) continue;
      fallos.push(`[${modo} ${vista}px] ${pag.ruta} — error en consola: ${err.slice(0, 160)}`);
    }
    await page.close();
  }
  await ctx.close();
}

// El modo oscuro no se puede verificar leyendo el CSS: la paleta de las
// gráficas la resuelve base.js en tiempo de ejecución. Se comparan los colores
// que quedaron ESCRITOS dentro del SVG en cada modo.
console.log("\n=== paleta de las gráficas por modo ===");
const muestras = {};
for (const modo of ["claro", "oscuro"]) {
  const ctx = await contexto(modo, 1500, 1000);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PUERTO}/index`, {waitUntil: "networkidle"});
  await esperarDibujo(page);
  muestras[modo] = await page.evaluate(() => {
    const cuerpo = getComputedStyle(document.body);
    const marcas = [...document.querySelectorAll("#observablehq-main svg [fill], #observablehq-main svg [stroke]")]
      .map((n) => n.getAttribute("fill") || n.getAttribute("stroke"))
      .filter((c) => c && c.startsWith("#"));
    return {
      fondoPagina: cuerpo.backgroundColor,
      tintaPagina: cuerpo.color,
      // Sin recortar: la lista se usa para detectar colores por omisión de
      // Plot, y un `slice` los escondería justo cuando son muchos.
      coloresUnicos: [...new Set(marcas.map((c) => c.toLowerCase()))],
    };
  });
  console.log(`${modo.padEnd(6)} fondo=${muestras[modo].fondoPagina} tinta=${muestras[modo].tintaPagina}`);
  console.log(`       colores en SVG (${muestras[modo].coloresUnicos.length}): ${muestras[modo].coloresUnicos.slice(0, 14).join(" ")}`);
  await ctx.close();
}

// Colores por omisión de Observable Plot (esquemas Tableau10 / Category10).
// Que aparezca uno significa que alguna marca se quedó sin color explícito, y
// eso es un fallo silencioso doble: el color no está validado para daltonismo
// y además es fijo, así que no cambia con el modo oscuro.
const POR_OMISION = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f",
                     "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"];
for (const modo of ["claro", "oscuro"]) {
  const intrusos = muestras[modo].coloresUnicos
    .filter((c) => POR_OMISION.includes(c.toLowerCase()));
  if (intrusos.length) {
    fallos.push(
      `[${modo} ${vista}px] Colores por omisión de Plot en el SVG: ${intrusos.join(", ")}. ` +
      `Alguna marca no declara su color y quedó con el esquema por defecto.`);
  }
}

if (muestras.claro.fondoPagina === muestras.oscuro.fondoPagina) {
  fallos.push("El fondo de la página es idéntico en claro y oscuro: el tema oscuro no se aplicó.");
}
if (JSON.stringify(muestras.claro.coloresUnicos) === JSON.stringify(muestras.oscuro.coloresUnicos)) {
  fallos.push("Las gráficas usan exactamente los mismos colores en claro y en oscuro: la paleta no cambió.");
}

await navegador.close();
s.close();

console.log("\n" + "=".repeat(60));
if (fallos.length) {
  console.log(`FALLOS (${fallos.length}):`);
  for (const f of fallos) console.log("  - " + f);
  process.exit(1);
}
console.log("Todas las páginas dibujan marcas y el modo oscuro cambia paleta y superficie.");
