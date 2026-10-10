---
title: Violencia contra las mujeres indígenas
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis, barrasAgrupadas} from "../components/graficas.js";
import {punto, COLOR_SERIE, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";
import {dumbbell, waffle} from "../components/formas.js";

const endireh = (await FileAttachment("../data/endireh.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const EDAD_ETIQ = {"15-29": "15 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};
const CRITERIOS = [{clave: "lengua", etiqueta: "Hablan una lengua indígena"}, {clave: "autoads", etiqueta: "Se consideran indígenas"}];
const SERIE = {"Indígena": "Población indígena", "Resto": "Resto de la población"};
const fila = (geo, crit, grupo, ind, per) => endireh.find((r) => r.ambito_geo === geo && r.criterio === crit && r.grupo === grupo && r.edad === "Todas" && r.indicador === ind && r.periodo === per);
const pr = (r) => (r ? 100 * r.num / r.den : null);

function seccionEndireh({id, indicadores, titulo, pie, explica, fuentes = {}, forma = "dumbbell"}) {
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
    const faltaFamiliar = indicadores.includes("Familiar") && cPer.value === "vida";
    cuerpo.replaceChildren(
      figura({titulo, subtitulo: `${cGeo.value === "Nacional" ? "Todo el país" : "Ciudad de México"} · 2021 · ${cPer.value === "vida" ? "a lo largo de la vida" : "últimos 12 meses"}${sep ? " · un panel por grupo de edad" : cEdad.value !== "Todas" ? ` · ${EDAD_ETIQ[cEdad.value]}` : ""}`, pie},
        // Por ámbito, el dumbbell (la brecha en cada lugar); por tipo, barras
        // agrupadas: cuatro tipos y dos grupos, comparados par por par.
        [forma === "agrupadas" ? barrasAgrupadas(f, {comparacion: "indigena", filas: "indicador", faceta: sep ? "faceta" : null, width: Math.min(1320, width), etiquetaFilas: "Tipo de violencia"})
        : dumbbell(f.map((r) => ({...r, fila: r.indicador, valor: r.pct})), {ancho: Math.min(1320, width), series, colores: series.map((s) => COLOR_SERIE[s]), dominio: [0, maxX], orden: cats,
          fx: sep ? "faceta" : null, fxDominio: Object.values(EDAD_ETIQ), etiquetaX: "% de las mujeres del grupo",
          renglones: [["Ámbito o tipo", (r) => (r.faceta ? `${r.indicador}, ${r.faceta}` : r.indicador)], ["Grupo", (r) => r.serie], ["Porcentaje", (r) => pct(r.pct)], ["Mujeres", (r) => entero(r.num)]]})]),
      faltaFamiliar ? html`<p class="beta-nota">La violencia familiar solo se pregunta para los últimos 12 meses; elige ese periodo para verla.</p>` : "",
      cGeo.value === "Ciudad de México" ? html`<p class="beta-nota">En la Ciudad de México la muestra de mujeres indígenas es chica: la línea de color en cada punto es su intervalo de 95 %, y cuando los dos intervalos se tocan la diferencia no es distinguible.</p>` : "",
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

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-5"><svg class="motivo motivo-personas" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><g class="a-esc f0"><circle cx="157" cy="89.5" r="10.5" fill="#55554f"/><path d="M139,133.2 V116.1 a18.1,14.3 0 0 1 36.1,0 V133.2 z" fill="#55554f"/></g><g class="a-esc f1"><circle cx="215" cy="89.5" r="10.5" fill="#8a8a86"/><path d="M197,133.2 V116.1 a18.1,14.3 0 0 1 36.1,0 V133.2 z" fill="#8a8a86"/></g><g class="a-esc f1"><circle cx="273" cy="89.5" r="10.5" fill="#3a3a37"/><path d="M255,133.2 V116.1 a18.1,14.3 0 0 1 36.1,0 V133.2 z" fill="#3a3a37"/></g><g class="a-esc f2"><circle cx="128" cy="153.5" r="10.5" fill="#55554f"/><path d="M110,197.2 V180.1 a18.1,14.3 0 0 1 36.1,0 V197.2 z" fill="#55554f"/></g><g class="a-esc f2"><circle cx="186" cy="153.5" r="10.5" fill="#8a8a86"/><path d="M168,197.2 V180.1 a18.1,14.3 0 0 1 36.1,0 V197.2 z" fill="#8a8a86"/></g><g class="a-esc f3"><circle cx="244" cy="153.5" r="10.5" fill="#3a3a37"/><path d="M226,197.2 V180.1 a18.1,14.3 0 0 1 36.1,0 V197.2 z" fill="#3a3a37"/></g><g class="a-esc f3"><circle cx="302" cy="153.5" r="10.5" fill="#55554f"/><path d="M284,197.2 V180.1 a18.1,14.3 0 0 1 36.1,0 V197.2 z" fill="#55554f"/></g><g class="a-esc f4"><circle cx="99" cy="217.5" r="10.5" fill="#8a8a86"/><path d="M81,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#8a8a86"/></g><g class="a-esc f4"><circle cx="157" cy="217.5" r="10.5" fill="#3a3a37"/><path d="M139,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#3a3a37"/></g><g class="a-esc f5"><circle cx="215" cy="217.5" r="10.5" fill="#55554f"/><path d="M197,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#55554f"/></g><g class="a-esc f5"><circle cx="273" cy="217.5" r="10.5" fill="#8a8a86"/><path d="M255,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#8a8a86"/></g><g class="a-esc f6"><circle cx="331" cy="217.5" r="10.5" fill="#3a3a37"/><path d="M313,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#3a3a37"/></g><g class="a-esc f6"><circle cx="128" cy="281.5" r="10.5" fill="#55554f"/><path d="M110,325.2 V308.1 a18.1,14.3 0 0 1 36.1,0 V325.2 z" fill="#55554f"/></g><g class="a-esc f7"><circle cx="186" cy="281.5" r="10.5" fill="#8a8a86"/><path d="M168,325.2 V308.1 a18.1,14.3 0 0 1 36.1,0 V325.2 z" fill="#8a8a86"/></g><g class="a-esc f7"><circle cx="244" cy="281.5" r="10.5" fill="#3a3a37"/><path d="M226,325.2 V308.1 a18.1,14.3 0 0 1 36.1,0 V325.2 z" fill="#3a3a37"/></g><g class="a-esc f8"><circle cx="302" cy="281.5" r="10.5" fill="#55554f"/><path d="M284,325.2 V308.1 a18.1,14.3 0 0 1 36.1,0 V325.2 z" fill="#55554f"/></g><g class="a-sep f0"><circle cx="340" cy="217.5" r="10.5" fill="#e8474f"/><path d="M322,261.2 V244.1 a18.1,14.3 0 0 1 36.1,0 V261.2 z" fill="#e8474f"/></g></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 5 · Lo que enfrentan · 2 de 3</p>
  <h1>Violencia contra las mujeres indígenas</h1>
  <p class="portada-capitulo-dek">La ENDIREH pregunta a las mujeres por situaciones concretas de violencia.</p>
  </div>
</header>

<p class="entrada-capitulo">Permite comparar a las mujeres indígenas con el resto, en el país y en la Ciudad de México.</p>

```js
display(kpis([
  {etiqueta: "Mujeres hablantes con violencia a lo largo de la vida", cifra: pct(pr(fila("Nacional", "lengua", "Indígena", "Cualquier ámbito", "vida"))), nota: `no hablantes: ${pct(pr(fila("Nacional", "lengua", "Resto", "Cualquier ámbito", "vida")))}; país, 2021`},
  {etiqueta: "Mujeres hablantes con violencia de pareja", cifra: pct(pr(fila("Nacional", "lengua", "Indígena", "Pareja", "vida"))), nota: `no hablantes: ${pct(pr(fila("Nacional", "lengua", "Resto", "Pareja", "vida")))}; entre mujeres con pareja alguna vez`},
  {etiqueta: "Mujeres que se consideran indígenas, Ciudad de México", cifra: pct(pr(fila("Ciudad de México", "autoads", "Indígena", "Cualquier ámbito", "vida"))), nota: `resto: ${pct(pr(fila("Ciudad de México", "autoads", "Resto", "Cualquier ámbito", "vida")))}; a lo largo de la vida`},
]));
const vidaH = pr(fila("Nacional", "lengua", "Indígena", "Cualquier ámbito", "vida")), vidaR = pr(fila("Nacional", "lengua", "Resto", "Cualquier ámbito", "vida"));
display(figura({titulo: "De cada 100 mujeres, cuántas han vivido violencia a lo largo de su vida", subtitulo: "Mujeres de 15 años y más, todo el país, 2021",
  pie: "INEGI, ENDIREH 2021 · cada cuadro es una de cada 100 mujeres del grupo; en color, las que han vivido al menos un acto de violencia"},
  [waffle([{grupo: "Hablan una lengua indígena", valor: vidaH, color: COLOR_SERIE["Población indígena"]}, {grupo: "No hablan una lengua indígena", valor: vidaR, color: COLOR_SERIE["Resto de la población"]}],
    {ancho: Math.min(760, width), colorDe: (d) => d.color})]));
```

---

<h2 id="por-ambito" class="toc-anchor">Dónde ocurre: por ámbito</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">01</span> Dónde ocurre: por ámbito</span>
  <p class="seccion-entrada">El ámbito dice dónde ocurre la violencia: en la pareja, la familia, la escuela, el trabajo o la comunidad. Cada uno pide respuestas distintas.</p>
</header>

```js
display(seccionEndireh({id: "c8a", indicadores: ["Cualquier ámbito", "Pareja", "Familiar", "Escolar", "Laboral", "Comunitario"],
  titulo: "Mujeres que han vivido violencia, por ámbito",
  pie: "INEGI, ENDIREH 2021, mujeres de 15 años y más · cada par de puntos es un ámbito; la línea gris, la brecha entre los dos grupos",
  explica: "La ENDIREH pregunta a cada mujer por situaciones concretas de violencia en cinco ámbitos. Cada ámbito tiene su propio universo: la violencia de pareja se calcula entre mujeres que han tenido pareja; la escolar, entre quienes asistieron a la escuela; la laboral, entre quienes han trabajado; la familiar (solo últimos 12 meses) y la comunitaria, entre todas. La condición indígena la responde quien informa sobre el hogar: si la mujer habla una lengua indígena o si se considera indígena (sí o en parte). Menos violencia declarada no significa necesariamente menos violencia: también influyen el acceso a la encuesta y lo que cada mujer identifica como violencia."}));
```

---

<h2 id="por-tipo" class="toc-anchor">De qué tipo</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">02</span> De qué tipo</span>
  <p class="seccion-entrada">El tipo dice cómo es la violencia: psicológica, física, sexual o económica. Una misma mujer puede haber vivido varios.</p>
</header>

```js
display(seccionEndireh({id: "c8b", forma: "agrupadas", fuentes: {referencia: ["R-ENDIREH-2021-TAB"], nota: "Se cotejan las prevalencias totales de la encuesta; la prevalencia de cada tipo no tiene todavía un cotejo propio y se puede consultar en los tabulados del INEGI."}, indicadores: ["Psicológica", "Física", "Sexual", "Económica o patrimonial"],
  titulo: "Mujeres que han vivido violencia, por tipo",
  pie: "INEGI, ENDIREH 2021, mujeres de 15 años y más · cada par de barras es un tipo de violencia, en cualquier ámbito",
  explica: "Los tipos agrupan las situaciones que la encuesta pregunta en todos los ámbitos: psicológica (insultos, humillaciones, amenazas), física (golpes, empujones, agresiones con armas), sexual (acoso, abuso, violación) y económica o patrimonial (control del dinero, despojo de bienes). Una mujer puede haber vivido varios tipos."}));
```

<div class="relato-cierre">
  <p>Frente a la discriminación y la violencia hay un marco de derechos. Con él cierra el recorrido.</p>
  <a class="book-cta book-cta-primary" href="./derechos">Sigue: Derechos y política cultural</a>
</div>
