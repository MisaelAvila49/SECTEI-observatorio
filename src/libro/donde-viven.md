---
title: Dónde viven
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, SECUENCIAL, MODO, alCambiarModo, GLOBO, globo} from "../components/base.js";
import * as d3 from "npm:d3";
import {procedencia} from "../components/fuentes.js";

const [nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, colonias] = await Promise.all([
  FileAttachment("../data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/inpi_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("../data/geo_catalogo.csv").csv(),
  FileAttachment("../data/mx_entidades.json").json(),
  FileAttachment("../data/colonias_resumen.csv").csv({typed: true}),
]);
const pmtiles = {municipios: await FileAttachment("../data/municipios.pmtiles").url(), agebs: await FileAttachment("../data/agebs.pmtiles").url(), manzanas: await FileAttachment("../data/manzanas.pmtiles").url(), agebs2010: null, manzanas2010: null};
try { pmtiles.agebs2010 = await FileAttachment("../data/agebs_2010.pmtiles").url(); } catch { pmtiles.agebs2010 = null; }
try { pmtiles.manzanas2010 = await FileAttachment("../data/manzanas_2010.pmtiles").url(); } catch { pmtiles.manzanas2010 = null; }
const datos = datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles});
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
// Fuentes y cotejos del panel censal según la población que se pinta.
const DATOS_SERIE = ["D-ITER-1990", "D-ITER-1995", "D-ITER-2000", "D-ITER-2005", "D-ITER-2010", "D-EIC-2015", "D-ITER-2020", "D-EIC-2025-105", "D-EIC-2025-MICRO"];
const MUESTRAS = ["D-CENSO-2000-AMP", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
const FUENTES_CENSO = {
  hablantes: {datos: DATOS_SERIE, cotejos: ["cdmx_hli5_1990_n", "cdmx_hli5_1995_n", "cdmx_hli5_2000_n", "cdmx_hli5_2005_n", "cdmx_hli5_2010_n", "cdmx_hli5_2020_n", "cdmx_hli3_2015_n", "cdmx_hli3_2025", "eic2025_alcaldias_iguales", "word_tabla2_celdas_iguales", "iztapalapa_parte_2015"], lectura: ["R-SEPI-2024-DIV", "R-SECULT-LENGUAS"]},
  hogares: {datos: ["D-ITER-2005", "D-ITER-2010", "D-ITER-2020", "D-EIC-2025-105"], cotejos: ["cdmx_phog_2005_n", "cdmx_phog_2010_n", "cdmx_phog_ind", "cdmx_phog_2025_n"]},
  autoads: {datos: MUESTRAS, cotejos: ["cdmx_autoads_2010", "cdmx_autoads_2015_n", "cdmx_autoads_2020_n", "cdmx_autoads_2025"], lectura: ["R-SEPI-2024-PERFIL"]},
  inpi: {datos: ["D-INPI-2020-HOG", "D-INPI-2020-AUTO"], cotejos: ["pct_pi_nacional_2020", "autoads_mun_mediana_dif_2020"]},
};
FUENTES_CENSO.todas = {...FUENTES_CENSO.autoads, nota: "La unión de hablantes y personas que se consideran indígenas no tiene cifra publicada; se cotejan sus dos componentes por separado."};
FUENTES_CENSO.ambas = FUENTES_CENSO.todas;
const fuentesCenso = (v) => fuenteDe(FUENTES_CENSO[v.poblacion] ?? {datos: DATOS_SERIE, cotejos: [...FUENTES_CENSO.hablantes.cotejos.slice(0, 8), ...FUENTES_CENSO.autoads.cotejos]});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>Dónde viven</h1>
  <p class="hero-entrada">En qué alcaldías, AGEB y manzanas de la ciudad vive la población indígena, y qué lenguas se hablan en cada alcaldía.</p>
</div>

---

<h2 id="por-alcaldia" class="toc-anchor">Por alcaldía, 1990 - 2025</h2>

```js
display(seccionCenso(datos, {id: "c4alc", inicial: {nivel: "municipio", cveEnt: "09"}, fuentes: fuentesCenso}));
```

---

<h2 id="por-ageb-y-manzana" class="toc-anchor">Por AGEB y por manzana, 2010 y 2020</h2>

```js
display(seccionCenso(datos, {id: "c4ageb", inicial: {nivel: "ageb", cveEnt: "09", vista: "mapa"},
  fuentes: () => fuenteDe({datos: ["D-CENSO-2020-RESAGEBURB", "D-CENSO-2010-RESAGEBURB", "D-INEGI-CGU-2010"], cotejos: ["cdmx_phog_ind", "cdmx_phog_ind_2010", "cdmx_p3ym_hli_2010", "agebs_2010_con_geometria", "manzanas_2010_con_geometria"]})}));
```

---

<h2 id="lenguas-por-alcaldia" class="toc-anchor">Qué lenguas se hablan en cada alcaldía</h2>

```js
const lenguasAlc = (await FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio), lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(3, "0")}))
  .filter((r) => r.sexo === "Total" && r.lengua < "8000");
const aniosLA = [...new Set(lenguasAlc.map((r) => r.anio))].sort();
const selAnioLA = campo({id: "c4l-anio", nombre: "anio", etiqueta: "Año", opciones: aniosLA.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosLA.at(-1))});
const panelLA = html`<div class="panel-filtros"><div class="panel-campos">${selAnioLA}</div></div>`;
const cuerpoLA = document.createElement("div");
// Escala de color FIJA para todos los años (lección 74): de 0 a 50 % cubre más
// del 98 % de las celdas; el náhuatl en Milpa Alta pasa de ahí y toma el tono
// más oscuro.
const TOPE_LA = 50;
const colorLA = () => ({type: "linear", domain: [0, TOPE_LA], clamp: true, interpolate: d3.interpolateRgbBasis(SECUENCIAL), label: "% de los hablantes de la alcaldía", legend: true, tickFormat: (d) => `${d} %`});
function pintarLA() {
  const anio = Number(selAnioLA.value);
  const alc = lenguasAlc.filter((r) => r.nivel === "alcaldia" && r.anio === anio);
  const totAlc = new Map();
  for (const r of alc) totAlc.set(r.nombre, (totAlc.get(r.nombre) ?? 0) + r.num);
  const ciudadLA = lenguasAlc.filter((r) => r.nivel === "entidad" && r.anio === anio).sort((a, b) => b.num - a.num);
  const lenguasTop = ciudadLA.slice(0, 10).map((r) => r.lengua_nombre);
  const filasAlc = [...totAlc.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const celdas = filasAlc.flatMap((n) => lenguasTop.map((l) => {
    const r = alc.find((x) => x.nombre === n && x.lengua_nombre === l);
    const num = r?.num ?? 0, tot = totAlc.get(n);
    return {alcaldia: n, lengua: l, num, tot, share: tot ? 100 * num / tot : 0, casos: r?.casos ?? 0};
  }));
  const otras = filasAlc.map((n) => ({alcaldia: n, share: 100 - celdas.filter((c) => c.alcaldia === n).reduce((s, c) => s + c.share, 0)}));
  cuerpoLA.replaceChildren(
    figura({titulo: `Las diez lenguas con más hablantes en la ciudad, en cada alcaldía, ${anio}`, subtitulo: "Cada celda es la parte de los hablantes de la alcaldía que habla esa lengua; las alcaldías van de más a menos hablantes", pie: `${alc[0]?.fuente ?? "INEGI"} · cada fila es una alcaldía y cada columna una lengua; más oscuro, mayor parte de los hablantes de la alcaldía`},
      [Plot.plot({marginLeft: 170, marginTop: 70, marginRight: 10, height: 30 * filasAlc.length + 90, width: Math.min(1000, width), padding: 0.06,
        color: colorLA(),
        x: {label: null, domain: lenguasTop, axis: "top", tickRotate: -30}, y: {label: null, domain: filasAlc},
        marks: [
          Plot.cell(celdas, {x: "lengua", y: "alcaldia", fill: "share", inset: 0.5}),
          Plot.text(celdas.filter((c) => c.num > 0), {x: "lengua", y: "alcaldia", text: (c) => c.share.toFixed(0), fontSize: 10.5, fill: (c) => ((c.share >= 22) !== MODO.oscuro ? "white" : "black")}),
          Plot.tip(celdas, Plot.pointer({x: "lengua", y: "alcaldia", maxRadius: Infinity, ...GLOBO, ...globo([["Alcaldía", (c) => c.alcaldia], ["Lengua", (c) => c.lengua], ["Parte de sus hablantes", (c) => `${c.share.toFixed(1)} %`], ["Hablantes", (c) => `${entero(c.num)} de ${entero(c.tot)}`]])})),
        ]})]),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["nahuatl_2015", "nahuatl_2020", "word_tabla2_celdas_iguales"], lectura: ["R-SECULT-LENGUAS", "R-SEPI-2024-DIV"]}),
    explicacion("Para cada alcaldía se reparte a sus hablantes de lengua indígena entre las diez lenguas con más hablantes en la ciudad ese año; lo que falta para llegar a 100 son las demás lenguas, que están en la tabla. Las cifras salen de las muestras censales, así que en las alcaldías con pocos hablantes una celda puede apoyarse en muy pocas entrevistas; el globo dice cuántos hablantes representa cada celda."),
    tablaColumnas(celdas.filter((c) => c.num > 0).concat(otras.map((o) => ({alcaldia: o.alcaldia, lengua: "Las demás lenguas", share: o.share, num: null, tot: totAlc.get(o.alcaldia)}))).sort((a, b) => a.alcaldia.localeCompare(b.alcaldia, "es")),
      [{etiqueta: "Alcaldía", valor: (c) => c.alcaldia}, {etiqueta: "Lengua", valor: (c) => c.lengua}, {etiqueta: "% de sus hablantes", num: true, valor: (c) => c.share.toFixed(1)}, {etiqueta: "Hablantes", num: true, valor: (c) => (c.num == null ? "" : entero(c.num))}], {titulo: "Ver la tabla"}));
}
panelLA.addEventListener("input", pintarLA);
alCambiarModo(() => pintarLA());
pintarLA();
display(html`<section class="beta-seccion">${panelLA}${cuerpoLA}</section>`);
```
