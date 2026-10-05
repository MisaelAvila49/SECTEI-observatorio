---
title: Hablantes en el tiempo
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis, claves} from "../components/graficas.js";
import {punto, ejePct, COLOR_UNICO, COLOR_REFERENCIA, GLOBO, globo, alCambiarModo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const [clin, lenguasNac, serieNac] = await Promise.all([
  FileAttachment("../data/clin_variantes.csv").csv(),
  FileAttachment("../data/lenguas_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_nacional.csv").csv({typed: true}),
]);
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const clavesSerie = () => claves([{termino: "Punto lleno", texto: "conteo censal: cuenta a toda la población, sin margen de error."}, {termino: "Punto hueco", texto: "estimación de una encuesta intercensal; el globo trae su margen de error al 95 % (±)."}]);
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const uni = (u) => String(u ?? "").replace(/pob (\d)\+/, "población de $1 años y más").replace("viv. particulares", "viviendas particulares");
const nac = lenguasNac.map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(2, "0")}));
```

<div class="hero-pagina">
  <span class="kicker">Parte 1 · Las lenguas · 2 de 4</span>
  <h1>Hablantes en el tiempo</h1>
  <p class="hero-entrada">Una lengua vive mientras se habla. Por eso, además de contar hablantes hoy, importa seguirlos en el tiempo: de 1990 a 2025, con la misma medida en todas las ediciones para que la comparación sea válida.</p>
</div>

---

<h2 id="serie-nacional" class="toc-anchor">La serie nacional, 1990 - 2025</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">01</span> La serie nacional, 1990 - 2025</span>
  <p class="seccion-entrada">El país es el punto de referencia. La serie junta tres formas de contar a la población indígena, porque hablar una lengua, considerarse indígena y vivir en un hogar indígena son cosas distintas y pueden moverse en sentidos distintos.</p>
</header>

```js
const SERIES = [
  {clave: "hablantes5", etiqueta: "Hablan una lengua indígena", corto: "Hablantes de lengua indígena"},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas"},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas"},
];
const selSerie = campo({id: "c1-serie", nombre: "serie", etiqueta: "Población", opciones: [{clave: "todas", etiqueta: "Todas juntas (comparar)", grupo: "En conjunto"}, ...SERIES.map((s) => ({...s, grupo: "Una a una"}))], valor: "todas"});
const selMedida = campo({id: "c1-medida", nombre: "medida", etiqueta: "Medida", opciones: [{clave: "pct", etiqueta: "Porcentaje de la población"}, {clave: "num", etiqueta: "Personas"}], valor: "pct"});
const panelS = html`<div class="panel-filtros"><div class="panel-campos">${selSerie}${selMedida}</div></div>`;
const cuerpoS = document.createElement("div");
// Las tres son formas de contar a la población indígena, no indígena contra
// resto: van en tres tonos de la misma familia morada, cada una con su trazo y
// su nombre al final de la línea. El rojo y el azul quedan para esa otra comparación.
const COLORES = {hablantes5: "#4d004b", autoads: "#88419d", hogares: "#8c6bb1"};
const TRAZOS = {hablantes5: null, autoads: "6,3", hogares: "2,3"};
function pintarS() {
  const claves = selSerie.value === "todas" ? SERIES.map((s) => s.clave) : [selSerie.value];
  const esPct = selMedida.value === "pct";
  const filas = serieNac.filter((r) => claves.includes(r.poblacion)).map((r) => ({...r, serie: SERIES.find((s) => s.clave === r.poblacion).corto, valor: esPct ? r.pct : r.num})).sort((a, b) => a.anio - b.anio);
  const ultimo = (k) => serieNac.filter((r) => r.poblacion === k).sort((a, b) => b.anio - a.anio)[0];
  const h1990 = serieNac.find((r) => r.poblacion === "hablantes5" && r.anio === 1990);
  const ultimos = filas.filter((r) => r.anio === Math.max(...filas.filter((f) => f.serie === r.serie).map((f) => f.anio)));
  const color = (s) => COLORES[SERIES.find((x) => x.corto === s).clave];
  cuerpoS.replaceChildren(
    kpis([{etiqueta: "Hablantes de 5 años y más, 2025", cifra: entero(ultimo("hablantes5").num), nota: `${pct(ultimo("hablantes5").pct)} de la población de 5 años y más`}, {etiqueta: "Se consideran indígenas, 2025", cifra: entero(ultimo("autoads").num), nota: `${pct(ultimo("autoads").pct)} de la población`}, {etiqueta: "Hablantes de 5 años y más, 1990", cifra: entero(h1990.num), nota: `${pct(h1990.pct)} de la población de 5 años y más`}]),
    figura({titulo: esPct ? "Población indígena de México por edición, en porcentaje" : "Población indígena de México por edición, en personas", subtitulo: "Hablantes: población de 5 años y más en todas las ediciones. Los puntos huecos son estimaciones de encuesta", pie: "Censos, conteos e intercensales (INEGI) · cada punto es una edición; una línea que empieza tarde es una pregunta que antes no se hacía"},
      [Plot.plot({height: 320, width: Math.min(1320, width), marginLeft: 70, marginRight: 190, x: {label: null, tickFormat: (d) => String(d), domain: [1988, 2027]}, y: esPct ? ejePct(null, {zero: true}) : {label: "personas", grid: true, zero: true, tickFormat: (d) => `${(d / 1e6).toFixed(0)} M`},
        color: {domain: claves.map((k) => SERIES.find((s) => s.clave === k).corto), range: claves.map((k) => COLORES[k])},
        marks: [...claves.map((k) => Plot.line(filas.filter((r) => r.poblacion === k), {x: "anio", y: "valor", stroke: "serie", strokeWidth: 2.2, strokeDasharray: TRAZOS[k] ?? undefined})),
          Plot.dot(filas, {x: "anio", y: "valor", stroke: "serie", fill: (r) => (r.cota === "muestra" ? "white" : color(r.serie)), r: 4, strokeWidth: 1.6}),
          Plot.text(ultimos, {x: "anio", y: "valor", text: (r) => `${r.serie}: ${esPct ? pct(r.pct) : `${(r.num / 1e6).toFixed(1)} M`}`, dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(filas, Plot.pointerX({x: "anio", y: "valor", z: "serie", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Población", (r) => r.serie], ["Porcentaje", (r) => `${pct(r.pct, 2)}${r.ee ? ` (± ${(196 * r.ee).toFixed(2)})` : ""}`], ["Personas", (r) => entero(r.num)], ["Fuente", (r) => (r.cota === "muestra" ? "estimación de encuesta" : "conteo censal")]])})),
          Plot.ruleY([0])]})]),
    clavesSerie(),
    fuenteDe({datos: ["R-INEGI-2004-PI", "R-CONTEO-2005-TAB-LI", "D-ITER-2020-NAL", "R-CENSO-2020-TAB-ETN", "D-EIC-2015-NAL", "D-EIC-2025-MICRO", "R-EIC-2025-TAB-ETN"],
      cotejos: ["hablantes3_nacional_2015_micro", "hablantes3_nacional_2025_micro", "hablantes3_nacional_2020", "pct_autoads_nacional_2020"],
      nota: "Los hablantes de 5 años y más de 1990 a 2010 y de 2020 son cifras publicadas por el INEGI. Los de 2015 y 2025 se calculan con los microdatos de las intercensales, porque sus tabulados empiezan en 3 años; el mismo cálculo desde 3 años reproduce exactamente la cifra publicada."}),
    explicacion("La pregunta de lengua se hizo a partir de los 5 años hasta 2005 y a partir de los 3 desde 2010. Para que las ocho ediciones se puedan comparar, los hablantes se cuentan siempre sobre la población de 5 años y más. La autoadscripción cambió de universo: 5 años y más en 2000, 3 y más en 2010 y 2020, toda la población en 2015 y 2025, y en 2015 existió además la categoría 'se considera en parte'. La población en hogares indígenas es un indicador que el INEGI calcula desde 2005: cuenta a quienes viven en un hogar donde la jefa, el jefe o su cónyuge habla una lengua indígena, y desde 2020 también algún ascendiente, así que parte del cambio entre 2010 y 2020 es de definición. La Intercensal de 2015 no la publica. No es la población indígena del INPI, que suma además a los hablantes fuera de esos hogares."),
    tablaColumnas(filas.slice().sort((a, b) => a.anio - b.anio || a.serie.localeCompare(b.serie)), [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Población", valor: (r) => r.serie}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población de referencia", num: true, valor: (r) => entero(r.den)}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Universo", valor: (r) => uni(r.universo)}, {etiqueta: "Fuente", valor: (r) => r.tabla}], {titulo: "Ver la serie con sus fuentes"}));
}
panelS.addEventListener("input", pintarS);
pintarS();
display(html`<section class="beta-seccion">${panelS}${cuerpoS}</section>`);
```

---

<h2 id="por-alcaldia" class="toc-anchor">Cada alcaldía, 1990 - 2025</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">02</span> Cada alcaldía, 1990 - 2025</span>
  <p class="seccion-entrada">La ciudad tiene dieciséis alcaldías con historias propias, y el promedio de la ciudad no deja ver lo que pasa en cada una. Por eso se dibujan por separado, con la misma escala y con la ciudad como referencia.</p>
</header>

```js
const serieAlc = (await FileAttachment("../data/serie_alcaldias.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio), cve: String(r.cve).padStart(3, "0")}));
const hab5 = serieAlc.filter((r) => r.poblacion === "hablantes5" && r.sexo === "Total" && r.den > 0).map((r) => ({...r, pct: 100 * r.num / r.den}));
const alc5 = hab5.filter((r) => r.nivel === "alcaldia");
const ciudad5 = hab5.filter((r) => r.nivel === "entidad");
const ULTIMO = Math.max(...alc5.map((r) => r.anio));
const selMedA = campo({id: "c1b-medida", nombre: "medida", etiqueta: "Medida", opciones: [{clave: "pct", etiqueta: "Porcentaje de la población de 5 años y más"}, {clave: "num", etiqueta: "Personas"}], valor: "pct"});
const selOrdA = campo({id: "c1b-orden", nombre: "orden", etiqueta: "Ordenar", opciones: [{clave: "valor", etiqueta: `Por su valor en ${ULTIMO}`}, {clave: "nombre", etiqueta: "Por nombre"}], valor: "valor"});
const panelAlc = html`<div class="panel-filtros"><div class="panel-campos">${selMedA}${selOrdA}</div></div>`;
const cuerpoAlc = document.createElement("div");
// Ejes fijos: el máximo de las 16 alcaldías en las ocho ediciones, igual en
// todos los paneles, para que la altura de una línea se compare con las demás.
// El 1.35 deja aire arriba para el nombre de la alcaldía, que va dentro del panel.
const TOPE_ALC = {pct: Math.max(...alc5.map((r) => r.pct)) * 1.35, num: Math.max(...alc5.map((r) => r.num)) * 1.35};
function pintarAlc() {
  const esPct = selMedA.value === "pct", campoV = esPct ? "pct" : "num";
  const nombres = [...new Set(alc5.map((r) => r.nombre))];
  const ultimo = new Map(alc5.filter((r) => r.anio === ULTIMO).map((r) => [r.nombre, r[campoV]]));
  const orden = selOrdA.value === "nombre" ? nombres.sort((a, b) => a.localeCompare(b, "es")) : nombres.sort((a, b) => (ultimo.get(b) ?? 0) - (ultimo.get(a) ?? 0));
  const COLS = width < 700 ? 2 : 4;
  const pos = new Map(orden.map((n, i) => [n, {col: i % COLS, fila: Math.floor(i / COLS)}]));
  const datos = alc5.map((r) => ({...r, valor: r[campoV], ...pos.get(r.nombre)}));
  const ref = esPct ? ciudad5.map((r) => ({...r, valor: r.pct})) : [];
  const rotulos = orden.map((n) => ({nombre: n, ...pos.get(n)}));
  const filasN = Math.ceil(orden.length / COLS);
  cuerpoAlc.replaceChildren(
    figura({titulo: `Hablantes de lengua indígena en cada alcaldía, 1990 - ${ULTIMO}`, subtitulo: `${esPct ? "Porcentaje de la población de 5 años y más; la línea gris es la ciudad" : "Personas de 5 años y más"}. Los puntos huecos son estimaciones de encuesta`, pie: "Censos, conteos e intercensales (INEGI) · cada panel es una alcaldía y cada punto una edición, con la misma escala en todos"},
      [Plot.plot({width: Math.min(1320, width), height: 150 * filasN + 40, marginLeft: 52, marginTop: 10,
        fx: {axis: null, padding: 0.12}, fy: {axis: null, padding: 0.18},
        x: {label: null, ticks: [1990, 2005, 2025], tickFormat: (d) => String(d), inset: 8},
        y: esPct ? ejePct(null, {domain: [0, TOPE_ALC.pct], ticks: 3}) : {label: null, grid: true, domain: [0, TOPE_ALC.num], ticks: 3, tickFormat: (d) => `${(d / 1000).toFixed(0)} mil`},
        marks: [
          Plot.frame({stroke: "var(--border-subtle, #ddd)"}),
          ...(esPct ? [Plot.line(ref, {x: "anio", y: "valor", stroke: COLOR_REFERENCIA, strokeDasharray: "3,3", strokeWidth: 1.2})] : []),
          Plot.line(datos, {x: "anio", y: "valor", fx: "col", fy: "fila", stroke: COLOR_UNICO, strokeWidth: 2}),
          Plot.dot(datos, {x: "anio", y: "valor", fx: "col", fy: "fila", stroke: COLOR_UNICO, fill: (r) => (r.cota === "censo" ? COLOR_UNICO : "white"), r: 2.8}),
          Plot.text(rotulos, {fx: "col", fy: "fila", text: "nombre", frameAnchor: "top-left", dx: 6, dy: 6, fontSize: 11.5, fontWeight: 600}),
          Plot.tip(datos, Plot.pointerX({x: "anio", y: "valor", fx: "col", fy: "fila", maxRadius: Infinity, ...GLOBO,
            ...globo([["Alcaldía", (r) => r.nombre], ["Año", (r) => r.anio], ["Porcentaje", (r) => `${pct(r.pct, 2)}${r.ee ? ` (± ${(196 * r.ee).toFixed(2)})` : ""}`], ["Hablantes", (r) => entero(r.num)]])})),
        ]})]),
    clavesSerie(),
    fuenteDe({datos: ["D-ITER-1990", "D-ITER-1995", "D-ITER-2000", "D-ITER-2005", "D-ITER-2010", "D-EIC-2015", "D-ITER-2020", "D-EIC-2025-MICRO"],
      cotejos: ["cdmx_hli5_1995_n", "cdmx_hli5_2000_n", "cdmx_hli5_2005_n", "cdmx_hli5_2010_n", "cdmx_hli5_2020_n", "word_tabla2_celdas_iguales", "eic2025_alcaldias_iguales"],
      nota: "Los totales de la ciudad reproducen las cifras publicadas; por alcaldía, 2015 reproduce la tabla del documento de la Secretaría de Cultura y 2025 el tabulado de la Encuesta Intercensal, ambos sobre la población de 3 años y más."}),
    explicacion("Cada panel es una alcaldía con sus hablantes de lengua indígena de 5 años y más en las ocho ediciones, de 1990 a 2025. Todos los paneles tienen la misma escala, así que una línea más alta es una alcaldía con más hablantes en proporción a su población. En porcentaje, la línea gris punteada es la ciudad completa, como referencia. Los valores de 2015 y 2025 son estimaciones de las encuestas intercensales y llevan su margen de error en el globo."),
    tablaColumnas(datos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.anio - b.anio), [{etiqueta: "Alcaldía", valor: (r) => r.nombre}, {etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población de 5 años y más", num: true, valor: (r) => entero(r.den)}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Fuente", valor: (r) => r.cota === "censo" ? "conteo censal" : "encuesta"}], {titulo: "Ver la serie de cada alcaldía"}));
}
panelAlc.addEventListener("input", pintarAlc);
pintarAlc();
display(html`<section class="beta-seccion">${panelAlc}${cuerpoAlc}</section>`);
```

---

<h2 id="orden-de-las-lenguas" class="toc-anchor">El orden de las lenguas en la ciudad</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">03</span> El orden de las lenguas en la ciudad</span>
  <p class="seccion-entrada">Además de cuántos hablantes hay, importa de qué lenguas son. El lugar que ocupa cada lengua en la ciudad, edición tras edición, muestra si la mezcla de lenguas cambia o se mantiene.</p>
</header>

```js
import {bump} from "../components/formas.js";
const lenguasCiudad = (await FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}))
  .map((r) => ({...r, anio: Number(r.anio), lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(3, "0")}))
  .filter((r) => r.lengua < "8000" && r.num > 0);
const aniosB = [...new Set(lenguasCiudad.map((r) => r.anio))].sort();
// Lugar de cada lengua en cada edición, entre todas las que tienen hablantes.
// El orden se calcula dentro de la selección (ciudad o alcaldía, y sexo).
const lugaresDe = (sexo, alc) => { const u = lenguasCiudad.filter((r) => r.sexo === sexo && (alc ? r.nivel === "alcaldia" && r.cve === alc : r.nivel === "entidad"));
  return aniosB.flatMap((a) => u.filter((r) => r.anio === a).sort((x, y) => y.num - x.num).map((r, i) => ({...r, lugar: i + 1}))); };
const ultimoB = aniosB.at(-1);
const TOP_B = lugaresDe("Total", "").filter((r) => r.anio === ultimoB && r.lugar <= 10).map((r) => r.lengua_nombre);
const nombreAlcB = new Map(lenguasCiudad.filter((r) => r.nivel === "alcaldia").map((r) => [r.cve, r.nombre]));
const MAX_LUGAR = 15;
const selDest = campo({id: "c1c-dest", nombre: "lengua", etiqueta: "Resaltar lengua", opciones: TOP_B.map((n) => ({clave: n, etiqueta: n})), valor: TOP_B[0]});
const selAlcB2 = campo({id: "c1c-alc", nombre: "alcaldia", etiqueta: "Alcaldía", opciones: [{clave: "", etiqueta: "Toda la ciudad", grupo: "En conjunto"}, ...[...nombreAlcB.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))], valor: ""});
const selSexoB2 = campo({id: "c1c-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: "En conjunto"}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: "Una a una"}, {clave: "Hombres", etiqueta: "Hombres", grupo: "Una a una"}], valor: "Total"});
const panelB2 = html`<div class="panel-filtros"><div class="panel-campos">${selAlcB2}${selSexoB2}${selDest}</div></div>`;
const cuerpoB2 = document.createElement("div");
function pintarB2() {
  const sexo = selSexoB2.value, alc = selAlcB2.value;
  const lugar = alc ? nombreAlcB.get(alc) : "la ciudad";
  const lugares = lugaresDe(sexo, alc);
  // Las diez mayores de la selección en la última edición con dato.
  const ultimoSel = Math.max(...lugares.map((r) => r.anio));
  const top = lugares.filter((r) => r.anio === ultimoSel && r.lugar <= 10).map((r) => r.lengua_nombre);
  const datos = lugares.filter((r) => top.includes(r.lengua_nombre) && r.lugar <= MAX_LUGAR).map((r) => ({...r, serie: r.lengua_nombre}));
  const destacada = top.includes(selDest.value) ? selDest.value : null;
  cuerpoB2.replaceChildren(
    figura({titulo: `El lugar de las diez lenguas más habladas de ${lugar} en ${ultimoSel}, edición por edición`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}1 es la lengua con más hablantes en ${lugar} ese año${destacada ? `; resaltada: ${destacada}` : ""}`, pie: "Censos, conteos e intercensales (INEGI), muestras de la ciudad · cada círculo es el lugar de una lengua en una edición; fuera del lugar 15 la línea se corta"},
      [bump(datos, {ancho: Math.min(1320, width), destacada, maxLugar: MAX_LUGAR,
        renglones: [["Lengua", (r) => r.serie], ["Año", (r) => r.anio], [`Lugar en ${lugar}`, (r) => r.lugar], ["Hablantes", (r) => entero(r.num)]]})]),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["nahuatl_2015", "nahuatl_2020", "word_tabla2_celdas_iguales"], lectura: ["R-SECULT-LENGUAS"]}),
    explicacion("Cada columna es una edición y cada círculo dice qué lugar ocupó la lengua entre todas las que tienen hablantes en la ciudad ese año: 1 es la de más hablantes. Se siguen las diez lenguas más habladas de la edición más reciente. Las cifras salen de las muestras censales, que preguntan desde los 5 años hasta 2005 y desde los 3 a partir de 2010; el cambio de edad casi no mueve el orden. Cuando dos lenguas tienen cifras parecidas, su lugar puede cambiar por el margen de error de la muestra."),
    tablaColumnas(datos.slice().sort((a, b) => a.anio - b.anio || a.lugar - b.lugar), [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Lugar", num: true, valor: (r) => r.lugar}, {etiqueta: "Lengua", valor: (r) => r.serie}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}], {titulo: "Ver los lugares"}));
}
panelB2.addEventListener("input", pintarB2);
alCambiarModo(() => pintarB2());
pintarB2();
display(html`<section class="beta-seccion">${panelB2}${cuerpoB2}</section>`);
```

<div class="relato-cierre">
  <p>Hasta aquí cada lengua se trató como una sola. Pero una lengua tiene variantes, y quienes hablan variantes distintas no siempre se entienden entre sí.</p>
  <a class="book-cta book-cta-primary" href="./variantes">Sigue: Variantes y origen</a>
</div>
