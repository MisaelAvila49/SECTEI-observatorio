---
title: Violencia contra las mujeres indígenas
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const endireh = (await FileAttachment("../data/endireh.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const EDAD_ETIQ = {"15-29": "15 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};
const CRITERIOS = [{clave: "lengua", etiqueta: "Hablan una lengua indígena"}, {clave: "autoads", etiqueta: "Se consideran indígenas"}];
const SERIE = {"Indígena": "Población indígena", "Resto": "Resto de la población"};
const fila = (geo, crit, grupo, ind, per) => endireh.find((r) => r.ambito_geo === geo && r.criterio === crit && r.grupo === grupo && r.edad === "Todas" && r.indicador === ind && r.periodo === per);
const pr = (r) => (r ? 100 * r.num / r.den : null);

function seccionEndireh({id, indicadores, titulo, pie, explica, fuentes = {}}) {
  const cGeo = campo({id: `${id}-geo`, nombre: "geo", etiqueta: "Dónde", opciones: [{clave: "Nacional", etiqueta: "Todo el país"}, {clave: "Ciudad de México", etiqueta: "Ciudad de México"}], valor: "Nacional"});
  const cCrit = campo({id: `${id}-crit`, nombre: "criterio", etiqueta: "Mujeres indígenas", opciones: CRITERIOS, valor: "lengua"});
  const cPer = campo({id: `${id}-per`, nombre: "periodo", etiqueta: "Periodo", opciones: [{clave: "vida", etiqueta: "A lo largo de la vida"}, {clave: "12 meses", etiqueta: "Últimos 12 meses"}], valor: "vida"});
  const cEdad = campo({id: `${id}-edad`, nombre: "edad", etiqueta: "Grupo de edad", opciones: [{clave: "Todas", etiqueta: "15 años y más", grupo: "En conjunto"}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: "En conjunto"}, ...Object.entries(EDAD_ETIQ).map(([k, v]) => ({clave: k, etiqueta: v, grupo: "Una a una"}))], valor: "Todas"});
  const panel = html`<div class="panel-filtros"><div class="panel-campos">${cGeo}${cCrit}${cPer}${cEdad}</div></div>`;
  const cuerpo = document.createElement("div");
  // Eje FIJO por sección: el máximo de todos los lugares, criterios, periodos
  // y edades de sus indicadores, para que cambiar un filtro mueva la barra y
  // no el fondo.
  const MAX_X = Math.min(100, Math.max(10, ...endireh.filter((r) => indicadores.includes(r.indicador) && r.den > 0).map((r) => 100 * r.num / r.den)) * 1.1);
  function pintar() {
    const sep = cEdad.value === SEPARADO;
    const f = endireh.filter((r) => r.ambito_geo === cGeo.value && r.criterio === cCrit.value && indicadores.includes(r.indicador) && r.periodo === cPer.value && (sep ? r.edad !== "Todas" : r.edad === cEdad.value))
      .map((r) => ({...r, serie: SERIE[r.grupo], pct: 100 * r.num / r.den, faceta: sep ? EDAD_ETIQ[r.edad] : ""}));
    const cats = indicadores.filter((k) => f.some((r) => r.indicador === k));
    const fx = sep ? {fx: "faceta"} : {};
    const series = Object.values(SERIE);
    const maxX = MAX_X;
    const marcas = series.flatMap((s, k) => {
      const d = f.filter((r) => r.serie === s), dy = k === 0 ? -8 : 8;
      return [Plot.barX(d, {x: "pct", y: "indicador", fill: "serie", dy, insetTop: 13, insetBottom: 13, ...fx}),
        Plot.ruleX(d.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => Math.min(maxX, r.pct + 196 * r.ee), y: "indicador", dy, stroke: "currentColor", strokeOpacity: 0.55, ...fx}),
        Plot.text(d, {x: "pct", y: "indicador", text: (r) => pct(r.pct), dx: 6, dy, textAnchor: "start", fontSize: 11, ...fx})];
    });
    const faltaFamiliar = indicadores.includes("Familiar") && cPer.value === "vida";
    cuerpo.replaceChildren(
      figura({titulo, subtitulo: `${cGeo.value === "Nacional" ? "Todo el país" : "Ciudad de México"} · 2021 · ${cPer.value === "vida" ? "a lo largo de la vida" : "últimos 12 meses"}${sep ? " · un panel por grupo de edad" : cEdad.value !== "Todas" ? ` · ${EDAD_ETIQ[cEdad.value]}` : ""}`, pie},
        [Plot.plot({marginLeft: 180, marginRight: 60, height: 60 + 44 * cats.length, width: Math.min(1000, width), ...(sep ? {fx: {label: null, domain: Object.values(EDAD_ETIQ)}} : {}),
          color: {domain: series, range: series.map((s) => COLOR_SERIE[s]), legend: true}, x: {label: "% de las mujeres del grupo", grid: true, domain: [0, maxX]}, y: {label: null, domain: cats},
          marks: [...marcas, Plot.tip(f, Plot.pointer({x: "pct", y: "indicador", ...fx, maxRadius: Infinity, ...GLOBO, ...globo([["Ámbito o tipo", (r) => r.indicador], ["Grupo", (r) => r.serie], ["Edad", (r) => r.faceta || null], ["Porcentaje", (r) => `${pct(r.pct)}${r.ee ? ` (± ${(196 * r.ee).toFixed(1)})` : ""}`], ["Mujeres", (r) => `${entero(r.num)} de ${entero(r.den)}`], ["Entrevistas", (r) => r.casos]])})), Plot.ruleX([0])]})]),
      faltaFamiliar ? html`<p class="beta-nota">La violencia familiar solo se pregunta para los últimos 12 meses; elige ese periodo para verla.</p>` : "",
      cGeo.value === "Ciudad de México" ? html`<p class="beta-nota">En la Ciudad de México la muestra de mujeres indígenas es chica: las líneas de cada barra muestran el intervalo de 95 %, y cuando se enciman las dos barras la diferencia no es distinguible.</p>` : "",
      fuenteDe({datos: ["D-ENDIREH-2021"], cotejos: ["vida_total_2021", "vida_hli_2021", "vida_autoads_2021", "12m_total_2021", "12m_hli_2021", "12m_autoads_2021"], ...fuentes}),
      explicacion(explica),
      tablaColumnas(f, [{etiqueta: "Indicador", valor: (r) => r.indicador}, {etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "Edad", valor: (r) => EDAD_ETIQ[r.edad] ?? "15 y más"}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(1)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(1) : "")}, {etiqueta: "Mujeres", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Del grupo", num: true, valor: (r) => entero(r.den)}, {etiqueta: "Entrevistas", num: true, valor: (r) => r.casos}], {titulo: "Ver los datos"}));
  }
  for (const c of [cGeo, cCrit, cPer, cEdad]) c.select.addEventListener("change", pintar);
  alCambiarModo(() => pintar());
  pintar();
  return html`<section class="beta-seccion">${panel}${cuerpo}</section>`;
}
```

<div class="hero-pagina">
  <span class="kicker">Discriminación, violencia y derechos</span>
  <h1>Violencia contra las mujeres indígenas</h1>
  <p class="hero-entrada">Cuántas mujeres de 15 años y más han vivido violencia, en qué ámbito y de qué tipo, comparando a las mujeres indígenas con el resto, según la Encuesta Nacional sobre la Dinámica de las Relaciones en los Hogares (ENDIREH) 2021 del INEGI, para el país y para la Ciudad de México.</p>
</div>

```js
display(kpis([
  {etiqueta: "Mujeres hablantes con violencia a lo largo de la vida", cifra: pct(pr(fila("Nacional", "lengua", "Indígena", "Cualquier ámbito", "vida"))), nota: `no hablantes: ${pct(pr(fila("Nacional", "lengua", "Resto", "Cualquier ámbito", "vida")))}; país, 2021`},
  {etiqueta: "Mujeres hablantes con violencia de pareja", cifra: pct(pr(fila("Nacional", "lengua", "Indígena", "Pareja", "vida"))), nota: `no hablantes: ${pct(pr(fila("Nacional", "lengua", "Resto", "Pareja", "vida")))}; entre mujeres con pareja alguna vez`},
  {etiqueta: "Mujeres que se consideran indígenas, Ciudad de México", cifra: pct(pr(fila("Ciudad de México", "autoads", "Indígena", "Cualquier ámbito", "vida"))), nota: `resto: ${pct(pr(fila("Ciudad de México", "autoads", "Resto", "Cualquier ámbito", "vida")))}; a lo largo de la vida`},
]));
```

---

<h2 id="por-ambito" class="toc-anchor">Dónde ocurre: por ámbito</h2>

```js
display(seccionEndireh({id: "c8a", indicadores: ["Cualquier ámbito", "Pareja", "Familiar", "Escolar", "Laboral", "Comunitario"],
  titulo: "Mujeres que han vivido violencia, por ámbito",
  pie: "INEGI, ENDIREH 2021, mujeres de 15 años y más · cada par de barras es un ámbito; la línea, el intervalo de 95 %",
  explica: "La ENDIREH pregunta a cada mujer por situaciones concretas de violencia en cinco ámbitos. Cada ámbito tiene su propio universo: la violencia de pareja se calcula entre mujeres que han tenido pareja; la escolar, entre quienes asistieron a la escuela; la laboral, entre quienes han trabajado; la familiar (solo últimos 12 meses) y la comunitaria, entre todas. La condición indígena la responde quien informa sobre el hogar: si la mujer habla una lengua indígena o si se considera indígena (sí o en parte). Menos violencia declarada no significa necesariamente menos violencia: también influyen el acceso a la encuesta y lo que cada mujer identifica como violencia."}));
```

---

<h2 id="por-tipo" class="toc-anchor">De qué tipo</h2>

```js
display(seccionEndireh({id: "c8b", fuentes: {referencia: ["R-ENDIREH-2021-TAB"], nota: "Se cotejan las prevalencias totales de la encuesta; la prevalencia de cada tipo no tiene todavía un cotejo propio y se puede consultar en los tabulados del INEGI."}, indicadores: ["Psicológica", "Física", "Sexual", "Económica o patrimonial"],
  titulo: "Mujeres que han vivido violencia, por tipo",
  pie: "INEGI, ENDIREH 2021, mujeres de 15 años y más · cada par de barras es un tipo de violencia, en cualquier ámbito",
  explica: "Los tipos agrupan las situaciones que la encuesta pregunta en todos los ámbitos: psicológica (insultos, humillaciones, amenazas), física (golpes, empujones, agresiones con armas), sexual (acoso, abuso, violación) y económica o patrimonial (control del dinero, despojo de bienes). Una mujer puede haber vivido varios tipos."}));
```
