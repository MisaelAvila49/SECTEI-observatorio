---
title: 6. Condiciones de vida
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {COLOR_SERIE} from "../components/base.js";

const pobreza = (await FileAttachment("../data/coneval_pobreza.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const CRITERIOS = [{clave: "pertenencia", etiqueta: "Pertenencia étnica (hogar indígena, INPI)"}, {clave: "lengua", etiqueta: "Hablan una lengua indígena"}];
const NOMBRE = {pertenencia: {"Indígena": "Población indígena", "Resto": "Población no indígena"}, lengua: {"Indígena": "Hablantes de lengua indígena", "Resto": "No hablantes"}};
const COLOR = (g) => (g === "Indígena" ? COLOR_SERIE["Población indígena"] : COLOR_SERIE["Resto de la población"]);
const v = (anio, crit, grupo, ind, sexo = "Total") => pobreza.find((r) => r.anio === anio && r.criterio === crit && r.grupo === grupo && r.indicador === ind && r.sexo === sexo);
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 6</span>
  <h1>Condiciones de vida</h1>
  <p class="hero-entrada">Pobreza, pobreza extrema y carencias sociales de la población indígena del país frente al resto, según la medición oficial del CONEVAL de 2016 a 2022. Las cifras son nacionales: la medición no publica la condición indígena por entidad.</p>
</div>

```js
display(kpis([
  {etiqueta: "Población indígena en pobreza, 2022", cifra: pct(v(2022, "pertenencia", "Indígena", "Pobreza").pct), nota: `no indígena: ${pct(v(2022, "pertenencia", "Resto", "Pobreza").pct)}`},
  {etiqueta: "En pobreza extrema, 2022", cifra: pct(v(2022, "pertenencia", "Indígena", "Pobreza extrema").pct), nota: `no indígena: ${pct(v(2022, "pertenencia", "Resto", "Pobreza extrema").pct)}`},
  {etiqueta: "Hablantes en pobreza, 2024", cifra: pct(v(2024, "lengua", "Indígena", "Pobreza").pct), nota: `no hablantes: ${pct(v(2024, "lengua", "Resto", "Pobreza").pct)} (INEGI)`},
]));
```

---

<h2 id="pobreza" class="toc-anchor">Pobreza y pobreza extrema</h2>

```js
const IND_POBREZA = ["Pobreza", "Pobreza moderada", "Pobreza extrema", "Vulnerable por carencias sociales", "Vulnerable por ingresos", "No pobre y no vulnerable"];
const cCrit = campo({id: "c6a-crit", nombre: "criterio", etiqueta: "Población indígena", opciones: CRITERIOS, valor: "pertenencia"});
const cInd = campo({id: "c6a-ind", nombre: "indicador", etiqueta: "Indicador", opciones: IND_POBREZA.map((k) => ({clave: k, etiqueta: k})), valor: "Pobreza"});
const cSexo = campo({id: "c6a-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: "En conjunto"}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: "En conjunto"}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: "Una a una"}, {clave: "Hombres", etiqueta: "Hombres", grupo: "Una a una"}], valor: "Total"});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${cCrit}${cInd}${cSexo}</div></div>`;
const cuerpoA = document.createElement("div");
function pintarA() {
  const crit = cCrit.value, ind = cInd.value, sexoSep = cSexo.value === SEPARADO;
  // Por sexo, la pertenencia étnica solo se publica para la población indígena.
  const f = pobreza.filter((r) => r.criterio === crit && r.indicador === ind && (sexoSep ? r.sexo !== "Total" : r.sexo === cSexo.value))
    .map((r) => ({...r, serie: `${NOMBRE[crit][r.grupo]}${r.sexo !== "Total" ? ` · ${r.sexo.toLowerCase()}` : ""}`}));
  const series = [...new Set(f.map((r) => r.serie))];
  // Colores validados: sin sexo, indígena contra resto; con sexo y un solo
  // grupo, el par mujeres/hombres; con sexo y dos grupos, color por grupo y
  // trazo punteado para los hombres (cuatro tonos no pasan el validador).
  const soloIndigena = !f.some((r) => r.grupo === "Resto");
  const colorDe = (s) => (sexoSep && soloIndigena ? (s.includes("mujeres") ? COLOR_SERIE["Mujeres indígenas"] : COLOR_SERIE["Hombres indígenas"]) : (s.startsWith(NOMBRE[crit]["Indígena"]) ? COLOR("Indígena") : COLOR("Resto")));
  const colores = series.map(colorDe);
  const tieneResto = f.some((r) => r.grupo === "Resto");
  cuerpoA.replaceChildren(
    figura({titulo: `${ind} en la población indígena y en el resto, 2016 - ${Math.max(...f.map((r) => r.anio))}`, subtitulo: `${CRITERIOS.find((c) => c.clave === crit).etiqueta}${sexoSep ? " · por sexo" : cSexo.value !== "Total" ? ` · ${cSexo.value}` : ""}`, pie: "CONEVAL, medición multidimensional de la pobreza, anexo estadístico 2022; 2024 del INEGI · cada punto es una medición bienal"},
      [Plot.plot({height: 300, width: Math.min(920, width), marginLeft: 50, marginRight: 230, x: {label: null, tickFormat: (d) => String(d), domain: [2015.5, 2024.5]}, y: {label: "% de la población", grid: true, zero: true},
        color: {domain: series, range: colores},
        marks: [Plot.line(f.filter((r) => !(sexoSep && !soloIndigena && r.sexo === "Hombres")), {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2}),
          Plot.line(f.filter((r) => sexoSep && !soloIndigena && r.sexo === "Hombres"), {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2, strokeDasharray: "5,3"}),
          Plot.dot(f, {x: "anio", y: "pct", fill: "serie", r: 4}),
          Plot.text(f.filter((r) => r.anio === Math.max(...f.filter((x) => x.serie === r.serie).map((x) => x.anio))), {x: "anio", y: "pct", text: (r) => `${r.serie} ${pct(r.pct)}`, dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(f, Plot.pointerX({x: "anio", y: "pct", z: "serie", maxRadius: Infinity, title: (r) => `${r.anio} · ${r.serie}\n${pct(r.pct)}${r.millones ? `\n${r.millones.toFixed(1)} millones de personas` : ""}\n${r.fuente}`})), Plot.ruleY([0])]})]),
    sexoSep && crit === "pertenencia" && !tieneResto ? html`<p class="beta-nota">Por sexo, el CONEVAL solo publica a la población indígena; para comparar con el resto por sexo, elige "Hablan una lengua indígena".</p>` : "",
    explicacion("El CONEVAL considera en pobreza a quien tiene un ingreso menor a la línea de pobreza por ingresos y al menos una carencia social, y en pobreza extrema a quien tiene un ingreso menor a la línea de pobreza extrema y tres o más carencias. La población indígena es la que vive en un hogar indígena según el INPI (la jefa o el jefe, su cónyuge o algún ascendiente habla la lengua) más los hablantes que no viven en esos hogares; no usa la autoadscripción. Para 2024 el INEGI, que ahora hace la medición, solo publicó la pobreza de hablantes y no hablantes."),
    tablaColumnas(f, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(1)}, {etiqueta: "Millones de personas", num: true, valor: (r) => (r.millones ? r.millones.toFixed(2) : "")}, {etiqueta: "Fuente", valor: (r) => r.fuente}], {titulo: "Ver los datos"}));
}
panelA.addEventListener("input", pintarA);
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="carencias" class="toc-anchor">Carencias sociales</h2>

```js
const IND_CAR = ["Rezago educativo", "Acceso a los servicios de salud", "Acceso a la seguridad social", "Calidad y espacios de la vivienda", "Servicios básicos en la vivienda", "Alimentación nutritiva y de calidad", "Ingreso inferior a la línea de pobreza", "Ingreso inferior a la línea de pobreza extrema"];
const aniosC = [2016, 2018, 2020, 2022];
const cCritB = campo({id: "c6b-crit", nombre: "criterio", etiqueta: "Población indígena", opciones: CRITERIOS, valor: "pertenencia"});
const cAnioB = campo({id: "c6b-anio", nombre: "anio", etiqueta: "Año", opciones: [{clave: SEPARADO, etiqueta: "2016 y 2022 (comparar)", grupo: "En conjunto"}, ...aniosC.map((a) => ({clave: String(a), etiqueta: String(a), grupo: "Una medición"}))], valor: "2022"});
const panelB = html`<div class="panel-filtros"><div class="panel-campos">${cCritB}${cAnioB}</div></div>`;
const cuerpoB = document.createElement("div");
function pintarB() {
  const crit = cCritB.value, comparar = cAnioB.value === SEPARADO;
  const anios = comparar ? [2016, 2022] : [Number(cAnioB.value)];
  const f = pobreza.filter((r) => r.criterio === crit && r.sexo === "Total" && IND_CAR.includes(r.indicador) && anios.includes(r.anio)).map((r) => ({...r, serie: NOMBRE[crit][r.grupo], anioT: String(r.anio)}));
  const series = [NOMBRE[crit]["Indígena"], NOMBRE[crit]["Resto"]];
  const marcas = [];
  anios.forEach((a, ia) => series.forEach((s, is) => {
    const d = f.filter((r) => r.anio === a && r.serie === s);
    const dy = (comparar ? [-15, -5, 5, 15] : [-8, 8])[comparar ? ia * 2 + is : is];
    marcas.push(Plot.barX(d, {x: "pct", y: "indicador", fill: "serie", fillOpacity: comparar && a === 2016 ? 0.45 : 1, dy, insetTop: comparar ? 16 : 13, insetBottom: comparar ? 16 : 13}),
      Plot.text(d, {x: "pct", y: "indicador", text: (r) => `${r.pct.toFixed(1)}${comparar ? ` (${r.anio})` : ""}`, dx: 5, dy, textAnchor: "start", fontSize: 10.5}));
  }));
  cuerpoB.replaceChildren(
    figura({titulo: "Carencias sociales y bienestar económico de la población indígena y del resto", subtitulo: `${CRITERIOS.find((c) => c.clave === crit).etiqueta} · ${comparar ? "2016 (tono claro) y 2022" : anios[0]}`, pie: "CONEVAL, medición multidimensional de la pobreza, anexo estadístico 2022 · cada par de barras es una carencia"},
      [Plot.plot({marginLeft: 290, marginRight: 80, height: 60 + (comparar ? 56 : 44) * IND_CAR.length, width: Math.min(1000, width), color: {domain: series, range: [COLOR("Indígena"), COLOR("Resto")], legend: true},
        x: {label: "% de la población", grid: true, domain: [0, 100]}, y: {label: null, domain: IND_CAR},
        marks: [...marcas, Plot.tip(f, Plot.pointer({x: "pct", y: "indicador", maxRadius: Infinity, title: (r) => `${r.indicador} · ${r.serie} · ${r.anio}\n${pct(r.pct)} · ${r.millones.toFixed(1)} millones de personas`})), Plot.ruleX([0])]})]),
    explicacion("Cada carencia es una de las seis dimensiones de derechos sociales que mide el CONEVAL, más las dos líneas de ingreso. El salto de la carencia de acceso a la salud en 2020 y 2022 coincide con la sustitución del Seguro Popular por el INSABI: muchas personas dejaron de contar como afiliadas. La carencia de seguridad social es la más extendida en los dos grupos."),
    tablaColumnas(f, [{etiqueta: "Carencia", valor: (r) => r.indicador}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(1)}, {etiqueta: "Millones", num: true, valor: (r) => r.millones.toFixed(2)}, {etiqueta: "Carencias promedio", num: true, valor: (r) => r.carencias.toFixed(2)}], {titulo: "Ver los datos"}));
}
panelB.addEventListener("input", pintarB);
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```
