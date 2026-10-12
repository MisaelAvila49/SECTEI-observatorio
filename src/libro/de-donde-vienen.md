---
title: De dónde vienen
---

```js
// Página con la misma anatomía que el resto del libro: cada análisis es una
// sección con su panel de filtros, su figura (título, subtítulo, pie de una
// frase y descarga) y los tres desplegables. Los componentes del prototipo de
// capítulo (components/capitulo/) ya no se importan aquí.
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {conDescarga} from "../components/descargar.js";
import {punto, ejePct, COLOR_UNICO, ROJO, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";
import {burbujas, lollipop, sankey} from "../components/formas.js";

const [geoEntidades, lenguasAlc, origen, fuentesCsv, verificacionesCsv, calculadoCsv] = await Promise.all([
  FileAttachment("../data/mx_entidades.json").json(),
  FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("../data/lenguas_origen.csv").csv({typed: true}),
  FileAttachment("../data/fuentes.csv").csv(),
  FileAttachment("../data/verificaciones.csv").csv(),
  FileAttachment("../data/calculado.csv").csv(),
]);
const fuenteDe = procedencia({fuentes: fuentesCsv, verificaciones: verificacionesCsv, calculado: calculadoCsv});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
// El subtítulo arranca con los filtros activos («Náhuatl · …»); sin filtros,
// la primera letra va en mayúscula.
const fig = (o, hijos) => figura({...o, subtitulo: o.subtitulo ? o.subtitulo[0].toUpperCase() + o.subtitulo.slice(1) : ""}, hijos);
const DATOS_MUESTRAS = ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
```

```js
// Las gráficas ocupan todo el ancho de la columna, hasta 1,320 px; el mapa se
// topa en 980 px y el alto de las líneas crece con el ancho.
const anchoG = Math.min(1320, width);
const anchoMapa = Math.min(980, anchoG);
const altoLinea = Math.round(Math.min(400, Math.max(240, anchoG * 0.3)));
```

<header class="encabezado-capitulo">
  <p class="antetitulo">Parte 2 · La ciudad · 2 de 4</p>
  <h1>De dónde <span class="h1-clave">vienen</span></h1>
  <p class="entradilla">Las lenguas viajan con las personas. Esta página sigue el camino: en qué entidad nacieron los hablantes que viven en la ciudad, en qué alcaldía viven y quiénes llegaron hace poco.</p>
</header>

---

<h2 id="de-donde-vienen" class="toc-anchor">De dónde vienen quienes hablan</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">01</span> De dónde vienen quienes hablan</span>
  <p class="seccion-entrada">El lugar de nacimiento distingue dos historias: la de quienes nacieron en la ciudad y la de quienes llegaron de otra entidad. Se miden por separado porque cada una plantea necesidades distintas.</p>
</header>

```js
const nac = origen.filter((r) => r.tipo === "nacimiento").map((r) => ({...r, anio: Number(r.anio), ent: String(r.ent).padStart(3, "0"), lengua: String(r.lengua).padStart(4, "0"), cve_alc: String(r.cve_alc).padStart(3, "0")}));
const aniosO = [...new Set(nac.map((r) => r.anio))].sort();
// Opciones compartidas: lenguas ordenadas por hablantes en la última edición
// y alcaldías por nombre.
const nombreAlcO = new Map(lenguasAlc.filter((r) => r.nivel === "alcaldia").map((r) => [String(r.cve).padStart(3, "0"), r.nombre]));
const lenguasO = [...d3.rollup(nac.filter((r) => r.anio === aniosO.at(-1) && r.lengua < "8000"), (v) => ({num: d3.sum(v, (r) => r.num), nombre: v[0].lengua_nombre}), (r) => r.lengua).entries()].sort((a, b) => b[1].num - a[1].num);
const OPC_LEN = [{clave: "", etiqueta: "Todas las lenguas", grupo: "En conjunto"}, ...lenguasO.map(([k, d]) => ({clave: k, etiqueta: d.nombre, grupo: "Una a una"}))];
const OPC_ALC = [{clave: "", etiqueta: "Toda la ciudad", grupo: "En conjunto"}, ...[...nombreAlcO.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))];
const nombreLen = (k) => lenguasO.find(([c]) => c === k)?.[1].nombre ?? k;
// Subtítulo con los filtros activos: "Náhuatl · Iztapalapa · ".
const quienesO = (len, alc) => `${len ? `${nombreLen(len)} · ` : ""}${alc ? `${nombreAlcO.get(alc)} · ` : ""}`;
const enOtraEntidad = (r) => r.ent !== "009" && r.ent <= "032";
const selAnioO = campo({id: "c2o-anio", nombre: "anio", etiqueta: "Año", opciones: aniosO.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosO.at(-1))});
const selLenO = campo({id: "c2o-len", nombre: "lengua", etiqueta: "Lengua", opciones: OPC_LEN, valor: ""});
const selAlcO = campo({id: "c2o-alc", nombre: "alcaldia", etiqueta: "Alcaldía donde viven", opciones: OPC_ALC, valor: ""});
const panelO = html`<div class="panel-filtros"><div class="panel-campos">${selAnioO}${selLenO}${selAlcO}</div></div>`;
const cuerpoO = document.createElement("div");
function pintarO() {
  const anio = Number(selAnioO.value), len = selLenO.value, alc = selAlcO.value;
  const base = nac.filter((r) => (!len || r.lengua === len) && (!alc || r.cve_alc === alc));
  const fuera = aniosO.map((a) => {
    const f = base.filter((r) => r.anio === a);
    const tot = f.reduce((s, r) => s + r.num, 0);
    const ciu = f.filter((r) => r.ent === "009").reduce((s, r) => s + r.num, 0);
    return {anio: a, total: tot, ciudad: ciu, nacidosFuera: tot - ciu, pctFuera: tot ? 100 * (tot - ciu) / tot : 0};
  }).filter((r) => r.total > 0);
  const sel = fuera.find((r) => r.anio === anio);
  const lugar = alc ? nombreAlcO.get(alc) : "la ciudad";
  const quienes = quienesO(len, alc);
  const porEntidad = (a) => [...d3.rollup(base.filter((r) => r.anio === a && enOtraEntidad(r)), (v) => ({num: d3.sum(v, (r) => r.num), nombre: v[0].ent_nombre}), (r) => r.ent.slice(1)).entries()];
  // Escala fija de los círculos: el máximo de todas las ediciones en la selección.
  const tope = Math.max(1, ...aniosO.flatMap((a) => porEntidad(a).map(([, d]) => d.num)));
  const entNac = sel ? porEntidad(anio).map(([cve, d]) => ({cve, ...d, share: 100 * d.num / sel.total})).sort((a, b) => b.num - a.num) : [];
  const nodos = [];
  if (sel) nodos.push(kpis([
    {etiqueta: `Hablantes nacidos fuera de la ciudad, ${anio}`, cifra: pct(sel.pctFuera), nota: `${entero(sel.nacidosFuera)} de ${entero(sel.total)} hablantes`},
    {etiqueta: "Nacidos en la ciudad", cifra: entero(sel.ciudad), nota: "hablantes de lengua indígena"},
    {etiqueta: "Entidad de origen mayor", cifra: entNac[0]?.nombre ?? "", nota: entNac[0] ? `${pct(entNac[0].share)} de los hablantes` : ""},
  ]));
  else nodos.push(html`<p class="beta-nota">Sin hablantes en la muestra de ${anio} para esta selección.</p>`);
  // Mapa de burbujas: la pregunta es dónde (conteos por entidad).
  if (entNac.length) nodos.push(conDescarga(fig({titulo: `En qué entidad nacieron los hablantes que viven en ${lugar}, ${anio}`,
    subtitulo: `${quienes}el área de cada círculo es proporcional al número de hablantes nacidos en esa entidad, con la misma escala en todas las ediciones`,
    pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada círculo es una entidad de nacimiento"},
    [burbujas(entNac, geoEntidades, {ancho: anchoMapa, tope, renglones: [["Entidad de nacimiento", (r) => r.nombre], ["Parte de los hablantes", (r) => pct(r.share)], ["Hablantes", (r) => entero(r.num)]]})])));
  // Línea: el cambio entre ediciones de la parte nacida fuera.
  if (fuera.length) nodos.push(conDescarga(fig({titulo: `Hablantes que viven en ${lugar} y nacieron fuera de la Ciudad de México, por edición`,
    subtitulo: `${quienes}porcentaje de los hablantes de lengua indígena que viven en ${lugar} y nacieron en otra entidad o en otro país; en rojo, la edición elegida`,
    pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una edición"},
    [Plot.plot({height: altoLinea, width: anchoG, marginLeft: 50, x: {label: null, ticks: aniosO, tickFormat: (d) => String(d), domain: [aniosO[0] - 1, aniosO.at(-1) + 1]}, y: ejePct(null, {domain: [0, 100]}),
      marks: [Plot.line(fuera, {x: "anio", y: "pctFuera", stroke: COLOR_UNICO, strokeWidth: 2}),
        Plot.dot(fuera, {x: "anio", y: "pctFuera", fill: (r) => (r.anio === anio ? ROJO : COLOR_UNICO), r: (r) => (r.anio === anio ? 6 : 4.5)}),
        Plot.text(fuera, {x: "anio", y: "pctFuera", text: (r) => `${r.pctFuera.toFixed(0)} %`, dy: -10, fontSize: 11}),
        Plot.tip(fuera, Plot.pointerX({x: "anio", y: "pctFuera", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Nacidos fuera de la ciudad", (r) => pct(r.pctFuera)], ["Hablantes nacidos fuera", (r) => entero(r.nacidosFuera)]])})),
        Plot.ruleY([0])]})])));
  nodos.push(html`<p class="beta-nota">El mapa de origen, con una flecha por entidad y la variante probable de cada lengua, está en <a href="../mapa">el mapa</a>: elige una lengua y pulsa «Ver de dónde vienen».</p>`,
    fuenteDe({datos: DATOS_MUESTRAS.filter((d) => !d.includes("2005")), cotejos: ["hli_nacidos_fuera_2020"], lectura: ["R-SEPI-2024-DIV"]}),
    explicacion("El censo pregunta en qué entidad o país nació cada persona. Aquí se toma a los hablantes de lengua indígena que viven en la ciudad y se cuenta qué parte nació fuera de ella; el denominador es el total de hablantes de la ciudad (o de la alcaldía elegida). Es una medida de origen, no de fecha de llegada: alguien nacido en Oaxaca pudo llegar hace cincuenta años o el año pasado. Al elegir una lengua o una alcaldía la muestra se reduce y las cifras de entidades con pocos casos son inestables. La serie de lugar de nacimiento no tiene dato de 2005."),
    tablaColumnas(entNac, [{etiqueta: "Entidad de nacimiento", valor: (r) => r.nombre}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los hablantes", num: true, valor: (r) => r.share.toFixed(2)}], {titulo: "Ver todas las entidades"}));
  cuerpoO.replaceChildren(...nodos);
}
panelO.addEventListener("input", pintarO);
alCambiarModo(() => pintarO());
pintarO();
display(html`<section class="beta-seccion">${panelO}${cuerpoO}</section>`);
```

---

<h2 id="en-que-alcaldia" class="toc-anchor">En qué alcaldía viven</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">02</span> En qué alcaldía viven</span>
  <p class="seccion-entrada">Quienes nacieron en otra entidad no se reparten por igual en la ciudad. Saber en qué alcaldías viven sirve para decidir dónde ofrecer servicios en sus lenguas.</p>
</header>

```js
// Ranking de alcaldías (lollipop: dieciséis categorías ordenadas).
const nacA = nac.filter(enOtraEntidad);
const entidadesA = [...d3.rollup(nacA.filter((r) => r.anio === aniosO.at(-1)), (v) => ({num: d3.sum(v, (r) => r.num), nombre: v[0].ent_nombre}), (r) => r.ent).entries()].sort((a, b) => b[1].num - a[1].num);
const selAnioA = campo({id: "c2a-anio", nombre: "anio", etiqueta: "Año", opciones: aniosO.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosO.at(-1))});
const selLenA = campo({id: "c2a-len", nombre: "lengua", etiqueta: "Lengua", opciones: OPC_LEN, valor: ""});
const selEntA = campo({id: "c2a-ent", nombre: "entidad", etiqueta: "Entidad de nacimiento", opciones: [{clave: "", etiqueta: "Todas las entidades", grupo: "En conjunto"}, ...entidadesA.map(([k, d]) => ({clave: k, etiqueta: d.nombre, grupo: "Una a una"}))], valor: ""});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${selAnioA}${selLenA}${selEntA}</div></div>`;
const cuerpoA = document.createElement("div");
function pintarA() {
  const anio = Number(selAnioA.value), len = selLenA.value, ent = selEntA.value;
  const base = nacA.filter((r) => (!len || r.lengua === len) && (!ent || r.ent === ent));
  const porAlc = (a) => [...d3.rollup(base.filter((r) => r.anio === a), (v) => d3.sum(v, (r) => r.num), (r) => r.cve_alc).entries()];
  // Eje fijo: el máximo de todas las ediciones con la misma lengua y entidad.
  const tope = Math.max(1, ...aniosO.flatMap((a) => porAlc(a).map(([, n]) => n))) * 1.15;
  const filas = porAlc(anio);
  const total = d3.sum(filas, ([, n]) => n);
  const datos = filas.map(([cve, n]) => ({cve, nombre: nombreAlcO.get(cve) ?? cve, valor: n, num: n, share: total ? 100 * n / total : 0})).sort((a, b) => b.valor - a.valor);
  const quien = `${len ? `${nombreLen(len)} · ` : ""}${ent ? `nacidos en ${entidadesA.find(([k]) => k === ent)?.[1].nombre} · ` : ""}`;
  cuerpoA.replaceChildren(
    datos.length ? kpis([
      {etiqueta: `Alcaldía con más hablantes nacidos en otra entidad, ${anio}`, cifra: datos[0].nombre, nota: `${pct(datos[0].share)} de ellos`},
      {etiqueta: "Hablantes nacidos en otra entidad", cifra: entero(total), nota: "que viven en la ciudad"},
    ]) : html`<p class="beta-nota">Sin hablantes en la muestra de ${anio} para esta selección.</p>`,
    datos.length ? conDescarga(fig({titulo: `En qué alcaldía viven los hablantes nacidos en otra entidad, ${anio}`,
      subtitulo: `${quien}hablantes de lengua indígena de 5 años y más; misma escala en todas las ediciones`,
      pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una alcaldía y su tallo, sus hablantes"},
      [lollipop(datos, {ancho: anchoG, dominio: [0, tope], margenIzq: 170, etiquetaX: "hablantes", formato: (v) => entero(v),
        renglones: [["Alcaldía", (r) => r.nombre], ["Parte de los nacidos fuera", (r) => pct(r.share)], ["Hablantes", (r) => entero(r.num)]]})])) : "",
    fuenteDe({datos: DATOS_MUESTRAS.filter((d) => !d.includes("2005")), cotejos: ["hli_nacidos_fuera_2020"], lectura: ["R-SEPI-2024-DIV"]}),
    explicacion("Se cuenta a los hablantes de lengua indígena que viven en cada alcaldía y nacieron en otra entidad del país. El porcentaje es la parte de todos los nacidos fuera que vive en esa alcaldía, así que las dieciséis suman 100. Una alcaldía grande puede tener muchos hablantes y una parte chica de su población; la parte de la población de cada alcaldía está en la página «Dónde viven»."),
    tablaColumnas(datos, [{etiqueta: "Alcaldía", valor: (r) => r.nombre}, {etiqueta: "Hablantes nacidos en otra entidad", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los nacidos fuera", num: true, valor: (r) => r.share.toFixed(2)}], {titulo: "Ver las dieciséis alcaldías"}));
}
panelA.addEventListener("input", pintarA);
alCambiarModo(() => pintarA());
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="a-donde-llegan" class="toc-anchor">De su entidad a su alcaldía</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">03</span> De su entidad a su alcaldía</span>
  <p class="seccion-entrada">Esta gráfica une cada entidad de nacimiento con las alcaldías donde viven sus hablantes. Sirve para ver si quienes vienen del mismo lugar viven en las mismas zonas de la ciudad.</p>
</header>

```js
// Sankey: la pregunta es de dónde a dónde.
const nacS = nacA;
const aniosS = [...new Set(nacS.map((r) => r.anio))].sort();
const TOPE_S = 7;
const sumaS = (filas, k) => { const m = new Map(); for (const r of filas) m.set(r[k], (m.get(r[k]) ?? 0) + r.num); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const entUltimo = sumaS(nacS.filter((r) => r.anio === aniosS.at(-1)), "ent_nombre").slice(0, TOPE_S).map(([n]) => n);
const selAnioS = campo({id: "c2s-anio", nombre: "anio", etiqueta: "Año", opciones: aniosS.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosS.at(-1))});
const selEntS = campo({id: "c2s-ent", nombre: "entidad", etiqueta: "Resaltar entidad de nacimiento", opciones: [{clave: "", etiqueta: "Ninguna"}, ...entUltimo.map((n) => ({clave: n, etiqueta: n}))], valor: entUltimo[0] ?? ""});
const selLenS = campo({id: "c2s-len", nombre: "lengua", etiqueta: "Lengua", opciones: OPC_LEN, valor: ""});
const panelS = html`<div class="panel-filtros"><div class="panel-campos">${selAnioS}${selLenS}${selEntS}</div></div>`;
const cuerpoS = document.createElement("div");
function pintarS() {
  const anio = Number(selAnioS.value);
  const len = selLenS.value;
  const f = nacS.filter((r) => r.anio === anio && (!len || r.lengua === len));
  const total = f.reduce((s, r) => s + r.num, 0);
  if (!total) { cuerpoS.replaceChildren(html`<p class="beta-nota">Sin hablantes nacidos en otra entidad en la muestra de ${anio} para esta lengua.</p>`); return; }
  const origenes = sumaS(f, "ent_nombre").slice(0, TOPE_S).map(([n]) => n);
  const destinos = sumaS(f.map((r) => ({...r, alc: nombreAlcO.get(r.cve_alc) ?? r.cve_alc})), "alc").slice(0, TOPE_S).map(([n]) => n);
  const o = (r) => (origenes.includes(r.ent_nombre) ? r.ent_nombre : "Otras entidades");
  const d = (r) => { const n = nombreAlcO.get(r.cve_alc) ?? r.cve_alc; return destinos.includes(n) ? n : "Otras alcaldías"; };
  const flujos = new Map();
  for (const r of f) { const k = `${o(r)}|${d(r)}`; flujos.set(k, (flujos.get(k) ?? 0) + r.num); }
  const enlaces = [...flujos.entries()].map(([k, value]) => { const [a, b] = k.split("|"); return {source: `o:${a}`, target: `d:${b}`, value}; }).filter((e) => e.value > 0);
  const nodos = [...[...origenes, "Otras entidades"].map((n) => ({id: `o:${n}`, nombre: n})), ...[...destinos, "Otras alcaldías"].map((n) => ({id: `d:${n}`, nombre: n}))]
    .filter((n) => enlaces.some((e) => e.source === n.id || e.target === n.id));
  const destacado = selEntS.value && nodos.some((n) => n.id === `o:${selEntS.value}`) ? `o:${selEntS.value}` : null;
  cuerpoS.replaceChildren(
    conDescarga(fig({titulo: `De qué entidad nacieron y en qué alcaldía viven los hablantes, ${anio}`,
      subtitulo: `${len ? `Hablantes de ${nombreLen(len)}` : "Hablantes de lengua indígena"} nacidos en otra entidad · las ${TOPE_S} entidades y alcaldías con más hablantes; las demás, agrupadas${selEntS.value ? ` · resaltada: ${selEntS.value}` : ""}`,
      pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · el grosor de cada flujo es proporcional al número de hablantes"},
      [sankey({nodos, enlaces}, {ancho: anchoG, alto: Math.round(Math.min(600, Math.max(420, anchoG * 0.45))), destacado,
        renglonesEnlace: [["Nacieron en", (l) => l.source.nombre], ["Viven en", (l) => l.target.nombre], ["Parte de los nacidos fuera", (l) => pct(100 * l.value / total)], ["Hablantes", (l) => entero(l.value)]]})])),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["hli_nacidos_fuera_2020"], lectura: ["R-SEPI-2024-DIV"]}),
    explicacion("A la izquierda, la entidad donde nacieron los hablantes de lengua indígena que viven en la ciudad; a la derecha, la alcaldía donde viven. Cada flujo une un lugar de nacimiento con una alcaldía, y su grosor es el número de hablantes. Se muestran las siete entidades y las siete alcaldías con más hablantes; las demás se agrupan. El denominador de cada porcentaje es el total de hablantes nacidos en otra entidad que viven en la ciudad."),
    tablaColumnas(enlaces.map((e) => ({de: e.source.slice(2), a: e.target.slice(2), num: e.value})).sort((x, y) => y.num - x.num), [{etiqueta: "Nacieron en", valor: (r) => r.de}, {etiqueta: "Viven en", valor: (r) => r.a}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los nacidos fuera", num: true, valor: (r) => (100 * r.num / total).toFixed(2)}], {titulo: "Ver todos los flujos"}));
}
panelS.addEventListener("input", pintarS);
alCambiarModo(() => pintarS());
pintarS();
display(html`<section class="beta-seccion">${panelS}${cuerpoS}</section>`);
```

---

<h2 id="llegadas-recientes" class="toc-anchor">Quiénes llegaron en los últimos cinco años</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">04</span> Quiénes llegaron en los últimos cinco años</span>
  <p class="seccion-entrada">Nacer en otra entidad no dice cuándo se llegó. La pregunta sobre dónde se vivía cinco años antes separa la llegada reciente de la antigua, y muestra de dónde y con qué lenguas siguen llegando hablantes.</p>
</header>

```js
const res5 = origen.filter((r) => r.tipo === "residencia5").map((r) => ({...r, anio: Number(r.anio), ent: String(r.ent).padStart(3, "0"), lengua: String(r.lengua).padStart(4, "0"), cve_alc: String(r.cve_alc).padStart(3, "0")}));
const aniosR = [...new Set(res5.map((r) => r.anio))].sort();
const sumaPor = (filas, campoK) => { const m = new Map(); for (const r of filas) m.set(r[campoK], (m.get(r[campoK]) ?? 0) + r.num); return [...m.entries()].map(([nombre, num]) => ({nombre, num})).sort((a, b) => b.num - a.num); };
const selAnioR = campo({id: "c2r-anio", nombre: "anio", etiqueta: "Año", opciones: aniosR.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosR.at(-1))});
const selLenR = campo({id: "c2r-len", nombre: "lengua", etiqueta: "Lengua", opciones: OPC_LEN, valor: ""});
const selAlcR = campo({id: "c2r-alc", nombre: "alcaldia", etiqueta: "Alcaldía a la que llegaron", opciones: OPC_ALC, valor: ""});
const panelR = html`<div class="panel-filtros"><div class="panel-campos">${selAnioR}${selLenR}${selAlcR}</div></div>`;
const cuerpoR = document.createElement("div");
function pintarR() {
  const anio = Number(selAnioR.value), len = selLenR.value, alc = selAlcR.value;
  const base = res5.filter((r) => (!len || r.lengua === len) && (!alc || r.cve_alc === alc));
  const quienes = quienesO(len, alc);
  const lugar = alc ? nombreAlcO.get(alc) : "la ciudad";
  const llegadas = aniosR.map((a) => ({anio: a, num: base.filter((r) => r.anio === a).reduce((s, r) => s + r.num, 0)}));
  // Ejes fijos al cambiar de año: el máximo de todas las ediciones en la selección.
  const TOPE_R = {serie: Math.max(1, ...llegadas.map((r) => r.num)) * 1.15,
    ent: Math.max(1, ...aniosR.flatMap((a) => sumaPor(base.filter((r) => r.anio === a), "ent_nombre").map((r) => r.num))) * 1.2,
    len: Math.max(1, ...aniosR.flatMap((a) => sumaPor(base.filter((r) => r.anio === a), "lengua_nombre").map((r) => r.num))) * 1.2};
  const f = base.filter((r) => r.anio === anio);
  const total = f.reduce((s, r) => s + r.num, 0);
  const porEntR = sumaPor(f, "ent_nombre").slice(0, 10).map((r) => ({...r, share: 100 * r.num / total}));
  const porLenR = sumaPor(f, "lengua_nombre").slice(0, 15).map((r) => ({...r, share: 100 * r.num / total}));
  cuerpoR.replaceChildren(
    kpis([{etiqueta: `Hablantes que llegaron en los cinco años previos, ${anio}`, cifra: entero(total), nota: "vivían en otra entidad cinco años antes del censo"},
      {etiqueta: "Entidad de la que llegaron más", cifra: porEntR[0]?.nombre ?? "", nota: porEntR[0] ? `${pct(porEntR[0].share)} de quienes llegaron` : ""}]),
    // Línea: cuántos llegaron en cada edición.
    conDescarga(fig({titulo: `Hablantes que llegaron a ${lugar} en los cinco años previos, por edición`,
      subtitulo: `${quienes}personas de 5 años y más que hablan una lengua indígena y cinco años antes vivían en otra entidad; en rojo, la edición elegida`,
      pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada punto es una edición"},
      [Plot.plot({height: altoLinea, width: anchoG, marginLeft: 60, marginRight: 30, x: {label: null, tickFormat: (d) => String(d), inset: 30}, y: {label: "personas", grid: true, domain: [0, TOPE_R.serie], tickFormat: (d) => entero(d)},
        marks: [Plot.line(llegadas, {x: "anio", y: "num", stroke: COLOR_UNICO, strokeWidth: 2}),
          Plot.dot(llegadas, {x: "anio", y: "num", fill: (r) => (r.anio === anio ? ROJO : COLOR_UNICO), r: (r) => (r.anio === anio ? 6 : 4.5)}),
          Plot.text(llegadas, {x: "anio", y: "num", text: (r) => entero(r.num), dy: -12, fontSize: 11}),
          Plot.tip(llegadas, Plot.pointerX({x: "anio", y: "num", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Llegaron de otra entidad", (r) => `${entero(r.num)} hablantes`]])})),
          Plot.ruleY([0])]})])),
    // Barras ordenadas: de qué entidades llegaron (pocas categorías).
    ...(porEntR.length ? [conDescarga(fig({titulo: `De qué entidad llegaron, ${anio}`,
      subtitulo: `${quienes}las diez entidades donde vivían cinco años antes, con la misma escala en todas las ediciones`,
      pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada barra es una entidad de residencia cinco años antes"},
      [Plot.plot({marginLeft: 170, marginRight: 60, height: 34 * porEntR.length + 50, width: anchoG,
        x: {label: "hablantes", grid: true, axis: "top", domain: [0, TOPE_R.ent], tickFormat: (d) => entero(d)}, y: {label: null, domain: porEntR.map((r) => r.nombre)},
        marks: [Plot.barX(porEntR, {x: "num", y: "nombre", fill: COLOR_UNICO, insetTop: 5, insetBottom: 5}),
          Plot.text(porEntR, {x: "num", y: "nombre", text: (r) => entero(r.num), dx: 6, textAnchor: "start", fontSize: 11.5}),
          Plot.barX(porEntR, Plot.pointerY({x: "num", y: "nombre", fill: "none", stroke: "currentColor", strokeWidth: 1.6, insetTop: 5, insetBottom: 5, maxRadius: Infinity})),
          Plot.tip(porEntR, Plot.pointerY({x: "num", y: "nombre", maxRadius: Infinity, ...GLOBO, ...globo([["Entidad de origen", (r) => r.nombre], ["Parte de quienes llegaron", (r) => pct(r.share)], ["Hablantes", (r) => entero(r.num)]])})),
          Plot.ruleX([0])]})]))] : [html`<p class="beta-nota">Sin llegadas en la muestra de ${anio} para esta selección.</p>`]),
    // Lollipop: qué lenguas hablan (lista larga ordenada).
    ...(len || !porLenR.length ? [] : [conDescarga(fig({titulo: `Qué lenguas hablan quienes llegaron, ${anio}`,
      subtitulo: `${quienes}las quince lenguas con más hablantes entre quienes llegaron en los cinco años previos`,
      pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada punto es una lengua"},
      [lollipop(porLenR.map((r) => ({...r, valor: r.num})), {ancho: anchoG, dominio: [0, TOPE_R.len], etiquetaX: "hablantes", formato: (v) => entero(v),
        renglones: [["Lengua", (r) => r.nombre], ["Parte de quienes llegaron", (r) => pct(r.share)], ["Hablantes", (r) => entero(r.num)]]})]))]),
    fuenteDe({datos: DATOS_MUESTRAS, referencia: ["R-SECULT-LENGUAS"],
      nota: "El INEGI no publica la migración reciente de los hablantes por entidad de origen y lengua; la referencia más cercana es el documento de la Secretaría de Cultura, que describe la llegada de hablantes a la ciudad."}),
    explicacion("Cada censo pregunta dónde vivía la persona cinco años antes. Aquí se cuenta a quienes hablan una lengua indígena, viven en la ciudad y cinco años antes vivían en otra entidad: es una medida de llegada reciente, que no incluye a quienes llegaron antes ni a quienes se fueron. El denominador de cada porcentaje es el total de quienes llegaron en esa edición. Las cifras son estimaciones de muestra y, al elegir una lengua o una alcaldía, se apoyan en pocos casos."),
    tablaColumnas(sumaPor(f, "ent_nombre").map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Entidad de residencia cinco años antes", valor: (r) => r.nombre}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de quienes llegaron", num: true, valor: (r) => r.share.toFixed(2)}], {titulo: "Ver todas las entidades"}));
}
panelR.addEventListener("input", pintarR);
alCambiarModo(() => pintarR());
pintarR();
display(html`<section class="beta-seccion">${panelR}${cuerpoR}</section>`);
```

<div class="relato-cierre">
  <p>Sabemos de dónde vienen. Ya en la ciudad, la pregunta es dónde viven.</p>
  <a class="book-cta book-cta-primary" href="./donde-viven">Sigue: Dónde viven</a>
</div>
