---
title: 2. La ciudad en el país
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {RAMPA_MORADA} from "../components/mapa.js";
import {punto} from "../components/base.js";

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
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 2</span>
  <h1>La ciudad en el país</h1>
  <p class="hero-entrada">La Ciudad de México no está entre las entidades con mayor proporción de hablantes, pero recibe hablantes de casi todas las lenguas del país. Este capítulo la coloca frente a las otras 31 entidades, cuenta cuántas lenguas tienen hablantes en ella en cada censo y muestra de dónde vienen quienes las hablan.</p>
</div>

---

<h2 id="cuantas-lenguas" class="toc-anchor">Cuántas lenguas llegan a la ciudad</h2>

```js
// Lenguas con hablantes en la ciudad por edición (muestras censales por alcaldía).
const ciudad = lenguasAlc.filter((r) => r.nivel === "entidad" && String(r.lengua).padStart(4, "0") < "8000").map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), anio: Number(r.anio)}));
const aniosL = [...new Set(ciudad.map((r) => r.anio))].sort();
const selAnio = campo({id: "c2-anio", nombre: "anio", etiqueta: "Año", opciones: aniosL.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: "2025"});
const selSexo = campo({id: "c2-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres"}, {clave: "Mujeres", etiqueta: "Mujeres"}, {clave: "Hombres", etiqueta: "Hombres"}], valor: "Total"});
const panel1 = html`<div class="panel-filtros"><div class="panel-campos">${selAnio}${selSexo}</div></div>`;
const cuerpo1 = document.createElement("div");
function pintar1() {
  const anio = Number(selAnio.value), sexo = selSexo.value;
  const conSexo = ciudad.some((r) => r.anio === anio && r.sexo === "Mujeres");
  selSexo.hidden = !conSexo;
  const filas = ciudad.filter((r) => r.anio === anio && r.sexo === (conSexo ? sexo : "Total") && r.num > 0).sort((a, b) => b.num - a.num);
  const total = filas.reduce((s, r) => s + r.num, 0);
  const porAnio = aniosL.map((a) => ({anio: a, n: new Set(ciudad.filter((r) => r.anio === a && r.sexo === "Total" && r.num > 0).map((r) => r.lengua)).size}));
  const top = filas.slice(0, 15).map((r) => ({...r, share: 100 * r.num / total}));
  cuerpo1.replaceChildren(
    kpis([{etiqueta: `Lenguas con hablantes en ${anio}`, cifra: String(filas.length), nota: "agrupaciones lingüísticas del catálogo del INALI"}, {etiqueta: "Hablantes en la ciudad", cifra: entero(total), nota: filas[0]?.universo ?? ""}, {etiqueta: "La lengua mayor", cifra: filas[0]?.lengua_nombre ?? "", nota: filas[0] ? `${pct(top[0].share)} de los hablantes` : ""}]),
    figura({titulo: `Las quince lenguas con más hablantes en la ciudad, ${anio}`, subtitulo: `${sexo !== "Total" && conSexo ? `${sexo} · ` : ""}${filas.length} lenguas con hablantes; se muestran las quince mayores`, pie: `${filas[0]?.fuente ?? "INEGI"} · cada barra es una lengua; el porcentaje es su parte de todos los hablantes de la ciudad`},
      [Plot.plot({marginLeft: 150, marginRight: 90, height: 24 * top.length + 60, width: Math.min(900, width),
        x: {label: "hablantes", grid: true}, y: {label: null, domain: top.map((r) => r.lengua_nombre)},
        marks: [Plot.barX(top, {x: "num", y: "lengua_nombre", fill: RAMPA_MORADA[3]}),
          Plot.text(top, {x: "num", y: "lengua_nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
          Plot.tip(top, Plot.pointerY({x: "num", y: "lengua_nombre", maxRadius: Infinity, title: (r) => `${r.lengua_nombre} (${r.familia})\n${entero(r.num)} hablantes · ${pct(r.share)} de los hablantes de la ciudad${r.ee ? `\n± ${entero(196 * r.ee * r.den / 100)} (95 %)` : ""}`})),
          Plot.ruleX([0])]})]),
    figura({titulo: "Cuántas lenguas tienen hablantes en la ciudad, por edición", subtitulo: "Agrupaciones lingüísticas con al menos un hablante en la muestra de cada censo o encuesta", pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una edición"},
      [Plot.plot({height: 220, width: Math.min(900, width), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: {label: "lenguas", grid: true, zero: true},
        marks: [Plot.line(porAnio, {x: "anio", y: "n", stroke: RAMPA_MORADA[3], strokeWidth: 2}), Plot.dot(porAnio, {x: "anio", y: "n", fill: RAMPA_MORADA[3], r: 4.5}),
          Plot.text(porAnio, {x: "anio", y: "n", text: "n", dy: -10, fontSize: 11}), Plot.ruleY([0])]})]),
    explicacion("Cada edición censal pregunta qué lengua indígena habla cada persona; aquí se cuentan las agrupaciones lingüísticas del catálogo del INALI con al menos un hablante en la muestra de la ciudad. Las muestras de 1990 y 2005 no llevan error de diseño; las demás sí, y el globo lo muestra. El número de lenguas depende del tamaño de la muestra de cada edición: una lengua con muy pocos hablantes puede no caer en la muestra un año y sí al siguiente."),
    tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Lengua", valor: (r) => r.lengua_nombre}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los hablantes", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "Casos en la muestra", num: true, valor: (r) => (r.casos ?? "")}], {titulo: "Ver todas las lenguas"}));
}
panel1.addEventListener("input", pintar1);
pintar1();
display(html`<section class="beta-seccion">${panel1}${cuerpo1}</section>`);
```

---

<h2 id="frente-a-las-entidades" class="toc-anchor">La ciudad frente a las entidades</h2>

```js
display(seccionCenso(datos, {id: "c2ent", inicial: {nivel: "entidad", seleccion: "09"}}));
```

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
    [Plot.plot({height: 240, width: Math.min(900, width), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: {label: "%", grid: true, domain: [0, 100]},
      marks: [Plot.line(fuera, {x: "anio", y: "pctFuera", stroke: RAMPA_MORADA[3], strokeWidth: 2}), Plot.dot(fuera, {x: "anio", y: "pctFuera", fill: RAMPA_MORADA[3], r: 4.5}),
        Plot.text(fuera, {x: "anio", y: "pctFuera", text: (r) => r.pctFuera.toFixed(0), dy: -10, fontSize: 11}),
        Plot.tip(fuera, Plot.pointerX({x: "anio", y: "pctFuera", maxRadius: Infinity, title: (r) => `${r.anio}\nNacidos fuera de la ciudad: ${pct(r.pctFuera)}\nEn otra entidad: ${entero(r.otraEntidad)} · en otro país: ${entero(r.otroPais)}\nNacidos en la ciudad: ${entero(r.ciudad)}`})),
        Plot.ruleY([0])]})])}
  ${figura({titulo: `Las doce entidades de las que vienen más hablantes, ${ultimo.anio}`, subtitulo: "Entidad de nacimiento de los hablantes que viven en la ciudad", pie: `${ultimo.anio === 2025 ? "Encuesta Intercensal 2025" : "Censo 2020"} (INEGI), muestra por alcaldía · cada barra es una entidad de nacimiento`},
    [Plot.plot({marginLeft: 150, marginRight: 90, height: 24 * topEnt.length + 60, width: Math.min(900, width), x: {label: "hablantes", grid: true}, y: {label: null, domain: topEnt.map((r) => r.nombre)},
      marks: [Plot.barX(topEnt, {x: "num", y: "nombre", fill: RAMPA_MORADA[3]}), Plot.text(topEnt, {x: "num", y: "nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
        Plot.tip(topEnt, Plot.pointerY({x: "num", y: "nombre", maxRadius: Infinity, title: (r) => `${r.nombre}\n${entero(r.num)} hablantes nacidos aquí viven en la ciudad\n${pct(r.share)} de los hablantes de la ciudad`})), Plot.ruleX([0])]})])}
  <p class="beta-nota">El mapa de origen, con una flecha por entidad y variante probable de cada lengua, está en <a href="../mapa">el mapa</a>: elige una lengua y pulsa "Ver de dónde vienen".</p>
  ${explicacion("El Censo pregunta en qué entidad o país nació cada persona. Aquí se toma a los hablantes de lengua indígena que viven en la ciudad y se cuenta qué parte nació fuera de ella. Es una medida de origen, no de fecha de llegada: alguien nacido en Oaxaca pudo llegar hace cincuenta años o el año pasado.")}
</section>`);
```
