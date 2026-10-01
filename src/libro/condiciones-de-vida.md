---
title: Pobreza y carencias
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {COLOR_SERIE, ejePct, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";
import {dumbbell, waffle} from "../components/formas.js";

const pobreza = (await FileAttachment("../data/coneval_pobreza.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const CRITERIOS = [{clave: "pertenencia", etiqueta: "Pertenencia étnica (hogar indígena, INPI)"}, {clave: "lengua", etiqueta: "Hablan una lengua indígena"}];
const NOMBRE = {pertenencia: {"Indígena": "Población indígena", "Resto": "Población no indígena"}, lengua: {"Indígena": "Hablantes de lengua indígena", "Resto": "No hablantes"}};
const COLOR = (g) => (g === "Indígena" ? COLOR_SERIE["Población indígena"] : COLOR_SERIE["Resto de la población"]);
// Eje fijo por indicador: el máximo de los dos criterios, los sexos y los
// años. Cambiar de criterio o de sexo ya no reescala la gráfica.
const MAX_IND = new Map();
for (const r of pobreza) MAX_IND.set(r.indicador, Math.max(MAX_IND.get(r.indicador) ?? 0, r.pct));
const v = (anio, crit, grupo, ind, sexo = "Total") => pobreza.find((r) => r.anio === anio && r.criterio === crit && r.grupo === grupo && r.indicador === ind && r.sexo === sexo);
```

<div class="hero-pagina">
  <span class="kicker">Condiciones de vida</span>
  <h1>Pobreza y carencias</h1>
  <p class="hero-entrada">Pobreza, pobreza extrema y carencias sociales de la población indígena del país frente al resto, según la medición oficial del CONEVAL de 2016 a 2022. Las cifras son nacionales: la medición no publica la condición indígena por entidad.</p>
</div>

```js
display(kpis([
  {etiqueta: "Población indígena en pobreza, 2022", cifra: pct(v(2022, "pertenencia", "Indígena", "Pobreza").pct), nota: `no indígena: ${pct(v(2022, "pertenencia", "Resto", "Pobreza").pct)}`},
  {etiqueta: "En pobreza extrema, 2022", cifra: pct(v(2022, "pertenencia", "Indígena", "Pobreza extrema").pct), nota: `no indígena: ${pct(v(2022, "pertenencia", "Resto", "Pobreza extrema").pct)}`},
  {etiqueta: "Hablantes en pobreza, 2024", cifra: pct(v(2024, "lengua", "Indígena", "Pobreza").pct), nota: `no hablantes: ${pct(v(2024, "lengua", "Resto", "Pobreza").pct)} (INEGI)`},
]));
display(figura({titulo: "De cada 100 personas, cuántas viven en pobreza", subtitulo: "Todo el país, 2022 · población indígena según la pertenencia étnica del hogar (INPI)",
  pie: "CONEVAL, medición multidimensional de la pobreza 2022 · cada cuadro es una de cada 100 personas del grupo; en color, las que viven en pobreza"},
  [waffle([{grupo: "Población indígena", valor: v(2022, "pertenencia", "Indígena", "Pobreza").pct, color: COLOR("Indígena")}, {grupo: "Población no indígena", valor: v(2022, "pertenencia", "Resto", "Pobreza").pct, color: COLOR("Resto")}],
    {ancho: Math.min(760, width), colorDe: (d) => d.color})]));
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
      [Plot.plot({height: 300, width: Math.min(920, width), marginLeft: 50, marginRight: 230, x: {label: null, tickFormat: (d) => String(d), domain: [2015.5, 2024.5]}, y: ejePct(null, {domain: [0, Math.min(100, MAX_IND.get(ind) * 1.1)]}),
        color: {domain: series, range: colores},
        marks: [Plot.line(f.filter((r) => !(sexoSep && !soloIndigena && r.sexo === "Hombres")), {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2}),
          Plot.line(f.filter((r) => sexoSep && !soloIndigena && r.sexo === "Hombres"), {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2, strokeDasharray: "5,3"}),
          Plot.dot(f, {x: "anio", y: "pct", fill: "serie", r: 4}),
          Plot.text(f.filter((r) => r.anio === Math.max(...f.filter((x) => x.serie === r.serie).map((x) => x.anio))), {x: "anio", y: "pct", text: (r) => `${r.serie} ${pct(r.pct)}`, dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(f, Plot.pointerX({x: "anio", y: "pct", z: "serie", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Grupo", (r) => r.serie], ["Porcentaje", (r) => pct(r.pct)], ["Personas", (r) => (r.millones ? `${r.millones.toFixed(1)} millones` : null)], ["Fuente", (r) => r.fuente]])})), Plot.ruleY([0])]})]),
    sexoSep && crit === "pertenencia" && !tieneResto ? html`<p class="beta-nota">Por sexo, el CONEVAL solo publica a la población indígena; para comparar con el resto por sexo, elige "Hablan una lengua indígena".</p>` : "",
    fuenteDe({datos: ["D-CONEVAL-AE-2022", "R-INEGI-PM-2024"], cotejos: ["pobreza_indigena_2022", "pobreza_extrema_indigena_2022"],
      nota: "Son las cifras que publica el CONEVAL en su anexo estadístico; el cotejo confirma que se leyó el renglón y el año correctos. La cifra de 2024 es la que publicó el INEGI en la presentación de la medición."}),
    explicacion("El CONEVAL considera en pobreza a quien tiene un ingreso menor a la línea de pobreza por ingresos y al menos una carencia social, y en pobreza extrema a quien tiene un ingreso menor a la línea de pobreza extrema y tres o más carencias. La población indígena es la que vive en un hogar indígena según el INPI (la jefa o el jefe, su cónyuge o algún ascendiente habla la lengua) más los hablantes que no viven en esos hogares; no usa la autoadscripción. Para 2024 el INEGI, que ahora hace la medición, solo publicó la pobreza de hablantes y no hablantes."),
    tablaColumnas(f, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(1)}, {etiqueta: "Millones de personas", num: true, valor: (r) => (r.millones ? r.millones.toFixed(2) : "")}, {etiqueta: "Fuente", valor: (r) => r.fuente}], {titulo: "Ver los datos"}));
}
panelA.addEventListener("input", pintarA);
alCambiarModo(() => pintarA());
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
  cuerpoB.replaceChildren(
    figura({titulo: "Carencias sociales y bienestar económico de la población indígena y del resto", subtitulo: `${CRITERIOS.find((c) => c.clave === crit).etiqueta} · ${comparar ? "un panel por año, 2016 y 2022" : anios[0]}`, pie: "CONEVAL, medición multidimensional de la pobreza, anexo estadístico 2022 · cada par de puntos es una carencia"},
      [dumbbell(f.map((r) => ({...r, fila: r.indicador, valor: r.pct})), {ancho: Math.min(1000, width), series, colores: [COLOR("Indígena"), COLOR("Resto")], dominio: [0, 100], orden: IND_CAR, margenIzq: 290,
        fx: comparar ? "anioT" : null, fxDominio: ["2016", "2022"], etiquetaX: "% de la población",
        renglones: [["Indicador", (r) => r.indicador], ["Grupo", (r) => r.serie], ["Año", (r) => r.anio], ["Porcentaje", (r) => pct(r.pct)], ["Personas", (r) => `${r.millones.toFixed(1)} millones`]]})]),
    fuenteDe({datos: ["D-CONEVAL-AE-2022"], cotejos: ["pobreza_indigena_2022"], nota: "Las carencias se leen del mismo anexo estadístico del CONEVAL (cuadros 16, 17, 23 y 24); el cotejo de la pobreza confirma la lectura de los cuadros."}),
    explicacion("Cada carencia es una de las seis dimensiones de derechos sociales que mide el CONEVAL, más las dos líneas de ingreso. El salto de la carencia de acceso a la salud en 2020 y 2022 coincide con la sustitución del Seguro Popular por el INSABI: muchas personas dejaron de contar como afiliadas. La carencia de seguridad social es la más extendida en los dos grupos."),
    tablaColumnas(f, [{etiqueta: "Carencia", valor: (r) => r.indicador}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(1)}, {etiqueta: "Millones", num: true, valor: (r) => r.millones.toFixed(2)}, {etiqueta: "Carencias promedio", num: true, valor: (r) => r.carencias.toFixed(2)}], {titulo: "Ver los datos"}));
}
panelB.addEventListener("input", pintarB);
alCambiarModo(() => pintarB());
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```
