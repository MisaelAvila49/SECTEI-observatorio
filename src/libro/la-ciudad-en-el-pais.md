---
title: La ciudad en el país
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, ejePct, COLOR_UNICO, GLOBO} from "../components/base.js";
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
  <h1>La ciudad en el país</h1>
  <p class="hero-entrada">La Ciudad de México frente a las otras 31 entidades, y cuántas lenguas tienen hablantes en ella en cada censo.</p>
</div>

---

<h2 id="cuantas-lenguas" class="toc-anchor">Cuántas lenguas llegan a la ciudad</h2>

```js
// Lenguas con hablantes en la ciudad por edición (muestras censales por alcaldía).
const ciudad = lenguasAlc.filter((r) => r.nivel === "entidad" && String(r.lengua).padStart(4, "0") < "8000").map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), anio: Number(r.anio)}));
const aniosL = [...new Set(ciudad.map((r) => r.anio))].sort();
// Eje fijo: la lengua mayor de todas las ediciones, para que cambiar de año o
// de sexo mueva las barras y no la escala.
const MAX_LENGUA = Math.max(...ciudad.map((r) => r.num)) * 1.2;
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
        x: {label: "hablantes", grid: true, domain: [0, MAX_LENGUA]}, y: {label: null, domain: top.map((r) => r.lengua_nombre)},
        marks: [Plot.barX(top, {x: "num", y: "lengua_nombre", fill: COLOR_UNICO}),
          Plot.text(top, {x: "num", y: "lengua_nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
          Plot.tip(top, Plot.pointerY({x: "num", y: "lengua_nombre", maxRadius: Infinity, ...GLOBO, title: (r) => `${r.lengua_nombre} (${r.familia})\n${entero(r.num)} hablantes · ${pct(r.share)} de los hablantes de la ciudad${r.ee ? `\n± ${entero(196 * r.ee * r.den / 100)} (95 %)` : ""}`})),
          Plot.ruleX([0])]})]),
    figura({titulo: "Cuántas lenguas tienen hablantes en la ciudad, por edición", subtitulo: "Agrupaciones lingüísticas con al menos un hablante en la muestra de cada censo o encuesta", pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una edición"},
      [Plot.plot({height: 220, width: Math.min(900, width), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: {label: "lenguas", grid: true, zero: true},
        marks: [Plot.line(porAnio, {x: "anio", y: "n", stroke: COLOR_UNICO, strokeWidth: 2}), Plot.dot(porAnio, {x: "anio", y: "n", fill: COLOR_UNICO, r: 4.5}),
          Plot.text(porAnio, {x: "anio", y: "n", text: "n", dy: -10, fontSize: 11}),
          Plot.tip(porAnio, Plot.pointerX({x: "anio", y: "n", maxRadius: Infinity, ...GLOBO, title: (r) => `${r.anio}\n${r.n} lenguas con al menos un hablante en la muestra`})), Plot.ruleY([0])]})]),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["nahuatl_2015", "nahuatl_2020", "word_tabla2_celdas_iguales"], lectura: ["R-SECULT-LENGUAS", "R-SEPI-2024-DIV"]}),
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
display(seccionCenso(datos, {id: "c2ent", inicial: {nivel: "entidad", seleccion: "09"},
  fuentes: () => fuenteDe({datos: ["D-ITER-2020-NAL", "D-CENSO-2020", "D-INPI-2020-HOG", "D-INPI-2020-AUTO"],
    cotejos: ["hablantes3_nacional_2020", "pct_autoads_nacional_2020", "pct_pi_nacional_2020", "autoads_mun_mediana_dif_2020", "cdmx_hli3_2020_n", "cdmx_autoads_2020_n"],
    lectura: ["R-CENSO-2020-TAB-ETN"]})}));
```
