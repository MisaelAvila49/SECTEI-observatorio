---
title: De dónde vienen
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, ejePct, COLOR_UNICO, ROJO, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const [nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, lenguasAlc, origen] = await Promise.all([
  FileAttachment("../data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/inpi_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("../data/geo_catalogo.csv").csv(),
  FileAttachment("../data/mx_entidades.json").json(),
  FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("../data/lenguas_origen.csv").csv({typed: true}),
]);
const pmtiles = {municipios: await FileAttachment("../data/municipios.pmtiles").url(), agebs: await FileAttachment("../data/agebs.pmtiles").url(), manzanas: await FileAttachment("../data/manzanas.pmtiles").url(), agebs2010: null, manzanas2010: null};
try { pmtiles.agebs2010 = await FileAttachment("../data/agebs_2010.pmtiles").url(); } catch { pmtiles.agebs2010 = null; }
try { pmtiles.manzanas2010 = await FileAttachment("../data/manzanas_2010.pmtiles").url(); } catch { pmtiles.manzanas2010 = null; }
const datos = datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles});
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>De dónde vienen</h1>
  <p class="hero-entrada">En qué entidad nacieron quienes hablan una lengua indígena en la ciudad y cuántos llegaron en los cinco años previos a cada censo.</p>
</div>

---

<h2 id="de-donde-vienen" class="toc-anchor">De dónde vienen quienes hablan</h2>

```js
const nac = origen.filter((r) => r.tipo === "nacimiento").map((r) => ({...r, anio: Number(r.anio), ent: String(r.ent).padStart(3, "0"), lengua: String(r.lengua).padStart(4, "0")}));
const aniosO = [...new Set(nac.map((r) => r.anio))].sort();
const fuera = aniosO.map((a) => { const f = nac.filter((r) => r.anio === a); const tot = f.reduce((s, r) => s + r.num, 0); const ciu = f.filter((r) => r.ent === "009").reduce((s, r) => s + r.num, 0); const otro = f.filter((r) => r.ent > "032" && r.ent < "999").reduce((s, r) => s + r.num, 0); return {anio: a, total: tot, ciudad: ciu, otraEntidad: tot - ciu - otro, otroPais: otro, pctFuera: 100 * (tot - ciu) / tot}; });
const ultimo = fuera.at(-1);
const porEnt = new Map();
for (const r of nac.filter((r) => r.anio === ultimo.anio && r.ent !== "009" && r.ent <= "032")) porEnt.set(r.ent_nombre, (porEnt.get(r.ent_nombre) ?? 0) + r.num);
const topEnt = [...porEnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([nombre, num]) => ({nombre, num, share: 100 * num / ultimo.total}));
display(html`<section class="beta-seccion">
  ${kpis([{etiqueta: `Hablantes nacidos fuera de la ciudad, ${ultimo.anio}`, cifra: pct(ultimo.pctFuera), nota: `${entero(ultimo.total - ultimo.ciudad)} de ${entero(ultimo.total)} hablantes`}, {etiqueta: "Nacidos en la ciudad", cifra: entero(ultimo.ciudad), nota: "hablantes de lengua indígena"}, {etiqueta: "Entidad de origen mayor", cifra: topEnt[0]?.nombre ?? "", nota: topEnt[0] ? `${pct(topEnt[0].share)} de los hablantes de la ciudad` : ""}])}
  ${figura({titulo: "Hablantes de la ciudad nacidos en otra entidad, por edición", subtitulo: "Porcentaje de los hablantes de lengua indígena que viven en la ciudad y nacieron en otra entidad o en otro país", pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una edición"},
    [Plot.plot({height: 240, width: Math.min(900, width), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {domain: [0, 100]}),
      marks: [Plot.line(fuera, {x: "anio", y: "pctFuera", stroke: COLOR_UNICO, strokeWidth: 2}), Plot.dot(fuera, {x: "anio", y: "pctFuera", fill: COLOR_UNICO, r: 4.5}),
        Plot.text(fuera, {x: "anio", y: "pctFuera", text: (r) => `${r.pctFuera.toFixed(0)} %`, dy: -10, fontSize: 11}),
        Plot.tip(fuera, Plot.pointerX({x: "anio", y: "pctFuera", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Nacidos fuera de la ciudad", (r) => pct(r.pctFuera)], ["En otra entidad", (r) => entero(r.otraEntidad)], ["En otro país", (r) => entero(r.otroPais)], ["Nacidos en la ciudad", (r) => entero(r.ciudad)]])})),
        Plot.ruleY([0])]})])}
  ${figura({titulo: `Las doce entidades de las que vienen más hablantes, ${ultimo.anio}`, subtitulo: "Entidad de nacimiento de los hablantes que viven en la ciudad", pie: `${ultimo.anio === 2025 ? "Encuesta Intercensal 2025" : "Censo 2020"} (INEGI), muestra por alcaldía · cada barra es una entidad de nacimiento`},
    [Plot.plot({marginLeft: 150, marginRight: 90, height: 24 * topEnt.length + 60, width: Math.min(900, width), x: {label: "hablantes", grid: true}, y: {label: null, domain: topEnt.map((r) => r.nombre)},
      marks: [Plot.barX(topEnt, {x: "num", y: "nombre", fill: COLOR_UNICO}), Plot.text(topEnt, {x: "num", y: "nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
        Plot.tip(topEnt, Plot.pointerY({x: "num", y: "nombre", maxRadius: Infinity, ...GLOBO, ...globo([["Entidad de nacimiento", (r) => r.nombre], ["Hablantes", (r) => entero(r.num)], ["Parte de los hablantes de la ciudad", (r) => pct(r.share)]])})), Plot.ruleX([0])]})])}
  <p class="beta-nota">El mapa de origen, con una flecha por entidad y variante probable de cada lengua, está en <a href="../mapa">el mapa</a>: elige una lengua y pulsa "Ver de dónde vienen".</p>
  ${fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["hli_nacidos_fuera_2020"], lectura: ["R-SEPI-2024-DIV"]})}
  ${explicacion("El Censo pregunta en qué entidad o país nació cada persona. Aquí se toma a los hablantes de lengua indígena que viven en la ciudad y se cuenta qué parte nació fuera de ella. Es una medida de origen, no de fecha de llegada: alguien nacido en Oaxaca pudo llegar hace cincuenta años o el año pasado.")}
</section>`);
```

---

<h2 id="llegadas-recientes" class="toc-anchor">Quiénes llegaron en los últimos cinco años</h2>

```js
const res5 = origen.filter((r) => r.tipo === "residencia5").map((r) => ({...r, anio: Number(r.anio), ent: String(r.ent).padStart(3, "0"), lengua: String(r.lengua).padStart(4, "0")}));
const aniosR = [...new Set(res5.map((r) => r.anio))].sort();
const llegadas = aniosR.map((a) => { const f = res5.filter((r) => r.anio === a); return {anio: a, num: f.reduce((s, r) => s + r.num, 0), casos: f.reduce((s, r) => s + (r.casos ?? 0), 0)}; });
const sumaPor = (filas, campoK) => { const m = new Map(); for (const r of filas) m.set(r[campoK], (m.get(r[campoK]) ?? 0) + r.num); return [...m.entries()].map(([nombre, num]) => ({nombre, num})).sort((a, b) => b.num - a.num); };
// Ejes fijos en las tres gráficas: el máximo de todas las ediciones.
const TOPE_R = {serie: Math.max(...llegadas.map((r) => r.num)) * 1.15,
  ent: Math.max(...aniosR.flatMap((a) => sumaPor(res5.filter((r) => r.anio === a), "ent_nombre").map((r) => r.num))) * 1.2,
  len: Math.max(...aniosR.flatMap((a) => sumaPor(res5.filter((r) => r.anio === a), "lengua_nombre").map((r) => r.num))) * 1.2};
const selAnioR = campo({id: "c2r-anio", nombre: "anio", etiqueta: "Año", opciones: aniosR.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosR.at(-1))});
const panelR = html`<div class="panel-filtros"><div class="panel-campos">${selAnioR}</div></div>`;
const cuerpoR = document.createElement("div");
function pintarR() {
  const anio = Number(selAnioR.value);
  const f = res5.filter((r) => r.anio === anio);
  const total = f.reduce((s, r) => s + r.num, 0);
  const porEntR = sumaPor(f, "ent_nombre").slice(0, 10).map((r) => ({...r, share: 100 * r.num / total}));
  const porLenR = sumaPor(f, "lengua_nombre").slice(0, 10).map((r) => ({...r, share: 100 * r.num / total}));
  const barras = (datos, titulo, subtitulo, tope, etiqueta) => figura({titulo, subtitulo, pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada barra suma a quienes cinco años antes vivían en otra entidad"},
    [Plot.plot({marginLeft: 150, marginRight: 100, height: 24 * datos.length + 50, width: Math.min(900, width), x: {label: "hablantes", grid: true, domain: [0, tope]}, y: {label: null, domain: datos.map((r) => r.nombre)},
      marks: [Plot.barX(datos, {x: "num", y: "nombre", fill: COLOR_UNICO}), Plot.text(datos, {x: "num", y: "nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
        Plot.tip(datos, Plot.pointerY({x: "num", y: "nombre", maxRadius: Infinity, ...GLOBO, ...globo([[etiqueta, (r) => r.nombre], ["Hablantes", (r) => entero(r.num)], ["Parte de quienes llegaron", (r) => pct(r.share)]])})), Plot.ruleX([0])]})]);
  cuerpoR.replaceChildren(
    kpis([{etiqueta: `Hablantes que llegaron en los cinco años previos, ${anio}`, cifra: entero(total), nota: "vivían en otra entidad cinco años antes del censo"}, {etiqueta: "Entidad de la que llegaron más", cifra: porEntR[0]?.nombre ?? "", nota: porEntR[0] ? `${pct(porEntR[0].share)} de quienes llegaron` : ""}, {etiqueta: "Lengua más hablada entre quienes llegaron", cifra: porLenR[0]?.nombre ?? "", nota: porLenR[0] ? `${pct(porLenR[0].share)} de quienes llegaron` : ""}]),
    figura({titulo: "Hablantes que llegaron a la ciudad en los cinco años previos, por edición", subtitulo: "Personas de 5 años y más que hablan una lengua indígena y cinco años antes vivían en otra entidad", pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada punto es una edición"},
      [Plot.plot({height: 240, width: Math.min(900, width), marginLeft: 60, marginRight: 30, x: {label: null, tickFormat: (d) => String(d), inset: 30}, y: {label: "personas", grid: true, domain: [0, TOPE_R.serie], tickFormat: (d) => entero(d)},
        marks: [Plot.line(llegadas, {x: "anio", y: "num", stroke: COLOR_UNICO, strokeWidth: 2}), Plot.dot(llegadas, {x: "anio", y: "num", fill: (r) => (r.anio === anio ? ROJO : COLOR_UNICO), r: (r) => (r.anio === anio ? 6 : 4.5)}),
          Plot.text(llegadas, {x: "anio", y: "num", text: (r) => entero(r.num), dy: -12, fontSize: 11}),
          Plot.tip(llegadas, Plot.pointerX({x: "anio", y: "num", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Llegaron de otra entidad", (r) => `${entero(r.num)} hablantes`], ["Entrevistas en la muestra", (r) => entero(r.casos)]])})), Plot.ruleY([0])]})]),
    barras(porEntR, `De qué entidad llegaron, ${anio}`, "Entidad donde vivían cinco años antes; las diez con más hablantes", TOPE_R.ent, "Entidad de origen"),
    barras(porLenR, `Qué lenguas hablan quienes llegaron, ${anio}`, "Las diez lenguas con más hablantes entre quienes llegaron en los cinco años previos", TOPE_R.len, "Lengua"),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], referencia: ["R-SECULT-LENGUAS"],
      nota: "El INEGI no publica la migración reciente de los hablantes por entidad de origen y lengua; la referencia más cercana es el documento de la Secretaría de Cultura, que describe la llegada de hablantes a la ciudad."}),
    explicacion("Cada censo pregunta dónde vivía la persona cinco años antes. Aquí se cuenta a quienes hablan una lengua indígena, viven en la ciudad y cinco años antes vivían en otra entidad: es una medida de llegada reciente, que no incluye a quienes llegaron antes ni a quienes se fueron. Las cifras son estimaciones de las muestras censales; en 1990 y 2005 la muestra no trae diseño para calcular su error."),
    tablaColumnas(sumaPor(f, "ent_nombre").map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Entidad de residencia cinco años antes", valor: (r) => r.nombre}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de quienes llegaron", num: true, valor: (r) => r.share.toFixed(2)}], {titulo: "Ver todas las entidades"}));
}
panelR.addEventListener("input", pintarR);
alCambiarModo(() => pintarR());
pintarR();
display(html`<section class="beta-seccion">${panelR}${cuerpoR}</section>`);
```
