// src/components/graficas.js
// Librería de gráficas del tablero. Todas las especificaciones de Observable
// Plot viven aquí; las páginas no llaman a Plot directamente.
//
// Tres reglas transversales (las del Observatorio PISA):
//   1. Toda gráfica lleva tooltip, y con dos series siempre hay leyenda.
//   2. El destacado se marca con trazo y opacidad, nunca cambiando el color
//      de la entidad.
//   3. Las celdas con muestra insuficiente se dibujan, pero marcadas (trama y
//      asterisco): ocultarlas deja huecos que se leen como ceros.
//
// Las formas responden a la pregunta de cada vista: el dumbbell lee la
// brecha (longitud del segmento) y el nivel (posición) a la vez; la
// pendiente responde "quién subió"; el mapa dónde; y las barras quedan para
// la cifra suelta con su intervalo.

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import {html} from "npm:htl";
import {
  ROJO, GRIS, FONDO, RAMPA, SECUENCIAL, TIPO, ESTILO_EJES, ORDEN_EDAD,
  punto, diferencia, anio as fmtAnio, formatear, poblacionCorta, animar,
} from "./base.js";
import {COMPARACION_POR_CLAVE, escalaColor} from "./grupos.js";
import {MIN_CASOS} from "./agregar.js";
import {DIMENSIONES} from "./filtros.js";

// --- Trama de muestra insuficiente ------------------------------------------
const ID_TRAMA = "trama-fragil";
function asegurarTrama() {
  if (typeof document === "undefined" || document.getElementById(ID_TRAMA)) return;
  document.body.appendChild(html`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="${ID_TRAMA}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="currentColor" opacity="0.25"></rect>
      <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="3"></line>
    </pattern></defs></svg>`);
}

function etiquetaMedida(formato) {
  if (formato === "pesos") return "Ingreso";
  if (formato === "horas") return "Horas";
  if (formato === "conteo") return "Personas";
  return "Porcentaje";
}

function ejeValor(formato, {label = null} = {}) {
  if (formato === "pesos") return {label: label ?? "pesos", grid: true, tickFormat: (d) => "$" + punto(d)};
  if (formato === "conteo") return {label: label ?? "personas", grid: true, tickFormat: (d) => punto(d)};
  return {label: label ?? "%", grid: true, tickFormat: (d) => `${d} %`};
}

// Etiqueta legible del valor de una dimensión (los rangos de edad llevan
// "años"; lo demás va tal cual).
function rotulo(dim, v) {
  if (dim === "rango_edad") return `${v} años`;
  if (dim === "decil") return `Decil ${v}`;
  return String(v);
}

function canalIntervalo(formato) {
  if (formato === "conteo") return {};
  return {"Intervalo 95 %": (d) => d.ic ? `${formatear(d.ic.lo, formato)} a ${formatear(d.ic.hi, formato)}` : "sin estimar"};
}

// `num`, no `den`: quienes cumplen la condición, ya expandidos. La tabla de
// respaldo trae el detalle completo; el tooltip se queda corto a propósito.
function canalPoblacion(formato) {
  return formato === "pct" ? {"Población": (d) => poblacionCorta(d.num)} : {};
}

// --- Piezas de página -------------------------------------------------------
export function figura({titulo = "", subtitulo = "", pie = ""}, hijos = []) {
  return html`<figure class="grafica-tablero">
    ${titulo ? html`<h3>${titulo}</h3>` : ""}
    ${subtitulo ? html`<p class="grafica-sub">${subtitulo}</p>` : ""}
    ${hijos}
    ${pie ? html`<figcaption>${pie}</figcaption>` : ""}
  </figure>`;
}

// Cabecera de sección. El título es EL MISMO texto que el ancla del índice.
export function seccion({numero, titulo, entrada}) {
  return html`<header class="seccion-cabeza">
    <span class="kicker"><span class="kicker-num">${numero}</span> ${titulo}</span>
    ${entrada ? html`<p class="seccion-entrada">${entrada}</p>` : ""}
  </header>`;
}

export function kpis(tarjetas) {
  return html`<div class="kpi-fila">
    ${tarjetas.map((t, i) => html`<div class="kpi-tarjeta ${i === 0 ? "kpi-destacado" : ""}">
      <span class="kpi-etiqueta">${t.etiqueta}</span>
      <span class="kpi-cifra">${t.cifra}</span>
      ${t.nota ? html`<span class="kpi-nota" title="${t.nota}">${t.nota}</span>` : ""}
    </div>`)}
  </div>`;
}

export function explicacion(texto) {
  const partes = (Array.isArray(texto) ? texto : [texto]).filter(Boolean)
    .map((t) => String(t).replace(/\s+/g, " ").trim());
  if (!partes.length) return document.createDocumentFragment();
  return html`<details class="explica-analisis">
    <summary>¿Qué quiere decir este análisis?</summary>
    ${partes.map((t) => html`<p>${t}</p>`)}
  </details>`;
}

export function avisoMuestra(filas, {umbral = MIN_CASOS} = {}) {
  const fragiles = filas.filter((f) => f.fragil);
  if (!fragiles.length) return document.createDocumentFragment();
  const minimo = Math.min(...fragiles.map((f) => f.casos));
  return html`<p class="aviso-muestra" role="note">
    <strong>Muestra insuficiente.</strong>
    ${fragiles.length === 1 ? "Una de las cifras" : `${fragiles.length} de las cifras`} se calculó con menos
    de ${umbral} casos (la menor, con ${minimo}) y lleva asterisco: sirve para ver el orden de magnitud,
    no para comparar diferencias chicas.
  </p>`;
}

// Tabla de respaldo: el relevo de accesibilidad para el color, con los casos
// de muestra sin expandir que el tooltip no trae.
// `intervalo: false` y `etiquetaCasos` son para datos CENSALES: ahí no hay error
// de muestreo que publicar y los "casos" son unidades territoriales, no entrevistas.
export function tablaDatos(filas, {dims = [], formato = "pct", titulo = "Ver los datos",
    intervalo = true, etiquetaCasos = "Casos en muestra", etiquetaNum = "Pob. cumple", etiquetaDen = "Pob. total"} = {}) {
  if (!filas.length) return document.createDocumentFragment();
  const lista = dims.filter(Boolean);
  return html`<details class="tabla-datos">
    <summary>${titulo} (${punto(filas.length)} filas)</summary>
    <div class="tabla-scroll"><table>
      <thead><tr>
        ${lista.map((d) => html`<th>${DIMENSIONES[d]?.etiqueta ?? d}</th>`)}
        <th>Grupo</th><th>${etiquetaMedida(formato)}</th>
        ${formato === "conteo" || !intervalo ? "" : html`<th>Intervalo 95 %</th>`}
        ${formato === "pct" ? html`<th>${etiquetaNum}</th>` : ""}
        <th>${etiquetaDen}</th><th>${etiquetaCasos}</th>
      </tr></thead>
      <tbody>${filas.map((f) => html`<tr>
        ${lista.map((d) => html`<td>${rotulo(d, f[d])}</td>`)}
        <td>${f.serie ?? ""}</td>
        <td class="num">${formatear(f.pct, formato)}${f.fragil ? " *" : ""}</td>
        ${formato === "conteo" || !intervalo ? "" : html`<td class="num">${f.ic ? `${formatear(f.ic.lo, formato)} a ${formatear(f.ic.hi, formato)}` : "sin estimar"}</td>`}
        ${formato === "pct" ? html`<td class="num">${punto(f.num)}</td>` : ""}
        <td class="num">${punto(f.den)}</td>
        <td class="num">${punto(f.casos)}</td>
      </tr>`)}</tbody>
    </table></div>
  </details>`;
}

// --- Barras comparadas ------------------------------------------------------
// Una barra por serie, con su intervalo. Es la forma para la cifra suelta: sin
// ningún desglose, dos barras con bigote dicen el nivel y si la diferencia
// supera el error.
export function barrasComparadas(datos, {comparacion, formato = "pct", width = 640} = {}) {
  asegurarTrama();
  const color = escalaColor(comparacion);
  const canales = {
    "Grupo": (d) => d.serie,
    [etiquetaMedida(formato)]: (d) => formatear(d.pct, formato),
    ...canalIntervalo(formato),
    ...canalPoblacion(formato),
  };
  const maxV = Math.max(...datos.map((d) => d.ic?.hi ?? d.pct ?? 0), 0);
  const techo = formato === "pct" ? Math.min(maxV * 1.15, 100) : maxV * 1.15;
  return animar(Plot.plot({
    style: ESTILO_EJES,
    width: Math.min(width, 560), height: 300,
    marginLeft: 58, marginRight: 12, marginTop: 10, marginBottom: 46,
    x: {label: null, domain: color.domain},
    y: {...ejeValor(formato), domain: [0, techo || 1]},
    color,
    marks: [
      Plot.ruleY([0], {stroke: GRIS.regla}),
      Plot.barY(datos, {x: "serie", y: "pct", fill: "serie", insetLeft: 6, insetRight: 6, fillOpacity: 0.9,
        rx2: 4, channels: canales, tip: {channels: canales, format: {x: false, y: false, fill: false}}}),
      Plot.barY(datos.filter((d) => d.fragil), {x: "serie", y: "pct", fill: `url(#${ID_TRAMA})`, insetLeft: 6, insetRight: 6}),
      Plot.ruleX(datos.filter((d) => d.ic), {x: "serie", y1: (d) => d.ic.lo, y2: (d) => d.ic.hi,
        stroke: GRIS.tinta, strokeWidth: 1.4, strokeOpacity: 0.75}),
      Plot.text(datos, {x: "serie", y: "pct", text: (d) => formatear(d.pct, formato) + (d.fragil ? " *" : ""),
        dy: -9, fontSize: TIPO.valor, fontWeight: 600, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.barY(datos, Plot.pointerX({x: "serie", y: "pct", fill: "none", stroke: GRIS.tinta, strokeWidth: 1.8,
        insetLeft: 6, insetRight: 6, pointerEvents: "none", maxRadius: Infinity})),
    ],
  }));
}

// --- Dumbbell: dos valores por fila unidos por un segmento ------------------
// La forma principal del tablero. Cada fila es una categoría de la dimensión
// desplegada (entidad, edad, tamaño de localidad, decil, escolaridad, sexo o
// motivo) y los dos puntos son las series de la comparación; la LONGITUD del
// segmento es la brecha y la POSICIÓN, el nivel. Cuando las filas son
// entidades se ordenan por la brecha (el orden es el hallazgo); cuando son
// ordinales conservan su orden natural.
export function dumbbell(datos, {comparacion, filas = "entidad", faceta = null, formato = "pct",
    width = 1120, referencia = null, ordenarPorBrecha = null, alturaFila = null, etiquetaFilas = null,
    intervalo = true, etiquetaPoblacion = "Población"} = {}) {
  asegurarTrama();
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const [serieA, serieB] = comp?.series ?? [];
  const color = escalaColor(comparacion);
  const dimFila = etiquetaFilas ? {...(DIMENSIONES[filas] ?? {}), etiqueta: etiquetaFilas} : DIMENSIONES[filas];
  const dimFaceta = faceta ? DIMENSIONES[faceta] : null;

  // Una fila por (categoría, faceta) con los dos valores lado a lado.
  const porFila = new Map();
  for (const d of datos) {
    const k = `${d[filas]}||${faceta ? d[faceta] : ""}`;
    if (!porFila.has(k)) porFila.set(k, {fila: d[filas], faceta: faceta ? d[faceta] : null});
    const r = porFila.get(k);
    if (d.serie === serieA) r.a = d; else if (d.serie === serieB) r.b = d;
  }
  const pares = [...porFila.values()].filter((r) => r.a || r.b).map((r) => ({
    ...r,
    va: r.a?.pct ?? null, vb: r.b?.pct ?? null,
    brecha: (r.a?.pct != null && r.b?.pct != null) ? r.a.pct - r.b.pct : null,
    fragil: Boolean(r.a?.fragil || r.b?.fragil),
  }));
  if (!pares.length) return document.createDocumentFragment();

  // Orden de filas: por brecha (entidades, motivos) o por el orden ordinal de
  // la dimensión. En una vista con facetas el orden es UNO para todas, fijado
  // por la faceta más reciente/última, para poder seguir la misma fila.
  const porBrecha = ordenarPorBrecha ?? !dimFila?.orden;
  let ordenFilas;
  if (porBrecha) {
    const ult = new Map();
    for (const p of pares) {
      const prev = ult.get(p.fila);
      if (!prev || String(p.faceta) >= String(prev.faceta)) ult.set(p.fila, p);
    }
    ordenFilas = [...ult.values()].sort((x, y) => d3.ascending(x.brecha ?? Infinity, y.brecha ?? Infinity)).map((p) => p.fila);
  } else {
    const presentes = new Set(pares.map((p) => String(p.fila)));
    ordenFilas = dimFila.orden.filter((v) => presentes.has(v));
  }
  const ordenFacetas = dimFaceta?.orden
    ? dimFaceta.orden.filter((v) => pares.some((p) => String(p.faceta) === v))
    : [...new Set(pares.map((p) => String(p.faceta)))].sort();

  const puntos = pares.flatMap((p) => [
    ...(p.a ? [{...p.a, fila: p.fila, faceta: p.faceta, grupo: serieA, valor: p.va, brecha: p.brecha}] : []),
    ...(p.b ? [{...p.b, fila: p.fila, faceta: p.faceta, grupo: serieB, valor: p.vb, brecha: p.brecha}] : []),
  ]);
  const canales = {
    [dimFila?.etiqueta ?? "Fila"]: (d) => rotulo(filas, d.fila),
    ...(faceta ? {[dimFaceta?.etiqueta ?? "Panel"]: (d) => rotulo(faceta, d.faceta)} : {}),
    "Grupo": (d) => d.grupo,
    [etiquetaMedida(formato)]: (d) => formatear(d.valor, formato) + (d.fragil ? " *" : ""),
    ...(intervalo ? canalIntervalo(formato) : {}),
    ...(formato === "pct" ? {[etiquetaPoblacion]: (d) => poblacionCorta(d.num)} : {}),
    "Brecha": (d) => d.brecha == null ? "s/d" : `${diferencia(d.brecha, 1)} pp`,
  };
  const fx = faceta ? {fx: (d) => String(d.faceta)} : {};
  const nFilas = ordenFilas.length;
  const alto = alturaFila ?? (nFilas > 12 ? 19 : 34);
  const maxV = Math.max(...puntos.map((d) => d.valor ?? 0), referencia?.a ?? 0, referencia?.b ?? 0, 1);

  const fig = Plot.plot({
    style: ESTILO_EJES,
    width,
    height: nFilas * alto + 96,
    marginLeft: filas === "entidad" ? 150 : filas === "indicador" ? 250 : 130,
    marginRight: 44, marginTop: 44, marginBottom: 36,
    x: {...ejeValor(formato), axis: "top", domain: [0, formato === "pct" ? Math.min(100, Math.ceil(maxV / 10) * 10) : maxV * 1.1]},
    y: {domain: ordenFilas.map(String), label: null, tickSize: 0, tickFormat: (v) => rotulo(filas, v)},
    ...(faceta ? {fx: {domain: ordenFacetas, label: null, tickFormat: (v) => rotulo(faceta, v)}} : {}),
    color,
    marks: [
      // Referencia nacional: una línea punteada por serie, con su rótulo.
      ...(referencia ? [
        Plot.ruleX([referencia.a, referencia.b].filter((v) => v != null), {stroke: GRIS.tinta, strokeWidth: 1.2, strokeDasharray: "5 3", strokeOpacity: 0.7}),
        Plot.text([{x: referencia.a, t: `${serieA}: ${formatear(referencia.a, formato)} (nacional)`},
                   {x: referencia.b, t: `${serieB}: ${formatear(referencia.b, formato)} (nacional)`}].filter((d) => d.x != null), {
          x: "x", frameAnchor: "bottom", dy: 14, text: "t", fontSize: TIPO.etiqueta - 0.5, fill: GRIS.trazo,
          textAnchor: (d) => d.x > maxV * 0.6 ? "end" : "start", stroke: FONDO, strokeWidth: 3,
        }),
      ] : []),
      Plot.link(pares.filter((p) => p.va != null && p.vb != null), {
        ...fx, y: (d) => String(d.fila), x1: "va", x2: "vb",
        stroke: GRIS.fondo, strokeWidth: 3.2, strokeLinecap: "round",
      }),
      Plot.dot(puntos, {
        ...fx, y: (d) => String(d.fila), x: "valor", fill: "grupo", r: nFilas > 12 ? 4.2 : 5.5,
        stroke: FONDO, strokeWidth: 0.8,
        channels: canales,
        tip: {channels: canales, format: {x: false, y: false, fill: false, fx: false}},
      }),
      // Las frágiles llevan la trama encima del punto.
      Plot.dot(puntos.filter((d) => d.fragil), {
        ...fx, y: (d) => String(d.fila), x: "valor", r: nFilas > 12 ? 4.2 : 5.5, fill: `url(#${ID_TRAMA})`,
      }),
      // Con pocas filas cabe la cifra junto a cada punto; con muchas queda
      // en el tooltip y en la tabla.
      ...(nFilas <= 12 && !faceta ? [
        Plot.text(puntos, {
          ...fx, y: (d) => String(d.fila), x: "valor", text: (d) => formatear(d.valor, formato) + (d.fragil ? "*" : ""),
          dy: -11, fontSize: TIPO.etiqueta, fill: "currentColor", stroke: FONDO, strokeWidth: 3,
        }),
      ] : []),
      // Contorno bajo el puntero por FILA (eje categórico), nunca por
      // distancia al punto.
      Plot.dot(puntos, Plot.pointerY({
        ...fx, y: (d) => String(d.fila), x: "valor", r: nFilas > 12 ? 6 : 8, fill: "none",
        stroke: GRIS.tinta, strokeWidth: 1.6, pointerEvents: "none", maxRadius: Infinity,
      })),
    ],
  });
  return animar(fig);
}

// --- Puntos por banda: un valor por categoría ordenada ----------------------
// Para el cruce entre territorios: las manzanas (o las AGEB) se agrupan por su
// proporción de población en hogares indígenas y cada banda es una fila con UN
// valor, el del indicador elegido. No es un dumbbell porque no hay dos series:
// lo que se compara es la misma cifra a lo largo de las bandas, contra la
// referencia de toda la ciudad. El tallo va de la referencia al punto, así que
// su longitud es la distancia a la ciudad y su lado, el signo.
export function puntosPorBanda(filas, {formatoValor = (v) => formatear(v, "pct"), etiquetaX = "%",
    referencia = null, etiquetaReferencia = "Toda la ciudad", etiquetaNum = "Viviendas",
    etiquetaUnidades = "Manzanas", width = 900} = {}) {
  const datos = filas.filter((d) => Number.isFinite(d.valor));
  if (!datos.length) return document.createDocumentFragment();
  const orden = datos.slice().sort((a, b) => a.orden - b.orden).map((d) => d.banda);
  const canales = {
    "Presencia indígena": (d) => d.banda,
    "Valor": (d) => formatoValor(d.valor),
    [etiquetaNum]: (d) => punto(d.num),
    [etiquetaUnidades]: (d) => punto(d.unidades),
    "Población": (d) => poblacionCorta(d.poblacion),
  };
  const valores = [...datos.map((d) => d.valor), ...(referencia == null ? [] : [referencia])];
  const lo = Math.min(...valores), hi = Math.max(...valores);
  const aire = (hi - lo || 1) * 0.18;
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width: Math.min(width, 980), height: orden.length * 40 + 96,
    marginLeft: 250, marginRight: 70, marginTop: 44, marginBottom: 30,
    x: {label: etiquetaX, axis: "top", grid: true, domain: [Math.max(0, lo - aire), hi + aire]},
    y: {domain: orden, label: null, tickSize: 0},
    marks: [
      ...(referencia == null ? [] : [
        Plot.ruleX([referencia], {stroke: GRIS.tinta, strokeWidth: 1.2, strokeDasharray: "5 3", strokeOpacity: 0.75}),
        Plot.text([referencia], {x: (d) => d, frameAnchor: "bottom", dy: 14, text: () => `${etiquetaReferencia}: ${formatoValor(referencia)}`,
          fontSize: TIPO.etiqueta, fill: GRIS.trazo, stroke: FONDO, strokeWidth: 3}),
        Plot.link(datos, {y: "banda", x1: () => referencia, x2: "valor", stroke: GRIS.fondo, strokeWidth: 3.2, strokeLinecap: "round"}),
      ]),
      Plot.dot(datos, {y: "banda", x: "valor", r: 6, fill: ROJO, stroke: FONDO, strokeWidth: 1,
        channels: canales, tip: {channels: canales, format: {x: false, y: false}}}),
      Plot.text(datos, {y: "banda", x: "valor", text: (d) => formatoValor(d.valor) + (d.fragil ? " *" : ""), dy: -13,
        fontSize: TIPO.etiqueta, fontWeight: 600, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.dot(datos, Plot.pointerY({y: "banda", x: "valor", r: 9, fill: "none", stroke: GRIS.tinta,
        strokeWidth: 1.6, pointerEvents: "none", maxRadius: Infinity})),
    ],
  });
  return animar(fig);
}

// Tabla de respaldo de columnas libres, para las vistas que no siguen el
// esquema num/den/casos de las encuestas.
export function tablaColumnas(filas, columnas, {titulo = "Ver los datos"} = {}) {
  if (!filas.length) return document.createDocumentFragment();
  return html`<details class="tabla-datos">
    <summary>${titulo} (${punto(filas.length)} filas)</summary>
    <div class="tabla-scroll"><table>
      <thead><tr>${columnas.map((c) => html`<th>${c.etiqueta}</th>`)}</tr></thead>
      <tbody>${filas.map((f) => html`<tr>${columnas.map((c) =>
        html`<td class="${c.num ? "num" : ""}">${c.valor(f)}</td>`)}</tr>`)}</tbody>
    </table></div>
  </details>`;
}

// --- Pendiente: la serie de cada grupo a través de las ediciones -----------
// Responde "quién subió y cuánto se cerró (o abrió) la brecha". Una línea por
// serie, con la banda del intervalo detrás y la cifra en los extremos.
export function pendiente(datos, {comparacion, formato = "pct", width = 900} = {}) {
  const color = escalaColor(comparacion);
  const anios = [...new Set(datos.map((d) => String(d.anio)))].sort();
  if (anios.length < 2) return barrasComparadas(datos, {comparacion, formato, width});
  const ultimo = anios.at(-1), primero = anios[0];
  const canales = {
    "Grupo": (d) => d.serie,
    "Edición": (d) => fmtAnio(d.anio),
    [etiquetaMedida(formato)]: (d) => formatear(d.pct, formato) + (d.fragil ? " *" : ""),
    ...canalIntervalo(formato),
    ...canalPoblacion(formato),
  };
  const conIc = datos.filter((d) => d.ic);
  const maxV = Math.max(...datos.map((d) => d.ic?.hi ?? d.pct ?? 0), 1);
  const minV = Math.min(...datos.map((d) => d.ic?.lo ?? d.pct ?? 0), maxV);
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width, height: 420,
    marginLeft: 60, marginRight: 150, marginTop: 24, marginBottom: 46,
    x: {domain: anios, type: "point", label: "Edición", padding: 0.25, tickFormat: fmtAnio},
    y: {...ejeValor(formato), domain: [Math.max(0, minV - 5), formato === "pct" ? Math.min(100, maxV + 5) : maxV * 1.05]},
    color,
    marks: [
      Plot.areaY(conIc, {x: (d) => String(d.anio), y1: (d) => d.ic.lo, y2: (d) => d.ic.hi, z: "serie",
        fill: "serie", fillOpacity: 0.12, curve: "monotone-x"}),
      Plot.line(datos, {x: (d) => String(d.anio), y: "pct", z: "serie", stroke: "serie", strokeWidth: 2.6, curve: "monotone-x"}),
      Plot.dot(datos, {x: (d) => String(d.anio), y: "pct", fill: "serie", r: 5, stroke: FONDO, strokeWidth: 1,
        channels: canales, tip: {channels: canales, format: {x: false, y: false, fill: false}}}),
      Plot.text(datos.filter((d) => String(d.anio) === primero), {x: (d) => String(d.anio), y: "pct",
        text: (d) => formatear(d.pct, formato), textAnchor: "end", dx: -10, fontSize: TIPO.etiqueta, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.text(datos.filter((d) => String(d.anio) === ultimo), {x: (d) => String(d.anio), y: "pct",
        text: (d) => `${d.serie}: ${formatear(d.pct, formato)}`, textAnchor: "start", dx: 10,
        fontSize: TIPO.etiqueta, fontWeight: 600, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
    ],
  });
  return animar(fig);
}

// --- Mapas: nivel por serie y brecha entre ambas ----------------------------
// El geojson identifica cada entidad con un código ISO en properties.id.
export const ISO_A_ENTIDAD = {
  "MX-AGU": "Aguascalientes", "MX-BCN": "Baja California", "MX-BCS": "Baja California Sur",
  "MX-CAM": "Campeche", "MX-COA": "Coahuila", "MX-COL": "Colima", "MX-CHP": "Chiapas",
  "MX-CHH": "Chihuahua", "MX-CMX": "Ciudad de México", "MX-DUR": "Durango", "MX-GUA": "Guanajuato",
  "MX-GRO": "Guerrero", "MX-HID": "Hidalgo", "MX-JAL": "Jalisco", "MX-MEX": "México",
  "MX-MIC": "Michoacán", "MX-MOR": "Morelos", "MX-NAY": "Nayarit", "MX-NLE": "Nuevo León",
  "MX-OAX": "Oaxaca", "MX-PUE": "Puebla", "MX-QUE": "Querétaro", "MX-ROO": "Quintana Roo",
  "MX-SLP": "San Luis Potosí", "MX-SIN": "Sinaloa", "MX-SON": "Sonora", "MX-TAB": "Tabasco",
  "MX-TAM": "Tamaulipas", "MX-TLA": "Tlaxcala", "MX-VER": "Veracruz", "MX-YUC": "Yucatán",
  "MX-ZAC": "Zacatecas",
};

// Plot.plot con leyenda devuelve un <figure> con DOS <svg>; hay que buscar el
// que contiene los polígonos para ponerle la clase de hover.
function conHoverGeo(fig) {
  const svg = fig?.tagName === "svg" ? fig
    : [...(fig?.querySelectorAll?.("svg") ?? [])].find((s) => s.querySelector('g[aria-label="geo"]'));
  if (svg) svg.classList.add("mapa-hover");
  return fig;
}

function mapaBase(geo, valores, {formato, etiquetaValor, colorSpec, canalesExtra = {}, width, alto, titulo}) {
  const feats = geo.features.map((f) => {
    const nombre = ISO_A_ENTIDAD[f.properties.id] ?? f.properties.name;
    return {...f, properties: {...f.properties, nombre, valor: valores.get(nombre) ?? null}};
  });
  const canales = {
    "Entidad": (d) => d.properties.nombre,
    [etiquetaValor]: (d) => d.properties.valor == null ? "sin dato" : formatear(d.properties.valor, formato),
    ...canalesExtra,
  };
  return conHoverGeo(Plot.plot({
    style: ESTILO_EJES,
    width, height: alto,
    projection: {type: "mercator", domain: {type: "FeatureCollection", features: feats}},
    color: colorSpec,
    marks: [
      ...(titulo ? [Plot.text([titulo], {frameAnchor: "top-left", dx: 4, dy: 2, text: (d) => d, fontSize: TIPO.etiqueta + 1, fontWeight: 700, fill: "currentColor"})] : []),
      // Sin trazo entre polígonos: un trazo blanco antialiasea a gris. El
      // contorno aparece solo bajo el puntero (CSS .mapa-hover).
      Plot.geo(feats, {fill: (d) => d.properties.valor, stroke: "none", channels: canales,
        tip: {channels: canales, format: {fill: false}}}),
    ],
  }));
}

// Tres paneles: el nivel de cada serie con la misma rampa secuencial (dominio
// fijo de 0 a 100 para poder compararlos) y la brecha en puntos con la rampa
// divergente anclada en cero, donde el rojo es "la población indígena está
// por debajo".
export function mapasComparados(geo, series, {comparacion, formato = "pct", width = 1120} = {}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const [serieA, serieB] = comp.series;
  const valores = (s) => new Map(series.filter((d) => d.serie === s).map((d) => [d.entidad, d.pct]));
  const poblacion = (s) => new Map(series.filter((d) => d.serie === s).map((d) => [d.entidad, d.num]));
  const va = valores(serieA), vb = valores(serieB), pa = poblacion(serieA);
  const brecha = new Map([...va.entries()].filter(([e]) => vb.has(e)).map(([e, v]) => [e, v - vb.get(e)]));
  const maxAbs = Math.max(5, ...[...brecha.values()].map(Math.abs));
  // Tres paneles en una fila: el ancho de cada uno sale del ancho medido,
  // descontando los dos huecos de la rejilla; por debajo de 240 px la
  // rejilla los baja de fila sola.
  const ancho = Math.max(240, Math.floor((width - 20) / 3));
  const alto = Math.round(ancho * 0.72);
  const secuencial = {type: "linear", domain: [0, 100], interpolate: d3.interpolateRgbBasis(SECUENCIAL),
    legend: true, label: etiquetaMedida(formato) + " (escala fija 0 a 100)", ticks: [0, 25, 50, 75, 100], tickFormat: (d) => `${d} %`, unknown: GRIS.rejilla};
  const divergente = {type: "linear", domain: [-maxAbs, maxAbs], interpolate: d3.interpolateRgbBasis(RAMPA),
    legend: true, label: "Brecha en puntos porcentuales (primer grupo menos segundo)", tickFormat: (d) => diferencia(d), unknown: GRIS.rejilla};
  // Las leyendas van en su propia fila, fuera de los mapas: dentro del primer
  // panel lo empujaban hacia abajo y los tres mapas dejaban de alinearse.
  const estiloLeyenda = {fontSize: `${TIPO.etiqueta}px`};
  const leyendas = html`<div class="mapas-leyendas">
    ${Plot.legend({color: secuencial, width: 300, style: estiloLeyenda})}
    ${Plot.legend({color: divergente, width: 340, style: estiloLeyenda})}
  </div>`;
  secuencial.legend = false;
  divergente.legend = false;
  return html`<div class="mapas-comparados">${leyendas}<div class="mapas-rejilla" style="--mapa-min: ${ancho - 2}px">
    ${animar(mapaBase(geo, va, {formato, etiquetaValor: etiquetaMedida(formato), colorSpec: secuencial, width: ancho, alto, titulo: serieA,
      canalesExtra: {"Población": (d) => poblacionCorta(pa.get(d.properties.nombre))}}))}
    ${animar(mapaBase(geo, vb, {formato, etiquetaValor: etiquetaMedida(formato), colorSpec: {...secuencial, legend: false}, width: ancho, alto, titulo: serieB}))}
    ${animar(mapaBase(geo, brecha, {formato: "pp", etiquetaValor: "Brecha", colorSpec: divergente, width: ancho, alto, titulo: "Brecha",
      canalesExtra: {"Brecha": (d) => d.properties.valor == null ? "sin dato" : `${diferencia(d.properties.valor, 1)} pp`}}))}
  </div></div>`;
}

// Repinta las gráficas al cambiar de tema: los paneles vuelven a emitir
// `input`, que es lo que ya dispara el redibujo.
export {ROJO, ORDEN_EDAD};
