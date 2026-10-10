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
import {ROJO, GRIS, FONDO, RAMPA, SECUENCIAL, ORDINAL, MODO, tintaSobre, APILADAS_CLARO, APILADAS_OSCURO, TIPO, ESTILO_EJES, ORDEN_EDAD, punto, diferencia, anio as fmtAnio, formatear, poblacionCorta, animar, GLOBO} from "./base.js";
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
  if (dim === "estrato") return `Estrato ${String(v).toLowerCase()}`;
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

// Agrega el párrafo narrativo («por qué este análisis») a la cabecera que ya
// dibuja una sección armada por componente. El texto sale del guion
// (docs/guion-narrativo.md) y lo escribe scripts/aplicar_guion.py.
export function conEntrada(nodo, texto) {
  const cabeza = nodo?.querySelector?.(".seccion-cabeza");
  if (cabeza && texto && !cabeza.querySelector(".seccion-entrada")) cabeza.append(html`<p class="seccion-entrada">${texto}</p>`);
  return nodo;
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

// Claves de lectura junto a la gráfica: qué significa cada término de una
// aproximación (exacta, única, estimada, punto hueco...) en una línea, a la
// vista y sin tener que ir a la metodología. El detalle sigue en el
// desplegable de explicación. `items`: [{termino, texto, color?}].
export function claves(items, {titulo = "Cómo leer esta gráfica"} = {}) {
  return html`<div class="claves-lectura" role="note" aria-label="${titulo}">
    <span class="claves-titulo">${titulo}</span>
    <dl class="claves-lista">${items.map(({termino, texto, color}) => html`<div class="clave">
      <dt>${color ? html`<span class="clave-muestra" style="background:${color}" aria-hidden="true"></span>` : ""}${termino}</dt>
      <dd>${texto}</dd>
    </div>`)}</dl>
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
    intervalo = true, etiquetaCasos = "Casos en muestra", etiquetaNum = "Pob. cumple", etiquetaDen = "Pob. total", etiquetas = {}} = {}) {
  if (!filas.length) return document.createDocumentFragment();
  const lista = dims.filter(Boolean);
  return html`<details class="tabla-datos">
    <summary>${titulo} (${punto(filas.length)} filas)</summary>
    <div class="tabla-scroll"><table>
      <thead><tr>
        ${lista.map((d) => html`<th>${etiquetas[d] ?? DIMENSIONES[d]?.etiqueta ?? d}</th>`)}
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
    ...canalPoblacion(formato),
  };
  const maxV = Math.max(...datos.map((d) => d.ic?.hi ?? d.pct ?? 0), 0);
  // En porcentaje el eje es fijo (0 a 100): al cambiar un filtro la barra
  // cambia de largo y el fondo se queda quieto, así se compara entre filtros.
  const techo = formato === "pct" ? 100 : maxV * 1.15;
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
        rx2: 4, channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fill: false}}}),
      Plot.barY(datos.filter((d) => d.fragil), {x: "serie", y: "pct", fill: `url(#${ID_TRAMA})`, insetLeft: 6, insetRight: 6}),
      Plot.ruleX(datos.filter((d) => d.ic), {x: "serie", y1: (d) => d.ic.lo, y2: (d) => d.ic.hi,
        stroke: GRIS.tinta, strokeWidth: 1.4, strokeOpacity: 0.75}),
      Plot.text(datos, {x: "serie", y: "pct", text: (d) => formatear(d.pct, formato) + (d.fragil ? " *" : ""),
        dy: -9, fontSize: TIPO.valor, fontWeight: 600, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.barY(datos, Plot.pointerX({x: "serie", y: "pct", fill: "none", stroke: GRIS.tinta, strokeWidth: 1.8,
        insetLeft: 6, insetRight: 6, pointerEvents: "none", maxRadius: Infinity, ...GLOBO})),
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
    // Fila y panel en un solo renglón: el globo se queda en cuatro.
    [dimFila?.etiqueta ?? "Fila"]: (d) => (faceta ? `${rotulo(filas, d.fila)}, ${rotulo(faceta, d.faceta)}` : rotulo(filas, d.fila)),
    "Grupo": (d) => d.grupo,
    [etiquetaMedida(formato)]: (d) => formatear(d.valor, formato) + (d.fragil ? " *" : ""),
    ...(formato === "pct" ? {[etiquetaPoblacion]: (d) => poblacionCorta(d.num)} : {}),
  };
  const fx = faceta ? {fx: (d) => String(d.faceta)} : {};
  const nFilas = ordenFilas.length;
  const alto = alturaFila ?? (nFilas > 12 ? 19 : 34);
  const maxV = Math.max(...puntos.map((d) => d.valor ?? 0), referencia?.a ?? 0, referencia?.b ?? 0, 1);

  const fig = Plot.plot({
    style: ESTILO_EJES,
    width,
    height: nFilas * alto + 96,
    marginLeft: filas === "entidad" ? 150 : filas === "indicador" ? 320 : 130,
    marginRight: 44, marginTop: 44, marginBottom: 36,
    x: {...ejeValor(formato), axis: "top", domain: [0, formato === "pct" ? 100 : maxV * 1.1]},
    y: {domain: ordenFilas.map(String), label: null, tickSize: 0, tickFormat: (v) => rotulo(filas, v)},
    ...(faceta ? {fx: {domain: ordenFacetas, label: null, tickFormat: (v) => rotulo(faceta, v)}} : {}),
    color,
    marks: [
      // Referencia nacional: una línea punteada por serie. Su rótulo va fuera
      // del lienzo, en la nota de referencia.
      ...(referencia ? [
        Plot.ruleX([referencia.a, referencia.b].filter((v) => v != null), {stroke: GRIS.tinta, strokeWidth: 1.2, strokeDasharray: "5 3", strokeOpacity: 0.7}),
      ] : []),
      Plot.link(pares.filter((p) => p.va != null && p.vb != null), {
        ...fx, y: (d) => String(d.fila), x1: "va", x2: "vb",
        stroke: GRIS.fondo, strokeWidth: 3.2, strokeLinecap: "round",
      }),
      Plot.dot(puntos, {
        ...fx, y: (d) => String(d.fila), x: "valor", fill: "grupo", r: nFilas > 12 ? 4.2 : 5.5,
        stroke: FONDO, strokeWidth: 0.8,
        channels: canales,
        tip: {...GLOBO, channels: canales, format: {x: false, y: false, fill: false, fx: false}},
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
        stroke: GRIS.tinta, strokeWidth: 1.6, pointerEvents: "none", maxRadius: Infinity, ...GLOBO,
      })),
    ],
  });
  const ref = referencia ? [[serieA, referencia.a], [serieB, referencia.b]].filter(([, v]) => v != null) : [];
  return conNota(fig, ref.length
    ? notaReferencia(html`Líneas punteadas, valor nacional: ${ref.map(([n, v], k) =>
        html`${k ? " · " : ""}${n} <strong>${formatear(v, formato)}</strong>`)}`)
    : null);
}

// Las líneas punteadas de referencia se explican en un renglón propio, ENCIMA
// de la gráfica y fuera de ella. Dentro del lienzo el rótulo tapaba los ejes y
// los nombres de las filas, y no dejaba ver qué se estaba comparando.
function notaReferencia(partes) {
  return html`<p class="nota-referencia"><span class="nota-referencia-trazo" aria-hidden="true"></span>
    ${partes}</p>`;
}

// Coloca la nota dentro de la figura de Plot, después de la leyenda y antes
// del lienzo, para que se lea en el orden leyenda, referencia, gráfica.
function conNota(fig, nota) {
  if (!nota) return animar(fig);
  if (fig.tagName === "FIGURE") {
    const lienzo = [...fig.children].filter((c) => c.tagName?.toLowerCase() === "svg").at(-1);
    fig.insertBefore(nota, lienzo ?? null);
    return animar(fig);
  }
  const env = animar(fig);
  env.prepend(nota);
  return env;
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
    "Población": (d) => poblacionCorta(d.poblacion),
  };
  const valores = [...datos.map((d) => d.valor), ...(referencia == null ? [] : [referencia])];
  const lo = Math.min(...valores), hi = Math.max(...valores);
  const aire = (hi - lo || 1) * 0.18;
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width: Math.min(width, 1320), height: orden.length * 40 + 96,
    marginLeft: 250, marginRight: 70, marginTop: 44, marginBottom: 30,
    x: {label: etiquetaX, axis: "top", grid: true, domain: [Math.max(0, lo - aire), hi + aire]},
    y: {domain: orden, label: null, tickSize: 0},
    marks: [
      ...(referencia == null ? [] : [
        Plot.ruleX([referencia], {stroke: GRIS.tinta, strokeWidth: 1.2, strokeDasharray: "5 3", strokeOpacity: 0.75}),
        Plot.link(datos, {y: "banda", x1: () => referencia, x2: "valor", stroke: GRIS.fondo, strokeWidth: 3.2, strokeLinecap: "round"}),
      ]),
      Plot.dot(datos, {y: "banda", x: "valor", r: 6, fill: ROJO, stroke: FONDO, strokeWidth: 1,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false}}}),
      Plot.text(datos, {y: "banda", x: "valor", text: (d) => formatoValor(d.valor) + (d.fragil ? " *" : ""), dy: -13,
        fontSize: TIPO.etiqueta, fontWeight: 600, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.dot(datos, Plot.pointerY({y: "banda", x: "valor", r: 9, fill: "none", stroke: GRIS.tinta,
        strokeWidth: 1.6, pointerEvents: "none", maxRadius: Infinity, ...GLOBO})),
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
    y: {...ejeValor(formato), domain: formato === "pct" ? [0, 100] : [Math.max(0, minV - 5), maxV * 1.05]},
    color,
    marks: [
      Plot.areaY(conIc, {x: (d) => String(d.anio), y1: (d) => d.ic.lo, y2: (d) => d.ic.hi, z: "serie",
        fill: "serie", fillOpacity: 0.12, curve: "monotone-x"}),
      Plot.line(datos, {x: (d) => String(d.anio), y: "pct", z: "serie", stroke: "serie", strokeWidth: 2.6, curve: "monotone-x"}),
      Plot.dot(datos, {x: (d) => String(d.anio), y: "pct", fill: "serie", r: 5, stroke: FONDO, strokeWidth: 1,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fill: false}}}),
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
        tip: {...GLOBO, channels: canales, format: {fill: false}}}),
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
  // Escala de la brecha FIJA (lección 74): recalcularla con cada filtro hacía
  // que la misma brecha cambiara de tono. 40 puntos cubren el percentil 95 de
  // las brechas por entidad de las tres encuestas (39 puntos); lo que pase de
  // ahí se pinta con el tono del extremo.
  const maxAbs = 40;
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


// ============================================================================
// Formas para comparar VARIOS indicadores a la vez (secciones de bloque y de
// motivos de las páginas de encuesta). Reciben las series ya agregadas por
// prepararSeries con la dimensión "indicador" (y a lo más una dimensión de
// desglose) y siguen las reglas del tablero: paleta validada, globo de tres
// o cuatro renglones (dimensión, grupo, valor, población) y contorno por el
// eje de las categorías.
// ============================================================================

const ordenPorPrimeraSerie = (series, campo, serieA) => {
  const v = new Map();
  for (const d of series) if (d.serie === serieA) v.set(d[campo], d.pct ?? -1);
  return [...new Set(series.map((d) => d[campo]))].sort((a, b) => (v.get(b) ?? -1) - (v.get(a) ?? -1));
};
const ordenDe = (series, dim) => {
  const def = DIMENSIONES[dim];
  const presentes = [...new Set(series.map((d) => String(d[dim])))];
  return def?.orden ? def.orden.filter((v) => presentes.includes(v)) : presentes.sort();
};

// --- Barras agrupadas: dos barras por categoría ------------------------------
// Pregunta: ¿cómo se comparan los dos grupos en cada uno de estos indicadores?
// Las categorías van en filas (ordenadas por el valor del primer grupo) y, si
// hay un desglose, cada una de sus categorías es una columna.
export function barrasAgrupadas(series, {comparacion, filas = "indicador", faceta = null, formato = "pct",
    width = 1120, etiquetaFilas = "Indicador"} = {}) {
  asegurarTrama();
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const color = escalaColor(comparacion);
  const ordenFilas = ordenPorPrimeraSerie(series, filas, comp?.series?.[0]);
  const fx = faceta ? {fx: (d) => String(d[faceta])} : {};
  const canales = {
    [etiquetaFilas]: (d) => (faceta ? `${rotulo(filas, d[filas])}, ${rotulo(faceta, d[faceta])}` : rotulo(filas, d[filas])),
    "Grupo": (d) => d.serie,
    [etiquetaMedida(formato)]: (d) => formatear(d.pct, formato) + (d.fragil ? " *" : ""),
    ...canalPoblacion(formato),
  };
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width,
    height: ordenFilas.length * 46 + 76,
    // Con paneles, el nombre de cada panel arriba y el eje de valores abajo;
    // el dominio pasa de 100 para que la cifra de una barra larga no invada
    // el panel vecino.
    marginLeft: 320, marginRight: faceta ? 20 : 52, marginTop: faceta ? 34 : 30, marginBottom: faceta ? 34 : 16,
    x: {...ejeValor(formato), axis: faceta ? "bottom" : "top", ticks: formato === "pct" ? [0, 50, 100] : undefined,
      domain: [0, formato === "pct" ? (faceta ? 118 : 100) : d3.max(series, (d) => d.pct) * 1.15]},
    fy: {domain: ordenFilas, label: null, tickFormat: (v) => rotulo(filas, v), padding: 0.16},
    y: {domain: color.domain, axis: null, padding: 0.1},
    ...(faceta ? {fx: {domain: ordenDe(series, faceta), label: null, axis: "top", padding: 0.08, tickFormat: (v) => rotulo(faceta, v)}} : {}),
    color,
    marks: [
      Plot.ruleX([0], {stroke: GRIS.regla}),
      Plot.barX(series, {fy: filas, ...fx, y: "serie", x: "pct", fill: "serie", fillOpacity: 0.92,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fy: false, fx: false, fill: false}}}),
      Plot.barX(series.filter((d) => d.fragil), {fy: filas, ...fx, y: "serie", x: "pct", fill: `url(#${ID_TRAMA})`}),
      Plot.text(series, {fy: filas, ...fx, y: "serie", x: "pct",
        text: (d) => formatear(d.pct, formato) + (d.fragil ? "*" : ""), dx: 5, textAnchor: "start",
        fontSize: TIPO.etiqueta, fill: "currentColor", stroke: FONDO, strokeWidth: 3}),
      Plot.barX(series, Plot.pointerY({fy: filas, ...fx, y: "serie", x: "pct",
        fill: "none", stroke: GRIS.tinta, strokeWidth: 1.6, pointerEvents: "none", maxRadius: Infinity})),
    ],
  });
  return animar(fig);
}

// --- Heatmap: indicador × categoría, una rejilla por grupo -----------------
// Pregunta: ¿cómo cambia cada indicador a lo largo de un desglose (edad,
// tamaño de localidad, decil) y en cada grupo? Sin desglose, las columnas son
// los dos grupos. Escala de color fija de 0 a 100 (lección 74) con la rampa
// morada del sitio, y la cifra escrita en cada celda.
export function heatmapIndicadores(series, {comparacion, filas = "indicador", columnas = null, formato = "pct",
    width = 1120, etiquetaFilas = "Indicador"} = {}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const ordenFilas = ordenPorPrimeraSerie(series, filas, comp?.series?.[0]);
  const col = columnas ?? "serie";
  const ordenCols = columnas ? ordenDe(series, columnas) : (comp?.series ?? []);
  const nCols = ordenCols.length * (columnas ? 2 : 1);
  const anchoCelda = Math.max(52, Math.min(96, (width - 290) / nCols));
  const fx = columnas ? {fx: "serie"} : {};
  const canales = {
    [etiquetaFilas]: (d) => (columnas ? `${rotulo(filas, d[filas])}, ${rotulo(columnas, d[columnas])}` : rotulo(filas, d[filas])),
    "Grupo": (d) => d.serie,
    [etiquetaMedida(formato)]: (d) => formatear(d.pct, formato) + (d.fragil ? " *" : ""),
    ...canalPoblacion(formato),
  };
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width: Math.min(width, 310 + anchoCelda * nCols + (columnas ? 30 : 0)),
    height: ordenFilas.length * 34 + (columnas ? 130 : 90),
    // Con paneles por grupo: el grupo arriba y las categorías del desglose abajo.
    marginLeft: 300, marginRight: 10, marginTop: columnas ? 34 : 40, marginBottom: columnas ? 40 : 10, padding: 0.06,
    x: {domain: ordenCols.map(String), axis: columnas ? "bottom" : "top", label: null, tickFormat: (v) => (columnas ? rotulo(columnas, v).replace(" años", "") : v)},
    y: {domain: ordenFilas, label: null, tickSize: 0, tickFormat: (v) => rotulo(filas, v)},
    ...(columnas ? {fx: {domain: comp?.series ?? [], label: null, axis: "top", padding: 0.06}} : {}),
    color: {type: "linear", domain: [0, 100], interpolate: d3.interpolateRgbBasis(SECUENCIAL),
      legend: true, label: `${etiquetaMedida(formato)}${columnas ? ` según ${(DIMENSIONES[columnas]?.etiqueta ?? columnas).toLowerCase()}` : ""}`, tickFormat: (d) => `${d} %`},
    marks: [
      Plot.cell(series, {x: (d) => String(d[col]), y: filas, ...fx, fill: "pct", inset: 0.5,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fx: false, fill: false}}}),
      Plot.text(series, {x: (d) => String(d[col]), y: filas, ...fx,
        text: (d) => Math.round(d.pct) + (d.fragil ? "*" : ""), fontSize: TIPO.etiqueta,
        fill: (d) => ((d.pct >= 55) !== MODO.oscuro ? "white" : "black")}),
      Plot.cell(series, Plot.pointerY({x: (d) => String(d[col]), y: filas, ...fx,
        fill: "none", stroke: GRIS.tinta, strokeWidth: 1.8, pointerEvents: "none", maxRadius: Infinity})),
    ],
  });
  return animar(fig);
}

// --- Waffles: cuántos de cada 100, por indicador y grupo ---------------------
// Pregunta: de cada 100 personas de cada grupo, ¿cuántas cumplen? Con pocos
// indicadores (hasta cuatro) se lee sin ejes: una rejilla de 10 × 10 por
// indicador y grupo, con la cifra encima.
export function wafflesIndicadores(series, {comparacion, filas = "indicador", width = 1120} = {}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const color = escalaColor(comparacion);
  const ordenFilas = ordenPorPrimeraSerie(series, filas, comp?.series?.[0]);
  const canales = {
    "Indicador": (d) => d[filas],
    "Grupo": (d) => d.serie,
    "De cada 100": (d) => `${Math.round(d.pct)} (${formatear(d.pct, "pct")})`,
    "Población": (d) => poblacionCorta(d.num),
  };
  const panel = 118;
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width: Math.min(width, 2 * panel + 400),
    height: ordenFilas.length * (panel + 34) + 40,
    marginLeft: 370, marginTop: 40, marginBottom: 6, marginRight: 10,
    x: {axis: null}, y: {axis: null},
    fx: {domain: comp?.series ?? [], label: null, padding: 0.14},
    fy: {domain: ordenFilas, label: null, padding: 0.2},
    color,
    marks: [
      Plot.waffleY(series, {fx: "serie", fy: filas, y: 100, multiple: 10, fill: MODO.oscuro ? GRIS.fondo : "#dcdcd6", rx: 2, gap: 2}),
      Plot.waffleY(series, {fx: "serie", fy: filas, y: (d) => Math.round(d.pct), multiple: 10, fill: "serie", rx: 2, gap: 2,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fx: false, fy: false, fill: false}}}),
      Plot.text(series, {fx: "serie", fy: filas, frameAnchor: "top", dy: -6, text: (d) => `${Math.round(d.pct)} de cada 100`,
        fontSize: TIPO.etiqueta, fontWeight: 600, fill: "currentColor", lineAnchor: "bottom"}),
    ],
  });
  return animar(fig);
}

// --- Barras apiladas al 100 %: de qué se compone el total de cada grupo ----
// Solo para categorías que se excluyen y suman 100 (los motivos: cada persona
// declara UNO; se comprobó que suman 100 en cada celda). Las tres categorías
// con más peso en el primer grupo llevan los pasos de la rampa morada, de la
// más a la menos frecuente, y el resto va junto en «Otros motivos», en gris:
// máximo tres colores de identidad.
export function apiladas100(series, {comparacion, categorias = "indicador", width = 1120,
    etiquetaOtros = "Otros motivos", etiquetaCategoria = "Motivo"} = {}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  const grupos = comp?.series ?? [...new Set(series.map((d) => d.serie))];
  const top = ordenPorPrimeraSerie(series, categorias, grupos[0]).slice(0, 3);
  const filas = [];
  for (const g of grupos) {
    const del = series.filter((d) => d.serie === g);
    for (const c of top) {
      const d = del.find((x) => x[categorias] === c);
      if (d) filas.push({...d, cat: c});
    }
    const resto = del.filter((d) => !top.includes(d[categorias]));
    if (resto.length) filas.push({serie: g, cat: etiquetaOtros, pct: d3.sum(resto, (d) => d.pct), num: d3.sum(resto, (d) => d.num), den: resto[0].den});
  }
  const dominio = [...top, etiquetaOtros];
  const rango = MODO.oscuro ? APILADAS_OSCURO : APILADAS_CLARO;
  const tinta = (d) => tintaSobre(rango[dominio.indexOf(d.cat)] ?? rango[3]);
  const canales = {
    [etiquetaCategoria]: (d) => d.cat,
    "Grupo": (d) => d.serie,
    "Porcentaje": (d) => formatear(d.pct, "pct"),
    "Población": (d) => poblacionCorta(d.num),
  };
  const fig = Plot.plot({
    style: ESTILO_EJES,
    width,
    height: grupos.length * 64 + 80,
    marginLeft: 170, marginRight: 30, marginTop: 34, marginBottom: 10,
    x: {domain: [0, 100], axis: "top", label: null, ticks: [0, 25, 50, 75, 100], tickFormat: (d) => `${d} %`},
    y: {domain: grupos, label: null, tickSize: 0, padding: 0.3},
    color: {domain: dominio, range: rango, legend: true},
    marks: [
      Plot.barX(filas, Plot.stackX({y: "serie", x: "pct", fill: "cat", order: dominio, stroke: FONDO, strokeWidth: 1.5,
        channels: canales, tip: {...GLOBO, channels: canales, format: {x: false, y: false, fill: false}}})),
      Plot.text(filas, Plot.stackX({y: "serie", x: "pct", z: "cat", order: dominio,
        text: (d) => (d.pct >= 7 ? `${Math.round(d.pct)} %` : ""), fontSize: TIPO.etiqueta, fontWeight: 600, fill: tinta})),
      Plot.barX(filas, Plot.pointerY(Plot.stackX({y: "serie", x: "pct", z: "cat", order: dominio,
        fill: "none", stroke: GRIS.tinta, strokeWidth: 1.8, pointerEvents: "none", maxRadius: Infinity}))),
    ],
  });
  return animar(fig);
}
