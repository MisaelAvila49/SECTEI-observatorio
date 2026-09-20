// src/components/tablero.js
// El renderer de las páginas de análisis. Las páginas son cascarones que
// piden `seccionesTema(clave, datos)` y muestran cada sección después de su
// ancla de índice; toda la lógica de armado vive aquí y el texto en
// catalogo.js.
//
// Anatomía de cada sección (patrón PISA): cabecera con número y título igual
// al del índice, panel de filtros propio, figura con título en rojo,
// subtítulo que dice qué selección se ve, pie de una frase y botón de
// descarga; y debajo, en este orden, «¿Qué quiere decir este análisis?»,
// «Fuentes y verificación» y «Ver los datos».

import {html} from "npm:htl";
import {
  anchoActual, alCambiarAncho, alCambiarModo, formatear, POR_SEPARADO, AGREGADO, TODAS, TODOS,
  VER_MAPA, COMPARAR_ENTIDADES, POR_TAMANO, COMPARAR,
} from "./base.js";
import {panelFiltros, filtrar, geometria, prepararSeries, brechaDe, DIMENSIONES} from "./filtros.js";
import {
  barrasComparadas, dumbbell, pendiente, mapasComparados, avisoMuestra, kpis, seccion, figura,
  tablaDatos, explicacion,
} from "./graficas.js";
import {COMPARACION_POR_CLAVE, CRITERIO_POR_CLAVE, SERIE_INDIGENA} from "./grupos.js";
import {CATALOGO} from "./catalogo.js";
import {verificado} from "./fuentes.js";
import {conDescarga} from "./descargar.js";

export {CATALOGO};

// Referencias del pie de fuentes por encuesta (ids de src/data/fuentes.csv).
const FUENTES_POR_ENCUESTA = {
  censo: {datos: ["D-CENSO-2020"], referencia: ["R-CENSO-2020-TAB"], lectura: ["R-INEGI-PI", "R-IFT-BRECHA"]},
  enigh: {datos: ["D-ENIGH-2020", "D-ENIGH-2022", "D-ENIGH-2024"], referencia: ["R-ENIGH-2024-TAB"], lectura: ["R-INEGI-PI", "R-IFT-BRECHA"]},
  endutih: {datos: ["D-ENDUTIH-2025"], referencia: ["R-ENDUTIH-2025-COM"], lectura: ["R-INEGI-PI", "R-IFT-BRECHA"]},
};

// Frase del subtítulo con la selección vigente, para que la figura diga qué
// se está viendo sin volver al panel.
function notaSeleccion(v, anios) {
  const partes = [];
  const comp = COMPARACION_POR_CLAVE[v.comparacion];
  const crit = CRITERIO_POR_CLAVE[v.criterio];
  if (comp) partes.push(comp.etiqueta + (crit ? ` (${crit.corto})` : "") + ".");
  if (v.anio === POR_SEPARADO && anios.length > 1) partes.push(`Ediciones ${anios[0]} a ${anios.at(-1)}.`);
  else if (v.anio && v.anio !== POR_SEPARADO && anios.length > 1) partes.push(`Edición ${v.anio}.`);
  if (v.entidad === COMPARAR_ENTIDADES) partes.push("Por entidad.");
  else if (v.entidad === VER_MAPA) partes.push("En el mapa.");
  else if (v.entidad && v.entidad !== TODAS) partes.push(`${v.entidad}.`);
  if (v.sexo === POR_SEPARADO) partes.push("Por sexo.");
  else if (v.sexo && v.sexo !== AGREGADO) partes.push(`${v.sexo}.`);
  if (v.ambito === POR_SEPARADO) partes.push("Rural y urbano.");
  else if (v.ambito === POR_TAMANO) partes.push("Por tamaño de localidad.");
  else if (v.ambito && v.ambito !== AGREGADO) partes.push(`Localidades ${v.ambito === "Rural" ? "rurales" : "urbanas"}.`);
  if (v.rangoEdad === POR_SEPARADO) partes.push("Por rango de edad.");
  else if (v.rangoEdad && v.rangoEdad !== AGREGADO) partes.push(`Personas de ${v.rangoEdad} años.`);
  if (v.decil === COMPARAR) partes.push("Por decil de ingreso del hogar.");
  if (v.escolaridad === COMPARAR) partes.push("Por escolaridad, personas de 15 años o más.");
  return partes.join(" ");
}

// Pie de una frase: fuente y qué es cada marca (lección 78).
function pieDe(fuente, modo) {
  const que = modo === "mapa" ? "cada entidad toma el color de su valor y el tercer mapa, el de la brecha en puntos"
    : modo === "pendiente" ? "cada línea es un grupo a través de las ediciones y la banda su intervalo al 95 %"
    : modo === "barras" ? "cada barra es la proporción dentro de su grupo y el bigote su intervalo al 95 %"
    : "cada fila es una categoría, los dos puntos las proporciones de cada grupo y el segmento la brecha";
  return `${fuente || "INEGI"}: ${que}.`;
}

function bloqueFuentes(fuentes, encuesta, propio = null) {
  if (!fuentes) return document.createDocumentFragment();
  const f = {...(FUENTES_POR_ENCUESTA[encuesta] ?? {}), ...(propio ?? {})};
  return verificado(fuentes, {
    datos: f.datos ?? [], verificadoCon: f.verificadoCon ?? [], resultado: f.resultado ?? "",
    referencia: f.referencia ?? [], lectura: f.lectura ?? [],
  });
}

// Arma una gráfica completa con su anatomía a partir de las filas ya
// filtradas y la geometría del panel. TODAS las gráficas de análisis pasan
// por aquí, así que cualquier indicador queda disponible en cada forma.
function bloqueGrafica(filas, {v, geo, anios, formato, titulo, subtitulo, fuente, explica = null,
    geoEntidades = null, fuentesBloque = null, ancho, referencia = null}) {
  const base = {comparacion: v.comparacion, criterio: v.criterio, formato};
  const vacio = html`<p class="aviso-vacio">Sin datos para esta combinación de filtros. Prueba con otra edición o quita un desglose.</p>`;

  let grafica, series, dims;
  if (geo.modo === "mapa") {
    if (!geoEntidades) return html`<p class="aviso-vacio">El mapa no está disponible en esta página.</p>`;
    dims = ["entidad"];
    series = prepararSeries(filas, {...base, dims});
    if (!series.length) return vacio;
    grafica = mapasComparados(geoEntidades, series, {comparacion: v.comparacion, formato, width: ancho});
  } else if (geo.modo === "pendiente") {
    dims = ["anio"];
    series = prepararSeries(filas, {...base, dims});
    if (!series.length) return vacio;
    grafica = pendiente(series, {comparacion: v.comparacion, formato, width: Math.min(ancho, 900)});
  } else if (geo.modo === "barras") {
    dims = [];
    series = prepararSeries(filas, {...base, dims});
    if (!series.length) return vacio;
    grafica = barrasComparadas(series, {comparacion: v.comparacion, formato, width: ancho});
  } else {
    dims = [geo.filas, geo.faceta].filter(Boolean);
    series = prepararSeries(filas, {...base, dims});
    if (!series.length) return vacio;
    // Facetar por una dimensión con un solo valor no despliega nada.
    const faceta = geo.faceta && new Set(series.map((d) => d[geo.faceta])).size > 1 ? geo.faceta : null;
    grafica = dumbbell(series, {comparacion: v.comparacion, formato, filas: geo.filas, faceta, width: ancho,
      referencia: geo.modo === "entidades" ? referencia : null});
  }

  return [
    conDescarga(figura({titulo, subtitulo, pie: pieDe(fuente, geo.modo)}, [grafica, avisoMuestra(series)])),
    explicacion(explica),
    fuentesBloque,
    tablaDatos(series, {dims, formato}),
  ];
}

// Sección con panel propio que se repinta al cambiar un filtro, el ancho o
// el tema. `construir` recibe {v, geo, anios, ancho} y devuelve nodos.
function seccionConPanel({numero, titulo, datos, fuente, construir, opciones = {}}) {
  if (!datos.length) return null;
  const panel = panelFiltros(datos, {fuente, ...opciones});
  const cuerpo = html`<div class="seccion-cuerpo"></div>`;
  const aviso = html`<div class="aviso-lector" role="status" aria-live="polite"></div>`;
  const anios = [...new Set(datos.map((d) => String(d.anio)))].sort();
  let ancho = anchoActual();

  function pintar({anunciar = true, entrada = true} = {}) {
    cuerpo.classList.toggle("sin-entrada", !entrada);
    const v = panel.value;
    const geo = geometria(v, {aniosDisponibles: anios});
    const nodos = construir({v, geo, anios, ancho}) ?? [];
    cuerpo.replaceChildren(...nodos.flat(Infinity).filter(Boolean));
    if (anunciar) aviso.textContent = "Gráfica actualizada con los filtros seleccionados.";
  }
  panel.addEventListener("input", () => pintar());
  alCambiarModo(() => pintar({anunciar: false}));
  alCambiarAncho((nuevo) => { ancho = nuevo; pintar({anunciar: false, entrada: false}); });
  pintar({anunciar: false});

  return html`<section class="seccion-tablero">
    ${seccion({numero, titulo})}
    ${panel}
    ${aviso}
    ${cuerpo}
  </section>`;
}

const numero = (i) => String(i + 1).padStart(2, "0");

// Títulos de las secciones de un tema, en el orden en que se dibujan. Los usa
// el generador de cascarones para escribir las anclas del índice con el
// MISMO texto que la cabecera de cada sección.
export function titulosDeSecciones(clave) {
  const tema = CATALOGO[clave];
  if (!tema) return [];
  const t = [tema.principal.titulo ?? tema.principal.indicador];
  for (const b of tema.bloques ?? []) t.push(b.titulo);
  for (const m of tema.motivos ?? []) t.push(m.titulo);
  return t;
}

// Referencia nacional del indicador para el dumbbell por entidad: el valor
// de cada serie con todas las entidades juntas, respetando el resto de la
// selección (edición, sexo, localidad...).
function referenciaNacional(filas, v, formato) {
  const series = prepararSeries(filas, {comparacion: v.comparacion, criterio: v.criterio, dims: [], formato});
  const comp = COMPARACION_POR_CLAVE[v.comparacion];
  const a = series.find((s) => s.serie === comp.series[0])?.pct ?? null;
  const b = series.find((s) => s.serie === comp.series[1])?.pct ?? null;
  return {a, b};
}

// Secciones de un tema, cada una un nodo listo para `display`. `datos` son
// las filas del archivo principal del tema; `datosDecil` y
// `datosEscolaridad`, los desgloses opcionales.
export function seccionesTema(clave, datos, {geoEntidades = null, datosDecil = null,
    datosEscolaridad = null, fuentes = null} = {}) {
  const tema = CATALOGO[clave];
  if (!tema) return [html`<p>Tema desconocido: ${clave}</p>`];
  const encuesta = tema.encuesta;
  const formato = tema.formato ?? "pct";
  const todo = datos.concat(datosDecil ?? [], datosEscolaridad ?? []);
  const deIndicador = (nombre) => todo.filter((d) => d.indicador === nombre);
  const titulos = titulosDeSecciones(clave);
  let n = 0;

  // --- Sección 1: el indicador principal, con sus KPIs ----------------------
  const principal = tema.principal;
  const seccionPrincipal = seccionConPanel({
    numero: numero(n++),
    titulo: titulos[0],
    datos: deIndicador(principal.indicador),
    fuente: encuesta,
    opciones: {entidadInicial: COMPARAR_ENTIDADES, mostrarMapa: Boolean(geoEntidades)},
    construir: ({v, geo, anios, ancho}) => {
      const filas = filtrar(deIndicador(principal.indicador), v);
      // Las tarjetas resumen SIEMPRE una sola edición y todo el país.
      const anioKpi = v.anio === POR_SEPARADO ? anios.at(-1) : v.anio;
      const nacional = filtrar(deIndicador(principal.indicador), {...v, anio: anioKpi, entidad: TODAS});
      const total = prepararSeries(nacional, {comparacion: v.comparacion, criterio: v.criterio, dims: [], formato});
      const brecha = brechaDe(total, v.comparacion, {formato});
      const tarjetas = [];
      if (brecha) tarjetas.push({etiqueta: `Brecha nacional ${anioKpi}`, cifra: brecha.texto, nota: brecha.detalle});
      for (const s of total) {
        tarjetas.push({etiqueta: s.serie, cifra: formatear(s.pct, formato),
          nota: `${s.casos.toLocaleString("es-MX")} casos en muestra, ${anioKpi}${s.ic ? `; intervalo ${formatear(s.ic.lo, formato)} a ${formatear(s.ic.hi, formato)}` : ""}`});
      }
      const ind = total.find((s) => s.serie === SERIE_INDIGENA);
      if (ind && v.comparacion === "indigena") {
        tarjetas.push({etiqueta: "Población indígena en el universo", cifra: `${(100 * ind.den / total.reduce((a, s) => a + s.den, 0)).toFixed(1)} %`,
          nota: `${CRITERIO_POR_CLAVE[v.criterio]?.etiqueta ?? ""}, ${anioKpi}`});
      }
      return [
        kpis(tarjetas),
        bloqueGrafica(filas, {
          v, geo, anios, formato, ancho,
          titulo: principal.titulo ?? principal.indicador,
          subtitulo: notaSeleccion(v, anios),
          fuente: filas[0]?.fuente ?? "",
          explica: [tema.explica, principal.explica],
          geoEntidades,
          fuentesBloque: bloqueFuentes(fuentes, encuesta, tema.fuentes),
          referencia: referenciaNacional(nacional, v, formato),
        }),
      ];
    },
  });

  // --- Bloques de indicadores relacionados: una sección por bloque ----------
  const seccionesBloque = (tema.bloques ?? []).map((bloque) => {
    const datosB = bloque.indicadores.flatMap((i) => deIndicador(i.indicador));
    if (!datosB.length) return null;
    return seccionConPanel({
      numero: numero(n++),
      titulo: bloque.titulo,
      datos: datosB,
      fuente: encuesta,
      opciones: {entidadInicial: TODAS, edadInicial: bloque.abre === "edad" ? POR_SEPARADO : AGREGADO,
        ambitoInicial: bloque.abre === "localidad" ? POR_SEPARADO : AGREGADO, mostrarMapa: Boolean(geoEntidades)},
      construir: ({v, geo, anios, ancho}) => {
        const tarjetas = [];
        for (const i of bloque.indicadores) {
          const fsec = deIndicador(i.indicador);
          const ffil = filtrar(fsec, v);
          if (!ffil.length) continue;
          const aniosSec = [...new Set(fsec.map((d) => String(d.anio)))].sort();
          const geoSec = geometria(v, {aniosDisponibles: aniosSec});
          tarjetas.push(html`<div class="bloque-indicador">${bloqueGrafica(ffil, {
            v, geo: geoSec, anios: aniosSec, formato: i.formato ?? formato,
            // En rejilla de dos columnas cada tarjeta mide la mitad.
            ancho: tarjetas.length === 0 && bloque.indicadores.length % 2 === 1 ? ancho : Math.floor((ancho - 24) / 2),
            titulo: i.titulo ?? i.indicador,
            subtitulo: [i.universo ? `Universo: ${i.universo.toLowerCase()}.` : "", notaSeleccion(v, aniosSec)].filter(Boolean).join(" "),
            fuente: ffil[0]?.fuente ?? "",
            explica: [i.explica ?? bloque.explica, ffil[0]?.universo ? `Denominador: ${ffil[0].universo.toLowerCase()}.` : ""],
            geoEntidades,
            fuentesBloque: bloqueFuentes(fuentes, encuesta, i.fuentes ?? bloque.fuentes ?? tema.fuentes),
            referencia: geoSec.modo === "entidades" ? referenciaNacional(filtrar(fsec, {...v, entidad: TODAS}), v, i.formato ?? formato) : null,
          })}</div>`);
        }
        if (!tarjetas.length) return [html`<p class="aviso-vacio">Ningún indicador de esta sección admite esta combinación de filtros.</p>`];
        // Rejilla 1 + 2: la primera a ancho completo cuando el total es impar.
        if (tarjetas.length === 1) return [html`<div class="grid">${tarjetas}</div>`];
        if (tarjetas.length % 2 === 1) {
          const [primera, ...resto] = tarjetas;
          return [html`<div class="grid">${primera}</div>`, html`<div class="grid grid-cols-2">${resto}</div>`];
        }
        return [html`<div class="grid grid-cols-2">${tarjetas}</div>`];
      },
    });
  });

  // --- Motivos: muchas categorías que suman el 100 % de un universo ---------
  // Un dumbbell con los motivos en las filas: cada fila es un motivo y los dos
  // puntos, qué fracción de cada grupo lo declara. Sin mapa ni entidades: ya
  // usa las filas para los motivos.
  const seccionesMotivo = (tema.motivos ?? []).map((m) => {
    const datosM = todo.filter((d) => d.indicador.startsWith(m.prefijo));
    if (!datosM.length) return null;
    return seccionConPanel({
      numero: numero(n++),
      titulo: m.titulo,
      datos: datosM,
      fuente: encuesta,
      opciones: {entidadInicial: TODAS, mostrarMapa: false, compararEntidades: false},
      construir: ({v, geo, anios, ancho}) => {
        const ffil = filtrar(datosM, v).map((d) => ({...d, indicador: d.indicador.slice(m.prefijo.length)}));
        if (!ffil.length) return [html`<p class="aviso-vacio">Sin datos para esta combinación de filtros.</p>`];
        // Comparar entidades o el mapa no aplican aquí: las filas ya son los
        // motivos. Un desglose entra como faceta.
        const faceta = geo.modo === "dumbbell" ? geo.filas : (geo.modo === "pendiente" ? "anio" : null);
        const dims = ["indicador", faceta].filter(Boolean);
        const series = prepararSeries(ffil, {comparacion: v.comparacion, criterio: v.criterio, dims, formato: "pct"});
        if (!series.length) return [html`<p class="aviso-vacio">Sin datos para esta combinación de filtros.</p>`];
        const grafica = dumbbell(series, {comparacion: v.comparacion, formato: "pct", filas: "indicador",
          faceta: faceta && new Set(series.map((d) => d[faceta])).size > 1 ? faceta : null, width: ancho, ordenarPorBrecha: true, alturaFila: 30});
        return [
          conDescarga(figura({titulo: m.titulo, subtitulo: [`Universo: ${ffil[0].universo.toLowerCase()}.`, notaSeleccion(v, anios)].join(" "),
            pie: `${ffil[0].fuente}: cada fila es un motivo y los dos puntos, la fracción de cada grupo que lo declara.`}, [grafica, avisoMuestra(series)])),
          explicacion([m.explica, `Denominador: ${ffil[0].universo.toLowerCase()}.`]),
          bloqueFuentes(fuentes, encuesta, m.fuentes ?? tema.fuentes),
          tablaDatos(series, {dims: ["indicador", ...(faceta ? [faceta] : [])], formato: "pct"}),
        ];
      },
    });
  });

  return [seccionPrincipal, ...seccionesBloque, ...seccionesMotivo].map((s) => s ?? document.createDocumentFragment());
}
