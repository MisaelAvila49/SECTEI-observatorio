---
title: Salud, discapacidad y español
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {seccionPerfil, CRITERIOS} from "../components/seccion-perfil.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE, COLOR_UNICO, ejePct, ordinal, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const perfil = (await FileAttachment("../data/perfil_ciudad.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const PERFIL_DATOS = ["D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
// Qué se cotejó para cada tema del perfil. El INEGI publica para 2025, por
// entidad, la discapacidad, la afiliación y la participación económica de
// hablantes y de quienes se consideran indígenas; la distribución por nivel de
// estudios y la posición en el trabajo no, y ahí se remite a lo más cercano.
const COTEJOS_PERFIL = {
  esc: {cotejos: [], referencia: ["R-EIC-2025-TAB-ETN"], nota: "El INEGI no publica la distribución por nivel de estudios de la población indígena de la ciudad; su tabulado de etnicidad trae el grado promedio de escolaridad y la tasa de alfabetismo de hablantes y de quienes se consideran indígenas."},
  act: {cotejos: ["pea_hli_2025", "pea_autoads_2025", "pea_2025", "ocupada_pea_2025"]},
  pos: {cotejos: [], referencia: ["R-EIC-2025-TAB-ETN"], nota: "El INEGI no publica la posición en el trabajo de la población indígena de la ciudad; el tabulado de etnicidad trae su condición de actividad, cotejada en la gráfica de actividad."},
  dom: {cotejos: [], referencia: ["R-SECULT-LENGUAS"], nota: "No hay tabulado oficial del trabajo doméstico remunerado por condición indígena; el documento de la Secretaría de Cultura lo señala como ocupación frecuente de las mujeres hablantes."},
  afil: {cotejos: ["afiliada_hli_2025", "afiliada_autoads_2025", "afiliada_2025"]},
  dis: {cotejos: ["discapacidad_hli_2025", "discapacidad_autoads_2025", "discapacidad_2025"]},
};
const fuentesPerfil = (tema) => fuenteDe({datos: PERFIL_DATOS, ...(COTEJOS_PERFIL[tema.clave] ?? {})});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const EDAD_ETIQ = {"3-14": "3 a 14 años", "15-29": "15 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>Salud, discapacidad y español</h1>
  <p class="hero-entrada">Quiénes tienen acceso a servicios de salud, quiénes viven con alguna discapacidad y cuántos hablantes no hablan español, frente al resto de la población.</p>
</div>

---

<h2 id="salud" class="toc-anchor">Salud y discapacidad</h2>

```js
display(seccionPerfil(perfil, {id: "c3sal", fuentes: fuentesPerfil, temas: [
  {clave: "afil", etiqueta: "Afiliación a servicios de salud", dimension: "salud", categorias: ["Afiliada"], edades: ["3-14", "15-29", "30-59", "60+"],
   titulo: ({crit}) => `Personas afiliadas a algún servicio de salud (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada barra es un grupo; la línea, el intervalo de 95 %",
   explica: "Si la persona está afiliada o tiene derecho a servicios médicos en alguna institución: IMSS, ISSSTE, Pemex, Defensa o Marina, Seguro Popular, INSABI o IMSS-Bienestar, seguro privado u otra. No es lo mismo que el lugar donde se atiende. En 2015 el Seguro Popular contaba como afiliación."},
  {clave: "dis", etiqueta: "Discapacidad", dimension: "discapacidad", categorias: ["Con discapacidad"], edades: ["3-14", "15-29", "30-59", "60+"], anios: [2020, 2025],
   titulo: ({crit}) => `Personas con discapacidad (${crit})`, pie: "Censo 2020 y Encuesta Intercensal 2025 (INEGI), muestras de la Ciudad de México · cada barra es un grupo",
   explica: "Personas con mucha dificultad o que no pueden ver, oír, caminar, recordar, bañarse o vestirse, o hablar, según la escala del Grupo de Washington que el INEGI usa desde 2020. El Censo 2010 preguntó de otra forma y la Intercensal 2015 no preguntó, por eso solo hay dos ediciones comparables."},
]}));
```

---

<h2 id="monolinguismo" class="toc-anchor">Hablantes que no hablan español</h2>

```js
const mono = perfil.filter((r) => r.dimension === "monolingue" && r.criterio === "lengua" && r.grupo === "Indígena");
// Eje fijo para todos los cortes de sexo y edad, y color por NOMBRE de serie:
// asignarlo por posición dejaba a los de 15 a 29 años con el tono de los de
// 3 a 14 porque así venían ordenadas las filas.
const MAX_MONO = Math.max(...mono.filter((r) => r.den > 0).map((r) => 100 * r.num / r.den)) * 1.25;
const colorMono = (s) => (s === "Mujeres" ? COLOR_SERIE["Mujeres indígenas"] : s === "Hombres" ? COLOR_SERIE["Hombres indígenas"]
  : Object.values(EDAD_ETIQ).includes(s) ? ordinal(4)[Object.values(EDAD_ETIQ).indexOf(s)] : COLOR_UNICO);
const cSexoM = campo({id: "c3m-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: "En conjunto"}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: "En conjunto"}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: "Una a una"}, {clave: "Hombres", etiqueta: "Hombres", grupo: "Una a una"}], valor: SEPARADO});
const cEdadM = campo({id: "c3m-edad", nombre: "edad", etiqueta: "Grupo de edad", opciones: [{clave: "Todas", etiqueta: "Todas las edades", grupo: "En conjunto"}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: "En conjunto"}, ...Object.entries(EDAD_ETIQ).map(([k, v]) => ({clave: k, etiqueta: v, grupo: "Una a una"}))], valor: "Todas"});
const panelM = html`<div class="panel-filtros"><div class="panel-campos">${cSexoM}${cEdadM}</div></div>`;
const cuerpoM = document.createElement("div");
function pintarM() {
  // Sexo y edad a la vez darían ocho líneas; se queda el sexo y la edad vuelve al total.
  const sexoSep = cSexoM.value === SEPARADO, edadSep = cEdadM.value === SEPARADO && !sexoSep;
  const avisoM = cEdadM.value === SEPARADO && sexoSep ? html`<p class="beta-nota">Con sexo y edad por separado a la vez se muestra solo el sexo; elige un sexo para ver los grupos de edad.</p>` : "";
  const edadFija = cEdadM.value === SEPARADO ? "Todas" : cEdadM.value;
  const f = mono.filter((r) => (sexoSep ? r.sexo !== "Total" : r.sexo === cSexoM.value) && (edadSep ? r.edad !== "Todas" : r.edad === edadFija))
    .map((r) => ({...r, pct: 100 * r.num / r.den, serie: [sexoSep ? r.sexo : "", edadSep ? EDAD_ETIQ[r.edad] : ""].filter(Boolean).join(" · ") || "Hablantes"}));
  const orden = sexoSep ? ["Mujeres", "Hombres"] : edadSep ? Object.values(EDAD_ETIQ) : ["Hablantes"];
  const series = orden.filter((s) => f.some((r) => r.serie === s));
  cuerpoM.replaceChildren(
    figura({titulo: "Hablantes de lengua indígena que no hablan español, 2010 - 2025", subtitulo: "Porcentaje de los hablantes que declararon no hablar español", pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada línea es un grupo; la banda, el intervalo de 95 %"},
      [Plot.plot({height: 280, width: Math.min(920, width), marginLeft: 50, marginRight: 150, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {domain: [0, MAX_MONO]}),
        color: {domain: series, range: series.map(colorMono)},
        marks: [Plot.areaY(f.filter((r) => r.ee), {x: "anio", y1: (r) => Math.max(0, r.pct - 196 * r.ee), y2: (r) => Math.min(MAX_MONO, r.pct + 196 * r.ee), fill: "serie", fillOpacity: 0.12, z: "serie"}),
          Plot.line(f, {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2}), Plot.dot(f, {x: "anio", y: "pct", fill: "serie", r: 3.5}),
          Plot.text(f.filter((r) => r.anio === 2025), {x: "anio", y: "pct", text: "serie", dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(f, Plot.pointerX({x: "anio", y: "pct", z: "serie", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Grupo", (r) => r.serie], ["No habla español", (r) => `${pct(r.pct, 2)}${r.ee ? ` (± ${(196 * r.ee).toFixed(2)})` : ""}`], ["Hablantes", (r) => `${entero(r.num)} de ${entero(r.den)}`]])})), Plot.ruleY([0])]})]),
    avisoM,
    fuenteDe({datos: PERFIL_DATOS, cotejos: ["monolingue_2025", "sepi_monolingues_alcaldia_iguales"], lectura: ["R-SEPI-2024-DIV"]}),
    explicacion("De quienes hablan una lengua indígena, qué parte declaró no hablar español. En la ciudad es una proporción chica y con mucho error por la muestra; por eso la banda. El universo son los hablantes que respondieron la pregunta; en 2010 y 2015 más de una décima parte no la respondió."),
    tablaColumnas(f, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
}
panelM.addEventListener("input", pintarM);
alCambiarModo(() => pintarM());
pintarM();
display(html`<section class="beta-seccion">${panelM}${cuerpoM}</section>`);
```
