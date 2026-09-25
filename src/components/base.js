// src/components/base.js
// Lo que comparten todas las páginas del tablero: paleta, tipografía, medición
// del ancho, formatos, centinelas de filtro y el arranque del modo claro /
// oscuro. Es el único módulo sin dependencias internas; todo lo demás importa
// de aquí. Hereda el patrón del Observatorio PISA: los objetos exportados se
// MUTAN en sitio al cambiar de modo, nunca se reasignan, porque un
// `export const` reasignado no se propaga a quien ya lo importó.

// --- Paleta -----------------------------------------------------------------
// Cada comparación del tablero es un PAR de series, y cada par lleva dos tonos
// validados con el validador de la skill `dataviz` (--pairs all, claro y
// oscuro). Cuatro tonos no pasan: ningún par de tonos aclarados libra a la
// vez el piso de croma y la banda de luminosidad en oscuro, así que el sexo
// no se codifica como cuarto color sino como faceta (ver filtros.js).
//
//   indígena vs resto   claro #C4101B,#2166AC -> peor par ΔE 22.1 protan
//                       oscuro #EE4C7C,#4A90D9 -> peor par ΔE 15.0 protan
//   mujeres vs hombres  claro #B87709,#2166AC / oscuro #BE8700,#4A90D9
//                       (ámbar y azul del Observatorio PISA, validados)
//
// El rojo identifica a la población indígena en todo el tablero, y en las
// rampas el rojo marca siempre el extremo desfavorable: las dos lecturas
// coinciden, porque la brecha que se mide va casi siempre en su contra.
const PAR_INDIGENA_CLARO = {"Población indígena": "#C4101B", "Resto de la población": "#2166AC"};
const PAR_INDIGENA_OSCURO = {"Población indígena": "#EE4C7C", "Resto de la población": "#4A90D9"};
const PAR_SEXO_CLARO = {"Mujeres indígenas": "#B87709", "Hombres indígenas": "#2166AC"};
const PAR_SEXO_OSCURO = {"Mujeres indígenas": "#BE8700", "Hombres indígenas": "#4A90D9"};

// Tercer par: AGEB que alcanzan el umbral de presencia indígena contra el
// resto. Mismos dos tonos del par principal, ya validados.
const PAR_AGEB_CLARO = {"AGEB que alcanzan el umbral": "#C4101B", "Resto de las AGEB": "#2166AC"};
const PAR_AGEB_OSCURO = {"AGEB que alcanzan el umbral": "#EE4C7C", "Resto de las AGEB": "#4A90D9"};

export const COLOR_SERIE = {...PAR_INDIGENA_CLARO, ...PAR_SEXO_CLARO, ...PAR_AGEB_CLARO};

// Paleta categórica de TRES tonos para las variantes de una lengua en el mapa
// de origen, más un gris para "las demás": con cuatro tonos el validador de la
// skill dataviz falla en separación para deuteranopía (ΔE 3.8 con el verde),
// así que el tope de tres más gris se queda (lección 63). Los tres son los
// mismos hex ya validados por pares; validados juntos en verificar_paleta.mjs.
const VARIANTES_CLARO = ["#C4101B", "#2166AC", "#B87709"];
const VARIANTES_OSCURO = ["#EE4C7C", "#4A90D9", "#BE8700"];
export const PALETA_VARIANTES = [...VARIANTES_CLARO];
export const GRIS_VARIANTE = "#8a8a86";

// Rojo de marca (kickers, títulos de figura, cifra destacada). Sobre
// superficie oscura el rojo pleno queda en 3.2:1 y vibra: ahí se usa el mismo
// escalón que el CSS en su bloque oscuro.
const ROJO_CLARO = "#C4101B";
const ROJO_OSCURO = "#E8474F";
export let ROJO = ROJO_CLARO;

// Fondo de la tarjeta, leído como variable CSS: Plot lo usa para el halo de
// las etiquetas y el borde de los puntos, y así es correcto en los dos modos.
export const FONDO = "var(--theme-background, #fff)";

// Los grises son un TONO, no una opacidad, para que el contraste de una serie
// atenuada no dependa de lo que quede debajo. `papel` coincide con
// --surface-3 del CSS (la tarjeta), no con el fondo de la página.
const GRISES_CLARO = {fondo: "#C8C8C2", trazo: "#8A8A84", contexto: "#ADADA7", papel: "#F7F7F5", tinta: "#3A3A36", rejilla: "#EDEDE9", regla: "#E2E8F0"};
const GRISES_OSCURO = {fondo: "#3E3E3B", trazo: "#75756E", contexto: "#57574F", papel: "#1E1E1C", tinta: "#D8D6D1", rejilla: "#2E2E2B", regla: "#2E2E2B"};
export const GRIS = {...GRISES_CLARO};

// Rampa DIVERGENTE para la brecha en puntos porcentuales (rojo = la población
// indígena está por debajo; azul = por encima; gris = sin brecha). Tonos de
// RdBu, de las pocas rampas divergentes que libran el daltonismo. En oscuro
// se invierte en luminosidad: el centro es gris medio y los extremos, claros.
const RAMPA_CLARO = ["#67001F", "#B2182B", "#D6604D", "#F4A582", "#E8E6E1", "#92C5DE", "#4393C3", "#2166AC", "#053061"];
const RAMPA_OSCURO = ["#FFB3B8", "#F27C82", "#E8474F", "#A32C34", "#4A4A45", "#2C5C8C", "#4A90D9", "#7FB6EA", "#B8D8F7"];
export const RAMPA = [...RAMPA_CLARO];

// Rampa SECUENCIAL de un solo tono para magnitudes (mapas de nivel, celdas).
// Del papel al rojo de marca: más tinta es más valor.
const SECUENCIAL_CLARO = ["#FDE9E7", "#F8C4BE", "#EF9A93", "#E36F6A", "#D34246", "#C4101B", "#8E0B14"];
const SECUENCIAL_OSCURO = ["#3A2223", "#6A2C31", "#9A3A40", "#C64C52", "#E8666C", "#F58A8F", "#FFB3B8"];
export const SECUENCIAL = [...SECUENCIAL_CLARO];

export const MODO = {oscuro: false};

const suscriptores = new Set();
export function alCambiarModo(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

export function aplicarModo(oscuro) {
  MODO.oscuro = oscuro;
  const par = oscuro ? {...PAR_INDIGENA_OSCURO, ...PAR_SEXO_OSCURO, ...PAR_AGEB_OSCURO}
    : {...PAR_INDIGENA_CLARO, ...PAR_SEXO_CLARO, ...PAR_AGEB_CLARO};
  for (const k of Object.keys(COLOR_SERIE)) COLOR_SERIE[k] = par[k];
  const grises = oscuro ? GRISES_OSCURO : GRISES_CLARO;
  for (const k of Object.keys(GRIS)) GRIS[k] = grises[k];
  RAMPA.length = 0;
  RAMPA.push(...(oscuro ? RAMPA_OSCURO : RAMPA_CLARO));
  SECUENCIAL.length = 0;
  SECUENCIAL.push(...(oscuro ? SECUENCIAL_OSCURO : SECUENCIAL_CLARO));
  PALETA_VARIANTES.length = 0;
  PALETA_VARIANTES.push(...(oscuro ? VARIANTES_OSCURO : VARIANTES_CLARO));
  ROJO = oscuro ? ROJO_OSCURO : ROJO_CLARO;
  for (const fn of suscriptores) fn(oscuro);
}

// --- Tipografía -------------------------------------------------------------
// Plot fija 10px por omisión, que en una tarjeta queda por debajo del mínimo
// cómodo. Un solo lugar para que el tablero no se vea disparejo.
export const TIPO = {ejes: 13, valor: 12.5, etiqueta: 11.5};
export const ESTILO_EJES = {fontSize: `${TIPO.ejes}px`};

// --- Ancho disponible -------------------------------------------------------
// Las gráficas se DIBUJAN al ancho de su contenedor en vez de encogerse: Plot
// emite el SVG con viewBox y una gráfica de 1120 px en una columna de 640 se
// escala al 57 % y arrastra la tipografía. El ancho no se calcula, se MIDE:
// una regla oculta lleva las mismas clases que la figura (`.medida-ancho`
// está en los mismos selectores de la hoja), así que su ancho de contenido es
// exactamente el que tendrá cualquier gráfica.
export const ANCHO_MINIMO = 560;
const ANCHO_RESERVA = 1120;
const UMBRAL_ANCHO = 8;

let regla = null;
function laRegla() {
  if (regla?.isConnected) return regla;
  const main = document.querySelector("#observablehq-main");
  if (!main) return null;
  regla = document.createElement("div");
  regla.className = "medida-ancho";
  regla.setAttribute("aria-hidden", "true");
  main.appendChild(regla);
  return regla;
}

export function anchoActual() {
  const r = laRegla();
  if (!r) return ANCHO_RESERVA;
  const c = getComputedStyle(r);
  const util = r.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
  return Math.max(ANCHO_MINIMO, Math.round(util) || ANCHO_RESERVA);
}

// Un solo ResizeObserver por página, difundido por suscripción.
const anchoSuscriptores = new Set();
let observador = null;
let anchoUltimo = 0;
let anchoCuadro = null;

export function alCambiarAncho(fn) {
  anchoSuscriptores.add(fn);
  arrancar();
  return () => anchoSuscriptores.delete(fn);
}

function arrancar() {
  if (observador || typeof ResizeObserver === "undefined") return;
  const r = laRegla();
  if (!r) return;
  anchoUltimo = anchoActual();
  observador = new ResizeObserver(() => {
    if (anchoCuadro) return;
    anchoCuadro = requestAnimationFrame(() => {
      anchoCuadro = null;
      const nuevo = anchoActual();
      if (Math.abs(nuevo - anchoUltimo) < UMBRAL_ANCHO) return;
      anchoUltimo = nuevo;
      for (const fn of anchoSuscriptores) fn(nuevo);
    });
  });
  observador.observe(r);
}

// --- Formato ----------------------------------------------------------------
export function punto(v, decimales = 0) {
  if (v == null || !Number.isFinite(v)) return "s/d";
  return v.toLocaleString("es-MX", {minimumFractionDigits: decimales, maximumFractionDigits: decimales});
}

export function diferencia(v, decimales = 0) {
  if (v == null || !Number.isFinite(v)) return "s/d";
  const s = v > 0 ? "+" : v < 0 ? "−" : "±";
  return s + punto(Math.abs(v), decimales);
}

// Un año es un IDENTIFICADOR, no una cantidad: "2020", nunca "2,020".
export function anio(v) {
  return v == null ? "" : String(v);
}

// Valor según el formato del indicador. El tablero solo tiene porcentajes por
// ahora, pero el formato viaja por toda la cadena para que un indicador de
// pesos u horas, si llega, no salga multiplicado por cien en silencio.
export function formatear(valor, formato = "pct") {
  if (valor == null || !Number.isFinite(valor)) return "s/d";
  if (formato === "pesos") return "$" + Math.round(valor).toLocaleString("es-MX");
  if (formato === "horas") return `${valor.toFixed(1)} h`;
  if (formato === "conteo") return Math.round(valor).toLocaleString("es-MX");
  return `${valor.toFixed(1)} %`;
}

export function poblacionCorta(v) {
  if (v == null || !Number.isFinite(v)) return "s/d";
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + " M";
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + " mil";
  return Math.round(v).toLocaleString("es-MX");
}

// --- Centinelas de filtro ---------------------------------------------------
// Un selector en "todos" puede querer decir dos cosas: AGREGADO (junta los
// grupos en una sola cifra; válido cuando son disjuntos dentro de un mismo
// levantamiento) o POR_SEPARADO (una faceta o fila por valor; no agrega
// nada). El año solo admite el segundo: sumar 2020, 2022 y 2024 cuenta tres
// veces a la misma población.
export const TODAS = "Todas";
export const TODOS = "Todos";
export const AGREGADO = "__agregado__";
export const POR_SEPARADO = "__facetas__";
export const VER_MAPA = "__mapa__";
export const COMPARAR_ENTIDADES = "__entidades__";
export const POR_TAMANO = "__tamano__";
export const COMPARAR = "__comparar__";

// --- Orden de las dimensiones ordinales -------------------------------------
export const ORDEN_EDAD = ["6-11", "12-17", "18-29", "30-44", "45-59", "60+"];
export const ORDEN_TAM_LOC = ["100 mil habitantes o más", "15 mil a 99 999", "2 500 a 14 999", "Menos de 2 500"];
export const TAM_LOC_RURAL = "Menos de 2 500";
export const ORDEN_AMBITO = ["Urbano", "Rural"];
export const ORDEN_ESCOLARIDAD = ["Primaria o menos", "Secundaria", "Media superior", "Superior"];
// Estrato socioeconómico del INEGI (ENIGH `est_socio`, ENDUTIH `ESTRATO`).
export const ORDEN_ESTRATO = ["Bajo", "Medio bajo", "Medio alto", "Alto"];
export const ORDEN_SEXO = ["Mujeres", "Hombres"];
export const ORDEN_DECIL = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
export const ORDEN_GRADO = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"];

// --- Animación --------------------------------------------------------------
export function animar(nodo) {
  if (!nodo) return nodo;
  const env = document.createElement("div");
  env.className = "grafica-anim";
  env.appendChild(nodo);
  // Plot escribe <g aria-label="dot"> sin rol, y ARIA prohíbe aria-label en
  // un elemento sin rol. El script del head lo corrige con un observador,
  // pero con retardo; aquí queda resuelto desde que el nodo nace.
  for (const g of env.querySelectorAll("svg g[aria-label]:not([role])")) g.setAttribute("role", "group");
  for (const r of env.querySelectorAll('svg rect[aria-label="frame"]')) r.removeAttribute("aria-label");
  return env;
}

// --- Arranque del modo claro / oscuro ---------------------------------------
// Va al FINAL del módulo: aplicarModo() escribe sobre constantes declaradas
// arriba. El modo lo decide el LECTOR con el botón del sidebar y vive en el
// atributo `data-tema` de <html>, que escribe el script de la config antes
// del primer pintado. La guardia de `document` es para el build en Node.
if (typeof document !== "undefined") {
  const leer = () => document.documentElement.getAttribute("data-tema") === "oscuro";
  aplicarModo(leer());
  addEventListener("sdi:tema", () => aplicarModo(leer()));
}
