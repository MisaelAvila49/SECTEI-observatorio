---
title: 3. Quiénes son
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {seccionPerfil, CRITERIOS} from "../components/seccion-perfil.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE, ejePct} from "../components/base.js";
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
  <span class="kicker">Capítulo 3</span>
  <h1>Quiénes son</h1>
  <p class="hero-entrada">Cómo es la población indígena de la Ciudad de México frente al resto: su edad, cuánto estudió, en qué trabaja, si tiene servicios de salud y cuántos de sus hablantes solo hablan su lengua. Cada gráfica compara a los dos grupos con la misma pregunta y en el mismo año, de 2010 a 2025.</p>
</div>

```js
// Cifras de entrada, 2025, con el criterio de lengua.
const u = (dim, cat, g = "Indígena") => perfil.find((r) => r.anio === 2025 && r.criterio === "lengua" && r.grupo === g && r.sexo === "Total" && r.edad === "Todas" && r.dimension === dim && r.categoria === cat);
const p = (r) => (r ? 100 * r.num / r.den : null);
display(kpis([
  {etiqueta: "Hablantes con primaria o menos (15 años y más)", cifra: pct(p(u("escolaridad", "Primaria o menos"))), nota: `el resto de la población: ${pct(p(u("escolaridad", "Primaria o menos", "Resto")))}, 2025`},
  {etiqueta: "Hablantes ocupadas en trabajo doméstico remunerado", cifra: pct(p(u("domestico", "Trabajo doméstico remunerado"))), nota: `el resto: ${pct(p(u("domestico", "Trabajo doméstico remunerado", "Resto")))}, 2025`},
  {etiqueta: "Hablantes afiliados a servicios de salud", cifra: pct(p(u("salud", "Afiliada"))), nota: `el resto: ${pct(p(u("salud", "Afiliada", "Resto")))}, 2025`},
]));
```

---

<h2 id="edad-y-sexo" class="toc-anchor">Edad y sexo</h2>

```js
const aniosP = [...new Set(perfil.filter((r) => r.dimension === "piramide").map((r) => r.anio))].sort();
const cAnioA = campo({id: "c3a-anio", nombre: "anio", etiqueta: "Año", opciones: aniosP.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosP.at(-1))});
const cCritA = campo({id: "c3a-criterio", nombre: "criterio", etiqueta: "Población indígena", opciones: CRITERIOS, valor: "lengua"});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${cAnioA}${cCritA}</div></div>`;
const cuerpoA = document.createElement("div");
const ORDEN_EDAD = ["3-4", ...Array.from({length: 16}, (_, i) => `${5 + 5 * i}-${9 + 5 * i}`), "85 y más"];
function pintarA() {
  const anio = Number(cAnioA.value), crit = cCritA.value;
  const pir = perfil.filter((r) => r.dimension === "piramide" && r.anio === anio && r.criterio === crit).map((r) => ({...r, serie: r.grupo === "Indígena" ? "Población indígena" : "Resto de la población", pct: 100 * r.num / r.den, x: (r.sexo === "Mujeres" ? 1 : -1) * 100 * r.num / r.den}));
  const prop = perfil.filter((r) => r.dimension === "proporcion" && r.criterio === crit).map((r) => ({...r, pct: 100 * r.num / r.den, edadEt: EDAD_ETIQ[r.categoria]}));
  const lim = Math.max(...pir.map((r) => r.pct)) * 1.1;
  const nombre = CRITERIOS.find((c) => c.clave === crit).etiqueta.toLowerCase();
  cuerpoA.replaceChildren(
    figura({titulo: `Pirámide de edades: población indígena y resto, ${anio}`, subtitulo: `Porcentaje de cada grupo en cada edad y sexo; a la izquierda hombres, a la derecha mujeres · población indígena: ${nombre}`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada barra es un grupo de edad de cinco años; las dos poblaciones se superponen"},
      [Plot.plot({height: 440, width: Math.min(920, width), marginLeft: 60, x: {label: "← hombres · % del grupo · mujeres →", tickFormat: (d) => Math.abs(d).toFixed(0), domain: [-lim, lim], grid: true}, y: {label: null, domain: ORDEN_EDAD.slice().reverse()},
        color: {domain: ["Población indígena", "Resto de la población"], range: [COLOR_SERIE["Población indígena"], COLOR_SERIE["Resto de la población"]], legend: true},
        marks: [Plot.barX(pir.filter((r) => r.serie === "Resto de la población"), {x: "x", y: "categoria", fill: "serie", fillOpacity: 0.35}),
          Plot.barX(pir.filter((r) => r.serie === "Población indígena"), {x: "x", y: "categoria", fill: "none", stroke: "serie", strokeWidth: 1.6, insetTop: 1, insetBottom: 1}),
          Plot.tip(pir, Plot.pointer({x: "x", y: "categoria", maxRadius: Infinity, title: (r) => `${r.serie} · ${r.sexo} · ${r.categoria} años\n${pct(r.pct, 2)} del grupo\n${entero(r.num)} personas`})),
          Plot.ruleX([0])]})]),
    figura({titulo: "Qué parte de cada grupo de edad es indígena, 2010 - 2025", subtitulo: `Porcentaje de la población de cada grupo de edad que ${crit === "lengua" ? "habla una lengua indígena" : "se considera indígena"}`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada línea es un grupo de edad; cada punto, una edición"},
      [Plot.plot({height: 260, width: Math.min(920, width), marginLeft: 50, marginRight: 110, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {zero: true}),
        color: {domain: Object.values(EDAD_ETIQ), range: ["#bfd3e6", "#8c96c6", "#88419d", "#4d004b"]},
        marks: [Plot.line(prop, {x: "anio", y: "pct", stroke: "edadEt", strokeWidth: 2}), Plot.dot(prop, {x: "anio", y: "pct", fill: "edadEt", r: 3.5}),
          Plot.text(prop.filter((r) => r.anio === Math.max(...prop.map((x) => x.anio))), {x: "anio", y: "pct", text: "edadEt", dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(prop, Plot.pointerX({x: "anio", y: "pct", z: "edadEt", maxRadius: Infinity, title: (r) => `${r.anio} · ${r.edadEt}\n${pct(r.pct, 2)} ${crit === "lengua" ? "habla una lengua indígena" : "se considera indígena"}\n${entero(r.num)} de ${entero(r.den)}`})), Plot.ruleY([0])]})]),
    fuenteDe({datos: PERFIL_DATOS, cotejos: ["cdmx_hli3_2015_n", "cdmx_hli3_2020_n", "cdmx_hli3_2025", "cdmx_autoads_2015_n", "cdmx_autoads_2020_n", "cdmx_autoads_2025"], referencia: ["R-EIC-2025-TAB-ETN"],
      nota: "Los totales de cada población reproducen las cifras publicadas; la estructura por edad de la población indígena de la ciudad no tiene tabulado con estos grupos."}),
    explicacion("La pirámide compara la forma de las dos poblaciones: cada barra es el porcentaje del grupo que tiene esa edad y ese sexo, así que las dos suman 100 % y se pueden superponer aunque una sea mucho más chica. Entre los hablantes pesan más las edades de trabajo y menos las infantiles; la segunda gráfica lo muestra de otro modo, como la parte de cada grupo de edad que habla la lengua. Que los niños de 3 a 14 años hablen menos que sus padres es la señal de que la lengua se transmite menos."),
    tablaColumnas(prop, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo de edad", valor: (r) => r.edadEt}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Del grupo de edad", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
}
panelA.addEventListener("input", pintarA);
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="escolaridad" class="toc-anchor">Escolaridad</h2>

```js
display(seccionPerfil(perfil, {id: "c3esc", fuentes: fuentesPerfil, temas: [{clave: "esc", etiqueta: "Nivel de estudios", dimension: "escolaridad", categorias: ["Primaria o menos", "Secundaria", "Media superior", "Superior"], edades: ["15-29", "30-59", "60+"],
  titulo: ({crit}) => `Nivel de estudios de la población indígena y del resto (${crit})`,
  pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas de 15 años y más · cada par de barras es un nivel; la línea, el intervalo de 95 %",
  explica: "Nivel más alto de estudios aprobado por las personas de 15 años y más, en cuatro tramos: primaria o menos (incluye a quien no fue a la escuela), secundaria, media superior (bachillerato, normal básica y carreras técnicas después de la secundaria) y superior (licenciatura, normal de licenciatura y posgrado). Cada barra es el porcentaje del grupo con ese nivel; las cuatro de un grupo suman 100 %. Quien no especificó su nivel no entra."}]}));
```

---

<h2 id="trabajo" class="toc-anchor">Trabajo</h2>

```js
display(seccionPerfil(perfil, {id: "c3tra", fuentes: fuentesPerfil, temas: [
  {clave: "act", etiqueta: "Condición de actividad", dimension: "actividad", categorias: ["Ocupada", "Desocupada", "No económicamente activa"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Condición de actividad de la población indígena y del resto (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas de 12 años y más · cada par de barras es una condición",
   explica: "Si en la semana anterior la persona trabajó (ocupada), buscó trabajo sin encontrarlo (desocupada) o no hizo ninguna de las dos cosas (no económicamente activa: estudiantes, personas dedicadas al hogar, jubiladas, con alguna limitación permanente). Universo: 12 años y más."},
  {clave: "pos", etiqueta: "Posición en el trabajo", dimension: "posicion", categorias: ["Empleada u obrera", "Jornalera o peona", "Patrona", "Por cuenta propia", "Sin pago"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Posición en el trabajo de la población indígena ocupada y del resto (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas ocupadas · cada par de barras es una posición",
   explica: "Cómo trabaja la persona ocupada: como empleada u obrera (incluye ayudantes con pago), jornalera o peona, patrona o empleadora, por su cuenta o sin recibir pago. Universo: personas ocupadas que especificaron su posición."},
  {clave: "dom", etiqueta: "Trabajo doméstico remunerado", dimension: "domestico", categorias: ["Trabajo doméstico remunerado"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Personas ocupadas en trabajo doméstico remunerado (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas ocupadas; ocupación según el SINCO · cada barra es un grupo",
   explica: "Porcentaje de las personas ocupadas cuya ocupación es la de trabajadora doméstica (código 961 del Sistema Nacional de Clasificación de Ocupaciones; 9611 en 2010). Nueve de cada diez son mujeres. El documento de la Secretaría de Cultura señala esta ocupación como una de las principales de los hablantes en la ciudad."},
]}));
```

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
  const series = [...new Set(f.map((r) => r.serie))];
  const paleta = sexoSep ? [COLOR_SERIE["Hombres indígenas"], COLOR_SERIE["Mujeres indígenas"]] : edadSep ? ["#bfd3e6", "#8c96c6", "#88419d", "#4d004b"] : [COLOR_SERIE["Población indígena"]];
  cuerpoM.replaceChildren(
    figura({titulo: "Hablantes de lengua indígena que no hablan español, 2010 - 2025", subtitulo: "Porcentaje de los hablantes que declararon no hablar español", pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México · cada línea es un grupo; la banda, el intervalo de 95 %"},
      [Plot.plot({height: 280, width: Math.min(920, width), marginLeft: 50, marginRight: 150, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {zero: true}),
        color: {domain: series, range: paleta.slice(0, series.length)},
        marks: [Plot.areaY(f.filter((r) => r.ee), {x: "anio", y1: (r) => Math.max(0, r.pct - 196 * r.ee), y2: (r) => r.pct + 196 * r.ee, fill: "serie", fillOpacity: 0.12, z: "serie"}),
          Plot.line(f, {x: "anio", y: "pct", stroke: "serie", strokeWidth: 2}), Plot.dot(f, {x: "anio", y: "pct", fill: "serie", r: 3.5}),
          Plot.text(f.filter((r) => r.anio === 2025), {x: "anio", y: "pct", text: "serie", dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(f, Plot.pointerX({x: "anio", y: "pct", z: "serie", maxRadius: Infinity, title: (r) => `${r.anio} · ${r.serie}\n${pct(r.pct, 2)} no habla español${r.ee ? ` (± ${(196 * r.ee).toFixed(2)})` : ""}\n${entero(r.num)} de ${entero(r.den)} hablantes`})), Plot.ruleY([0])]})]),
    avisoM,
    fuenteDe({datos: PERFIL_DATOS, cotejos: ["monolingue_2025", "sepi_monolingues_alcaldia_iguales"], lectura: ["R-SEPI-2024-DIV"]}),
    explicacion("De quienes hablan una lengua indígena, qué parte declaró no hablar español. En la ciudad es una proporción chica y con mucho error por la muestra; por eso la banda. El universo son los hablantes que respondieron la pregunta; en 2010 y 2015 más de una décima parte no la respondió."),
    tablaColumnas(f, [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
}
panelM.addEventListener("input", pintarM);
pintarM();
display(html`<section class="beta-seccion">${panelM}${cuerpoM}</section>`);
```
