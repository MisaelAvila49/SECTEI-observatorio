---
title: Edad y sexo
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {seccionPerfil, CRITERIOS} from "../components/seccion-perfil.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE, ejePct, ordinal, alCambiarModo, GLOBO, globo} from "../components/base.js";
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

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-3"><svg class="motivo motivo-vida" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path d="M24,300 H64 V246 L98,216 L132,246 V300 H168 V226 L201,198 L234,226 V300 H268 V150 H340 V300 H372 V238 H446 V300 H576" fill="none" stroke="#3a3a37" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f5" pathLength="1" d="M88,300 V272 H108 V300" fill="none" stroke="#8a8a86" stroke-width="2.5"/><path class="a-dib f6" pathLength="1" d="M201,198 V176 L220,182 L201,188" fill="none" stroke="#8a8a86" stroke-width="2.5" stroke-linejoin="round"/><path class="a-dib f7" pathLength="1" d="M282,172 H326 M282,196 H326 M282,220 H326 M282,244 H326" fill="none" stroke="#8a8a86" stroke-width="2.5"/><path class="a-dib f8" pathLength="1" d="M409,252 V284 M393,268 H425" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linecap="round"/><path class="a-dib f0" pathLength="1" d="M24,300 H64 V246 L98,216 L132,246 V300 H168 V226 L201,198 L234,226 V300 H268 V150 H340 V300 H372 V238 H446 V300 H576" fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle class="a-esc f10" cx="520" cy="282" r="13" fill="#e8474f"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 3 · Quiénes son y cómo viven · 1 de 4</p>
  <h1>Edad y sexo</h1>
  <p class="portada-capitulo-dek">La tercera parte compara a la población indígena de la ciudad con el resto, con la misma pregunta y en el mismo año.</p>
  </div>
</header>

<p class="entrada-capitulo">Empieza por lo más básico: la edad y el sexo.</p>

---

<h2 id="edad-y-sexo" class="toc-anchor">Edad y sexo</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">01</span> Edad y sexo</span>
  <p class="seccion-entrada">La edad es la clave de la transmisión de una lengua: una lengua se mantiene si las niñas y los niños la aprenden. La pirámide compara la forma de las dos poblaciones, y la segunda gráfica muestra qué parte de cada grupo de edad es indígena a lo largo de las ediciones.</p>
</header>

```js
const aniosP = [...new Set(perfil.filter((r) => r.dimension === "piramide").map((r) => r.anio))].sort();
const cAnioA = campo({id: "c3a-anio", nombre: "anio", etiqueta: "Año", opciones: aniosP.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosP.at(-1))});
const cCritA = campo({id: "c3a-criterio", nombre: "criterio", etiqueta: "Población indígena", opciones: CRITERIOS, valor: "lengua"});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${cAnioA}${cCritA}</div></div>`;
const cuerpoA = document.createElement("div");
const ORDEN_EDAD = ["3-4", ...Array.from({length: 16}, (_, i) => `${5 + 5 * i}-${9 + 5 * i}`), "85 y más"];
// Ejes FIJOS: el máximo de todas las ediciones y de los dos criterios. Con el
// máximo de la vista, cambiar de año o de población indígena reescalaba la
// pirámide y la forma no se podía comparar.
const pctDe = (r) => 100 * r.num / r.den;
const LIM_PIR = Math.ceil(Math.max(...perfil.filter((r) => r.dimension === "piramide" && r.den > 0).map(pctDe)) * 1.08);
const MAX_PROP = Math.max(...perfil.filter((r) => r.dimension === "proporcion" && r.den > 0).map(pctDe)) * 1.1;
function pintarA() {
  const anio = Number(cAnioA.value), crit = cCritA.value;
  const pir = perfil.filter((r) => r.dimension === "piramide" && r.anio === anio && r.criterio === crit).map((r) => ({...r, serie: r.grupo === "Indígena" ? "Población indígena" : "Resto de la población", pct: 100 * r.num / r.den, x: (r.sexo === "Mujeres" ? 1 : -1) * 100 * r.num / r.den}));
  const prop = perfil.filter((r) => r.dimension === "proporcion" && r.criterio === crit).map((r) => ({...r, pct: 100 * r.num / r.den, edadEt: EDAD_ETIQ[r.categoria]}));
  const lim = LIM_PIR;
  const nombre = CRITERIOS.find((c) => c.clave === crit).etiqueta.toLowerCase();
  cuerpoA.replaceChildren(
    figura({titulo: `Pirámide de edades: población indígena y resto, ${anio}`, subtitulo: `Porcentaje de cada grupo en cada edad y sexo; a la izquierda hombres, a la derecha mujeres · población indígena: ${nombre}`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada barra es un grupo de edad de cinco años; las dos poblaciones se superponen"},
      [Plot.plot({height: 440, width: Math.min(1320, width), marginLeft: 60, x: {label: "← hombres · % del grupo · mujeres →", tickFormat: (d) => Math.abs(d).toFixed(0), domain: [-lim, lim], grid: true}, y: {label: null, domain: ORDEN_EDAD.slice().reverse()},
        color: {domain: ["Población indígena", "Resto de la población"], range: [COLOR_SERIE["Población indígena"], COLOR_SERIE["Resto de la población"]], legend: true},
        marks: [Plot.barX(pir.filter((r) => r.serie === "Resto de la población"), {x: "x", y: "categoria", fill: "serie", fillOpacity: 0.35}),
          Plot.barX(pir.filter((r) => r.serie === "Población indígena"), {x: "x", y: "categoria", fill: "none", stroke: "serie", strokeWidth: 1.6, insetTop: 1, insetBottom: 1}),
          Plot.tip(pir, Plot.pointer({x: "x", y: "categoria", maxRadius: Infinity, ...GLOBO, ...globo([["Edad y sexo", (r) => `${r.categoria} años, ${r.sexo.toLowerCase()}`], ["Grupo", (r) => r.serie], ["Parte del grupo", (r) => pct(r.pct, 2)], ["Personas", (r) => entero(r.num)]])})),
          Plot.ruleX([0])]})]),
    figura({titulo: "Qué parte de cada grupo de edad es indígena, 2010 - 2025", subtitulo: `Porcentaje de la población de cada grupo de edad que ${crit === "lengua" ? "habla una lengua indígena" : "se considera indígena"}`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada línea es un grupo de edad; cada punto, una edición"},
      [Plot.plot({height: Math.round(Math.min(400, Math.max(260, Math.min(1320, width) * 0.3))), width: Math.min(1320, width), marginLeft: 50, marginRight: 110, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {domain: [0, MAX_PROP]}),
        color: {domain: Object.values(EDAD_ETIQ), range: ordinal(4)},
        marks: [Plot.line(prop, {x: "anio", y: "pct", stroke: "edadEt", strokeWidth: 2}), Plot.dot(prop, {x: "anio", y: "pct", fill: "edadEt", r: 3.5}),
          Plot.text(prop.filter((r) => r.anio === Math.max(...prop.map((x) => x.anio))), {x: "anio", y: "pct", text: "edadEt", dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(prop, Plot.pointerX({x: "anio", y: "pct", z: "edadEt", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Grupo de edad", (r) => r.edadEt], [crit === "lengua" ? "Habla una lengua indígena" : "Se considera indígena", (r) => pct(r.pct, 2)], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`]])})), Plot.ruleY([0])]})]),
    fuenteDe({datos: PERFIL_DATOS, cotejos: ["cdmx_hli3_2015_n", "cdmx_hli3_2020_n", "cdmx_hli3_2025", "cdmx_autoads_2015_n", "cdmx_autoads_2020_n", "cdmx_autoads_2025"], referencia: ["R-EIC-2025-TAB-ETN"],
      nota: "Los totales de cada población reproducen las cifras publicadas; la estructura por edad de la población indígena de la ciudad no tiene tabulado con estos grupos."}),
    explicacion("La pirámide compara la forma de las dos poblaciones: cada barra es el porcentaje del grupo que tiene esa edad y ese sexo, así que las dos suman 100 % y se pueden superponer aunque una sea mucho más chica. Entre los hablantes pesan más las edades de trabajo y menos las infantiles; la segunda gráfica lo muestra de otro modo, como la parte de cada grupo de edad que habla la lengua. Que los niños de 3 a 14 años hablen menos que sus padres es la señal de que la lengua se transmite menos."),
    tablaColumnas(prop, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo de edad", valor: (r) => r.edadEt}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Del grupo de edad", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
}
panelA.addEventListener("input", pintarA);
alCambiarModo(() => pintarA());
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

<div class="relato-cierre">
  <p>La edad condiciona lo que sigue: quién está en edad de estudiar y quién en edad de trabajar.</p>
  <a class="book-cta book-cta-primary" href="./escuela-y-trabajo">Sigue: Escuela y trabajo</a>
</div>
