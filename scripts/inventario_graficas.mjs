// Inventario de las secciones de cada página de dist/: título (el del índice),
// forma de cada gráfica según las marcas que dibuja, y la anatomía de sus
// desplegables (orden, x, ancho) cerrados y abiertos. También cuenta las
// líneas dobles entre secciones (un hr con otra línea horizontal a menos de
// 90 px). Uso: node scripts/inventario_graficas.mjs salida.json [/ruta ...]
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import {writeFileSync} from "node:fs";
import path from "node:path";

const PAGINAS = ["/libro/lenguas-de-mexico", "/libro/hablantes-en-el-tiempo", "/libro/variantes", "/libro/lenguas-en-riesgo",
  "/libro/la-ciudad-en-el-pais", "/libro/de-donde-vienen", "/libro/donde-viven", "/libro/colonias-y-marginacion",
  "/libro/quienes-son", "/libro/escuela-y-trabajo", "/libro/salud-y-lengua", "/libro/condiciones-de-vida",
  "/encuestas/censo/vivienda", "/encuestas/enigh/hogar", "/encuestas/endutih/uso", "/encuestas/endutih/actividades",
  "/encuestas/endutih/barreras", "/libro/discriminacion", "/libro/violencia", "/libro/derechos"];
const [salida, ...rutas] = process.argv.slice(2);
const s = await servirEstatico(path.join(import.meta.dirname, "..", "dist"), 8891);
const b = await chromium.launch({channel: "msedge"});
const out = {};
for (const r of (rutas.length ? rutas : PAGINAS)) {
  const p = await b.newPage({viewport: {width: 1366, height: 900}, reducedMotion: "reduce"});
  const errores = [];
  p.on("pageerror", (e) => errores.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !/Byte Serving|content-length/.test(m.text())) errores.push(m.text().slice(0, 160)); });
  await p.goto(`http://127.0.0.1:8891${r}`, {waitUntil: "load", timeout: 180000});
  await p.waitForTimeout(5000);
  // Recorre para que todo entre en pantalla una vez.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await p.waitForTimeout(800);
  out[r] = await p.evaluate(async () => {
    const main = document.querySelector("#observablehq-main");
    const forma = (fig) => {
      const q = (s) => fig.querySelectorAll(s).length;
      const marcas = new Set([...fig.querySelectorAll("svg g[aria-label]")].map((g) => g.getAttribute("aria-label")));
      const k = [];
      if (q('g[aria-label="geo"] path') || fig.querySelector(".maplibregl-canvas")) k.push("mapa");
      if (marcas.has("waffle")) k.push("waffle");
      if (marcas.has("cell")) k.push("heatmap");
      if (marcas.has("link") && marcas.has("dot")) k.push("dumbbell");
      else if (marcas.has("rule") && marcas.has("dot") && !marcas.has("bar")) k.push("lollipop/puntos");
      if (marcas.has("line")) k.push(marcas.has("dot") ? "líneas con puntos" : "líneas");
      if (marcas.has("area")) k.push("área");
      if (marcas.has("bar") && !k.length) {
        // Apiladas: tramos que se tocan lado a lado en un mismo renglón de la
        // pantalla. Agrupadas: dos o más barras por categoría sin tocarse.
        const cajas = [...fig.querySelectorAll('g[aria-label="bar"]:not([fill="none"]) rect')].map((r) => r.getBoundingClientRect()).filter((c) => c.width > 0.5);
        const renglones = new Map();
        for (const c of cajas) { const kk = `${Math.round(c.top)}|${Math.round(c.height)}`; if (!renglones.has(kk)) renglones.set(kk, []); renglones.get(kk).push(c); }
        const apilada = [...renglones.values()].some((cs) => { cs.sort((a, b) => a.left - b.left); return cs.some((c, i) => i > 0 && Math.abs(c.left - cs[i - 1].right) < 2.5); });
        const filasTop = [...renglones.keys()].length;
        // Agrupadas: barras sueltas de dos o más colores (una por grupo).
        const colores = new Set([...fig.querySelectorAll('g[aria-label="bar"]:not([fill="none"]) rect')].map((r) => r.getAttribute("fill") ?? r.parentElement.getAttribute("fill") ?? r.closest("g[fill]")?.getAttribute("fill")));
        const agrupada = !apilada && colores.size >= 2;
        k.push(apilada ? "barras apiladas" : agrupada ? "barras agrupadas" : "barras");
      }
      if (!k.length && marcas.has("dot")) k.push("puntos");
      if (!k.length && fig.querySelector("svg path[fill='none']")) k.push("flujos/otra");
      if (!k.length) k.push(fig.querySelector("svg") ? "otra" : "sin gráfica");
      return k.join(" + ");
    };
    const anclas = [...main.querySelectorAll("h2.toc-anchor")];
    const secciones = [];
    for (let i = 0; i < anclas.length; i++) {
      const ini = anclas[i], fin = anclas[i + 1];
      const nodos = [];
      for (let n = ini.nextElementSibling; n && n !== fin; n = n.nextElementSibling) nodos.push(n);
      const figuras = nodos.flatMap((n) => [...n.querySelectorAll('figure[class^="grafica-"], figure[class*=" grafica-"], .bloque-figura')]).filter((f) => !f.parentElement.closest('figure[class^="grafica-"]'));
      const desp = nodos.flatMap((n) => [...n.querySelectorAll("details.verificado, details.explica-analisis, details.tabla-datos")]);
      const geom = (d) => { const rc = d.getBoundingClientRect(); return {c: d.className.split(" ")[0], x: Math.round(rc.left), w: Math.round(rc.width)}; };
      const cerrados = desp.map(geom);
      // Abiertos: se abre cada uno y se mide.
      const abiertos = [];
      for (const d of desp) { d.open = true; await new Promise((r) => requestAnimationFrame(r)); abiertos.push(geom(d)); d.open = false; }
      const estilo = desp.map((d) => { const c = getComputedStyle(d.querySelector("summary")); return `${c.fontSize}|${c.fontWeight}|${c.paddingTop}|${getComputedStyle(d).borderTopWidth}/${getComputedStyle(d).borderBottomWidth}`; });
      secciones.push({titulo: ini.textContent.trim(), formas: figuras.map(forma), desplegables: cerrados, abiertos, estilos: [...new Set(estilo)]});
    }
    // Líneas dobles: cada hr con otra línea horizontal (borde) cerca arriba.
    const dobles = [];
    for (const hr of main.querySelectorAll(":scope > hr")) {
      const ch = getComputedStyle(hr);
      // Un hr oculto o con la línea transparente no dibuja nada.
      if (ch.display === "none" || ch.borderTopColor === "rgba(0, 0, 0, 0)" || parseFloat(ch.borderTopWidth) === 0) continue;
      const y = hr.getBoundingClientRect().top + scrollY;
      const cerca = [...main.querySelectorAll("*")].filter((e) => {
        if (e === hr || (e.checkVisibility && !e.checkVisibility())) return false;
        const cs = getComputedStyle(e);
        if (parseFloat(cs.borderBottomWidth) < 0.5 || cs.borderBottomStyle === "none") return false;
        const rc = e.getBoundingClientRect(); if (rc.width < 200) return false;
        const yb = rc.bottom + scrollY; return y - yb >= -2 && y - yb < 90;
      });
      if (cerca.length) dobles.push({tras: cerca.at(-1).className || cerca.at(-1).tagName, distancia: Math.round(y - (cerca.at(-1).getBoundingClientRect().bottom + scrollY))});
    }
    return {secciones, dobles};
  });
  out[r].errores = errores;
  await p.close();
}
writeFileSync(salida, JSON.stringify(out, null, 1));
for (const [r, v] of Object.entries(out)) {
  console.log(`\n${r}  (líneas dobles: ${v.dobles.length}; errores: ${v.errores.length}${v.errores.length ? " " + v.errores[0] : ""})`);
  for (const sc of v.secciones) {
    const ord = sc.desplegables.map((d) => d.c.replace("explica-analisis", "explica").replace("tabla-datos", "tabla")).join(">");
    const xs = [...new Set([...sc.desplegables, ...sc.abiertos].map((d) => `${d.x}/${d.w}`))].join(" ");
    console.log(`  ${sc.titulo.slice(0, 48).padEnd(48)} ${sc.formas.join(" | ").padEnd(40)} [${ord}] ${xs} ${sc.estilos.length > 1 ? "ESTILOS:" + sc.estilos.join(" ; ") : ""}`);
  }
}
await b.close(); s.close();
