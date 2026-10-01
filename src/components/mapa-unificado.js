// src/components/mapa-unificado.js
// Un solo mapa para las tres unidades (alcaldía, AGEB, manzana) y la vista
// nacional de origen de los hablantes. El panel decide qué capa se ve y con
// qué valores; el mapa se crea UNA vez y solo cambia pintura, filtros y
// visibilidad (lección 101).
//
// Tres fuentes de datos, tres formas de pintar:
//   - manzanas y AGEB: teselas PMTiles con las tasas como atributos (2020);
//   - alcaldías: GeoJSON de 16 polígonos cuyo valor se escribe con
//     setFeatureState desde la serie (varios años, lengua, sexo);
//   - entidades: GeoJSON nacional, también por feature-state, con líneas de
//     flujo entidad de nacimiento → CDMX generadas aquí.
import maplibregl from "npm:maplibre-gl@5.24.0";
import {html} from "npm:htl";
import {registrarProtocolo, estiloBase, expresionColor, cortesPorCuantil, leyenda, RAMPA_MORADA, SIN_DATO, ROJO_IBERO} from "./mapa.js";
import {GRIS_VARIANTE, ORDEN_GRADO, ORDINAL, punto, alCambiarModo} from "./base.js";
import {panelMapa, POBLACIONES, CRUCES, UNIDADES, SEXOS} from "./panel-mapa.js";

const CDMX = [[-99.37, 19.04], [-98.94, 19.60]];
const MEXICO = [[-118.5, 14.4], [-86.6, 32.8]];

// Clave de entidad (3 dígitos, como en los microdatos) → ISO del GeoJSON
// nacional y nombre tal como lo escribe el Catálogo INALI 2008.
const ENTIDAD = {
  "001": ["MX-AGU", "AGUASCALIENTES"], "002": ["MX-BCN", "BAJA CALIFORNIA"], "003": ["MX-BCS", "BAJA CALIFORNIA SUR"],
  "004": ["MX-CAM", "CAMPECHE"], "005": ["MX-COA", "COAHUILA DE ZARAGOZA"], "006": ["MX-COL", "COLIMA"],
  "007": ["MX-CHP", "CHIAPAS"], "008": ["MX-CHH", "CHIHUAHUA"], "009": ["MX-CMX", "DISTRITO FEDERAL"],
  "010": ["MX-DUR", "DURANGO"], "011": ["MX-GUA", "GUANAJUATO"], "012": ["MX-GRO", "GUERRERO"],
  "013": ["MX-HID", "HIDALGO"], "014": ["MX-JAL", "JALISCO"], "015": ["MX-MEX", "ESTADO DE MÉXICO"],
  "016": ["MX-MIC", "MICHOACÁN DE OCAMPO"], "017": ["MX-MOR", "MORELOS"], "018": ["MX-NAY", "NAYARIT"],
  "019": ["MX-NLE", "NUEVO LEÓN"], "020": ["MX-OAX", "OAXACA"], "021": ["MX-PUE", "PUEBLA"],
  "022": ["MX-QUE", "QUERÉTARO ARTEAGA"], "023": ["MX-ROO", "QUINTANA ROO"], "024": ["MX-SLP", "SAN LUIS POTOSÍ"],
  "025": ["MX-SIN", "SINALOA"], "026": ["MX-SON", "SONORA"], "027": ["MX-TAB", "TABASCO"],
  "028": ["MX-TAM", "TAMAULIPAS"], "029": ["MX-TLA", "TLAXCALA"], "030": ["MX-VER", "VERACRUZ DE IGNACIO DE LA LLAVE"],
  "031": ["MX-YUC", "YUCATÁN"], "032": ["MX-ZAC", "ZACATECAS"],
};
const POB_SERIE = {hablantes: "hablantes3", hogares: "hogares", autoads: "autoads", todas: "todas", ambas: "ambas"};
// Hablantes: un solo universo, 5 años y más, en las ocho ediciones (2015 y
// 2025 salen de los microdatos, sin tabulado con ese corte). Por sexo solo hay
// 5 años y más en 2005, 2015 y 2025, así que por sexo se usa 3 años y más
// desde 2010. La definición del panel toma el universo de la fila.
const pobSerie = (poblacion, anio, sexo = "Total") => (poblacion === "hablantes" ? (sexo === "Total" || anio < 2010 ? "hablantes5" : "hablantes3") : POB_SERIE[poblacion]);
const FUENTE_ANIO = {1990: "Censo 1990 (INEGI)", 1995: "Conteo 1995 (INEGI)", 2000: "Censo 2000 (INEGI)", 2005: "Conteo 2005 (INEGI)",
  2010: "Censo 2010 (INEGI)", 2015: "Encuesta Intercensal 2015 (INEGI)", 2020: "Censo 2020 (INEGI)", 2025: "Encuesta Intercensal 2025 (INEGI)"};

const nombreEntidad = (cve2) => { const e = ENTIDAD["0" + cve2]; return e ? e[1].toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : ""; };
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const pct = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? "sin dato" : `${Number(v).toFixed(d)} %`);
const entero = (n) => (n == null || n === "" ? "sin dato" : punto(Math.round(Number(n))));

// Centro de la caja de un polígono o multipolígono: basta para anclar una
// línea de flujo; no hace falta el centroide exacto.
function centro(f) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const visitar = (c) => {
    if (typeof c[0] === "number") {
      x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]);
    } else c.forEach(visitar);
  };
  visitar(f.geometry.coordinates);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

// Punto INTERIOR de un polígono, para que las flechas salgan de tierra: el
// centro de la caja de Veracruz cae en el Golfo y el de Baja California Sur
// en el mar. Se toma el anillo exterior más grande; si su centroide queda
// fuera, se muestrea una rejilla y se elige el punto interior más alejado del
// contorno (polo de inaccesibilidad aproximado).
function anillos(f) {
  const g = f.geometry;
  return g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
}
function areaAnillo(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}
function dentro(p, r) {
  let d = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function distContorno(p, r) {
  let m = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2)) : 0;
    const ex = x1 + t * dx - p[0], ey = y1 + t * dy - p[1];
    m = Math.min(m, ex * ex + ey * ey);
  }
  return Math.sqrt(m);
}
const interiorCache = new WeakMap();
function puntoInterior(f) {
  if (interiorCache.has(f)) return interiorCache.get(f);
  const r = anillos(f).sort((a, b) => areaAnillo(b) - areaAnillo(a))[0];
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const w = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    cx += (r[j][0] + r[i][0]) * w; cy += (r[j][1] + r[i][1]) * w; a += w;
  }
  let p = a ? [cx / (3 * a), cy / (3 * a)] : centro(f);
  if (!dentro(p, r) || distContorno(p, r) < 0.15) {
    const xs = r.map((q) => q[0]), ys = r.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let mejor = null, dm = -1;
    for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) {
      const q = [x0 + ((x1 - x0) * i) / 30, y0 + ((y1 - y0) * j) / 30];
      if (!dentro(q, r)) continue;
      const d = distContorno(q, r);
      if (d > dm) { dm = d; mejor = q; }
    }
    if (mejor) p = mejor;
  }
  interiorCache.set(f, p);
  return p;
}

// Arco suave entre dos puntos (curva cuadrática), para que las líneas de
// distintas entidades no se encimen en una sola recta al llegar a la ciudad.
// `curva` regula cuánto se comba: varias líneas de la misma entidad se
// separan por curvatura, no moviendo el origen, que debe seguir en tierra.
function arco(a, b, curva = 0.18, n = 24) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * curva, cy = my + dx * curva;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
  }
  return pts;
}

export function mapaUnificado({serie, lenguas, origen, clin, variantesCiudad = [], clinMunicipios = [], municipiosLenguas = [], catalogo, agebs, colonias,
    pmtilesManzanas, pmtilesAgebs, pmtilesMunicipios = null, pmtilesManzanas2010 = null, pmtilesAgebs2010 = null, agebs2010 = [],
    geoAlcaldias, geoLimite, geoEntidades}) {
  registrarProtocolo();
  const catNombre = new Map(catalogo.map((c) => [c.clave, c]));

  // Opciones de lengua: las de la última muestra, por hablantes en la ciudad.
  const ultimo = Math.max(...lenguas.map((r) => r.anio));
  const opcionesLengua = lenguas
    .filter((r) => r.anio === ultimo && r.nivel === "entidad" && r.sexo === "Total" && r.lengua < "8000")
    .sort((a, b) => b.num - a.num)
    .map((r) => ({clave: r.lengua, etiqueta: r.lengua_nombre}));

  // Por AGEB y manzana hay dos ediciones si existen las teselas de 2010.
  const teselas2010 = {ageb: Boolean(pmtilesAgebs2010), manzana: Boolean(pmtilesManzanas2010)};
  const aniosDe = ({unidad, poblacion, lengua}) => {
    if (unidad !== "alcaldia") return teselas2010[unidad] ? [2010, 2020] : [2020];
    const filas = lengua !== "todas"
      ? lenguas.filter((r) => r.lengua === lengua && r.nivel === "alcaldia")
      : serie.filter((r) => r.poblacion === pobSerie(poblacion, r.anio) && r.nivel === "alcaldia");
    return [...new Set(filas.map((r) => r.anio))].sort();
  };
  // El sexo solo se ofrece si la fuente de ese año lo desglosa (los ITER de
  // 1990 a 2000 no traen hablantes por sexo).
  const sexoDe = ({unidad, poblacion, lengua, anio}) => {
    if (unidad !== "alcaldia") return true;
    const filas = lengua !== "todas"
      ? lenguas.filter((r) => r.lengua === lengua && r.anio === anio && r.nivel === "alcaldia")
      : serie.filter((r) => r.poblacion === pobSerie(poblacion, anio, "Mujeres") && r.anio === anio && r.nivel === "alcaldia");
    return filas.some((r) => r.sexo === "Mujeres");
  };

  const panel = panelMapa({lenguas: opcionesLengua, aniosDe, sexoDe});
  const contenedor = html`<div class="mapa-lienzo" role="region" aria-label="Mapa"></div>`;
  // Dentro del lienzo: la leyenda abajo a la derecha y una tarjeta de lectura
  // arriba a la izquierda, que muestra la cifra de la ciudad en reposo y la
  // unidad bajo el cursor al pasar el mouse. Sustituye al globo que seguía al
  // cursor y tapaba el mapa.
  const tarjeta = html`<div class="mapa-tarjeta" role="status" aria-live="polite"></div>`;
  // Tarjetas fijadas con clic, para comparar hasta cinco unidades; la sexta
  // sustituye a la más antigua y cualquier cambio de filtro las borra.
  const fijadas = html`<div class="mapa-fijadas" role="group" aria-label="Unidades fijadas para comparar"></div>`;
  const MAX_FIJADAS = 5;
  let pila = [];
  const leyendaCaja = html`<div class="mapa-leyenda-caja"></div>`;
  // Una sola columna en la esquina: tarjeta de la ciudad, leyenda debajo (a la
  // vista, junto a la cifra) y las tarjetas fijadas al final, sin encimarse.
  const esquina = html`<div class="mapa-esquina">${tarjeta}${leyendaCaja}${fijadas}</div>`;
  contenedor.append(esquina);
  const lateral = html`<aside class="mapa-lateral"></aside>`;
  const resumen = html`<div class="mapa-resumen"></div>`;
  const botonOrigen = html`<button type="button" class="mapa-boton-origen" hidden>Ver de dónde vienen</button>`;
  const botonLengua = html`<button type="button" class="mapa-boton-origen mapa-boton-lengua" hidden>Ver el mapa de la lengua</button>`;
  const botones = html`<div class="mapa-botones">${botonOrigen}${botonLengua}</div>`;
  const variantes = html`<div class="mapa-variantes" hidden></div>`;
  // El lateral tiene dos pestañas: Filtros (el panel y los botones de vista) e
  // Información (definición, detalle de la unidad fijada con clic y variantes).
  // El clic en el mapa abre Información; "Volver a filtros" regresa.
  const seleccion = html`<div class="mapa-seleccion" hidden></div>`;
  const tabFiltros = html`<button type="button" role="tab" id="mapa-tab-filtros" aria-selected="true" aria-controls="mapa-vista-filtros">Filtros</button>`;
  const tabInfo = html`<button type="button" role="tab" id="mapa-tab-info" aria-selected="false" aria-controls="mapa-vista-info">Información</button>`;
  const pestanas = html`<div class="mapa-pestanas" role="tablist" aria-label="Panel del mapa">${tabFiltros}${tabInfo}</div>`;
  const vistaFiltros = html`<div id="mapa-vista-filtros" role="tabpanel" aria-labelledby="mapa-tab-filtros">${panel}${botones}</div>`;
  const volver = html`<button type="button" class="mapa-volver">← Volver a los filtros</button>`;
  const vistaInfo = html`<div id="mapa-vista-info" role="tabpanel" aria-labelledby="mapa-tab-info" hidden>${volver}${seleccion}${resumen}${variantes}</div>`;
  lateral.append(pestanas, vistaFiltros, vistaInfo);
  function mostrarPestana(nombre) {
    const info = nombre === "info";
    vistaFiltros.hidden = info;
    vistaInfo.hidden = !info;
    tabFiltros.setAttribute("aria-selected", String(!info));
    tabInfo.setAttribute("aria-selected", String(info));
    lateral.scrollTop = 0;
  }
  tabFiltros.addEventListener("click", () => mostrarPestana("filtros"));
  tabInfo.addEventListener("click", () => mostrarPestana("info"));
  volver.addEventListener("click", () => mostrarPestana("filtros"));
  let seleccionada = null;
  const nodo = html`<div class="mapa-pantalla">${contenedor}${lateral}</div>`;

  const estado = {origen: false, lengua: false, cargado: false};
  const mapa = new maplibregl.Map({
    container: contenedor, style: estiloBase(), bounds: CDMX, fitBoundsOptions: {padding: 12},
    minZoom: 4, maxZoom: 17, attributionControl: {compact: true},
  });
  mapa.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  mapa.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");
  // Observable inserta el nodo después de crear el mapa: la primera vez que el
  // contenedor mide algo, MapLibre calculó el encuadre sobre 400x300 y la
  // ciudad sale diminuta. Se reencuadra al primer tamaño real.
  let encuadrado = false;
  new ResizeObserver(() => {
    if (contenedor.clientWidth <= 0) return;
    mapa.resize();
    if (!encuadrado) { encuadrado = true; mapa.fitBounds(estado.origen ? MEXICO : CDMX, {padding: 12, duration: 0}); }
  }).observe(contenedor);
  contenedor.mapa = mapa;
  nodo.mapa = mapa;
  let enReposo = () => "";
  // El globo sigue al cursor (MapLibre Popup); la tarjeta fija de la esquina
  // muestra la cifra de la ciudad y, debajo, las unidades fijadas con clic.
  const popup = new maplibregl.Popup({closeButton: false, closeOnClick: false, className: "mapa-globo", offset: 12});
  const globo = {
    mostrar(htmlTexto, lngLat) { popup.setLngLat(lngLat).setHTML(htmlTexto).addTo(mapa); },
    reposo() { tarjeta.innerHTML = enReposo(); popup.remove(); },
  };
  function pintarFijadas() {
    fijadas.replaceChildren(...pila.map((f, i) => {
      const caja = document.createElement("div");
      caja.className = "mapa-fijada";
      caja.innerHTML = f.html;
      const quitar = document.createElement("button");
      quitar.type = "button";
      quitar.className = "mapa-fijada-quitar";
      quitar.setAttribute("aria-label", "Quitar de la comparación");
      quitar.textContent = "×";
      quitar.addEventListener("click", () => { pila.splice(i, 1); pintarFijadas(); });
      caja.prepend(quitar);
      return caja;
    }));
    fijadas.hidden = !pila.length;
  }
  function fijar(clave, htmlTexto) {
    const ya = pila.findIndex((f) => f.clave === clave);
    if (ya >= 0) pila.splice(ya, 1);
    pila.push({clave, html: htmlTexto});
    if (pila.length > MAX_FIJADAS) pila.shift();
    pintarFijadas();
  }
  function limpiarFijadas() { pila = []; pintarFijadas(); seleccionada = null; seleccion.hidden = true; seleccion.replaceChildren(); }

  const cacheCortes = new Map();
  const CAPAS_UNIDAD = {manzana: "manzanas", ageb: "agebs", alcaldia: "alcaldias"};
  let activa = null;

  function apagarActiva() {
    if (!activa) return;
    mapa.setFeatureState(activa, {activa: false});
    activa = null;
  }

  function capasTesela(id, capa, zoomBorde, zoomHover) {
    mapa.addLayer({id: `${id}-relleno`, type: "fill", source: id, "source-layer": capa, layout: {visibility: "none"},
      paint: {"fill-color": SIN_DATO, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.55, 12, 0.75, 14, 0.9]}});
    mapa.addLayer({id: `${id}-borde`, type: "line", source: id, "source-layer": capa, minzoom: zoomBorde, layout: {visibility: "none"},
      paint: {"line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], zoomBorde, 0.2, 16, 0.8], "line-opacity": 0.5}});
    mapa.addLayer({id: `${id}-hover`, type: "line", source: id, "source-layer": capa, minzoom: zoomHover, layout: {visibility: "none"},
      paint: {"line-color": ROJO_IBERO, "line-width": 2, "line-opacity": ["case", ["boolean", ["feature-state", "activa"], false], 1, 0]}});
  }

  // Punta de flecha para las líneas de origen: un triángulo SDF que toma el
  // color de cada línea y sigue su dirección (hacia la ciudad).
  function imagenFlecha() {
    const n = 32, c = document.createElement("canvas");
    c.width = n; c.height = n;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(4, 6); g.lineTo(28, 16); g.lineTo(4, 26); g.lineTo(10, 16); g.closePath(); g.fill();
    return g.getImageData(0, 0, n, n);
  }

  // ---------------------------------------------------------------- flujos
  // Interacción de las líneas de origen: al pasar por una línea, por su
  // entidad o por una lengua o variante de la leyenda, se resaltan esos
  // flujos y los demás se atenúan; los resaltados avanzan hacia la ciudad con
  // un trazo en movimiento (salvo con movimiento reducido). `cond` es una
  // expresión de MapLibre sobre las propiedades de cada línea, o null.
  const NINGUNO = ["==", ["get", "ent"], "__ninguna__"];
  const OPACIDAD_FLUJO = ["coalesce", ["get", "opacidad"], 0.85];
  const movimientoReducido = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let animacionFlujo = null;
  function resaltarFlujos(cond) {
    if (!mapa.getLayer("flujos-linea")) return;
    mapa.setPaintProperty("flujos-linea", "line-opacity", cond ? ["case", cond, 0.95, 0.1] : OPACIDAD_FLUJO);
    mapa.setPaintProperty("flujos-flecha", "icon-opacity", cond ? ["case", cond, 0.95, 0.1] : OPACIDAD_FLUJO);
    mapa.setPaintProperty("flujos-halo", "line-opacity", cond ? ["case", cond, 0.75, 0.04] : 0.55);
    const animar = Boolean(cond) && !movimientoReducido();
    mapa.setFilter("flujos-foco", animar ? cond : NINGUNO);
    cancelAnimationFrame(animacionFlujo);
    animacionFlujo = null;
    if (!animar) return;
    // Secuencia de guiones del ejemplo de MapLibre: recorrerla desplaza el
    // trazo en el sentido de la línea, de la entidad hacia la ciudad.
    const pasos = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
    let paso = -1;
    const cuadro = (t) => {
      const n = Math.floor(t / 60) % pasos.length;
      if (n !== paso && mapa.getLayer("flujos-foco")) { mapa.setPaintProperty("flujos-foco", "line-dasharray", pasos[n]); paso = n; }
      animacionFlujo = requestAnimationFrame(cuadro);
    };
    animacionFlujo = requestAnimationFrame(cuadro);
  }
  // Línea o destino bajo el cursor, con una caja de tolerancia; null si no hay.
  function flujoBajo(punto) {
    if (!mapa.getLayer("flujos-linea") || mapa.getLayoutProperty("flujos-linea", "visibility") !== "visible") return null;
    const caja = [[punto.x - 6, punto.y - 6], [punto.x + 6, punto.y + 6]];
    const destino = mapa.queryRenderedFeatures(caja, {layers: ["flujos-destino"]})[0];
    if (destino) return {tipo: "destino", f: destino};
    const linea = mapa.queryRenderedFeatures(caja, {layers: ["flujos-linea"]})[0];
    return linea ? {tipo: "linea", f: linea} : null;
  }
  function globoFlujo(p) {
    return `<div class="globo-titulo">${escapar(p.nombreEnt)} → Ciudad de México</div>
      <table class="globo-tabla"><tr><th>${escapar(p.tipo)}</th><td>${escapar(p.etiqueta)}</td></tr>
      <tr><th>Hablantes</th><td>${entero(p.num)}</td></tr>
      <tr><th>Parte de los nacidos fuera</th><td>${pct(p.pct)}</td></tr>
      <tr><th>Desde ${escapar(p.nombreEnt)}, en total</th><td>${entero(p.totalEnt)}</td></tr></table>
      <div class="mapa-tarjeta-pista">Clic para fijar y comparar</div>`;
  }
  mapa.on("load", () => {
    mapa.addImage("flecha", imagenFlecha(), {sdf: true});
    mapa.addSource("manzanas", {type: "vector", url: `pmtiles://${pmtilesManzanas}`});
    mapa.addSource("agebs", {type: "vector", url: `pmtiles://${pmtilesAgebs}`});
    if (pmtilesManzanas2010) mapa.addSource("manzanas2010", {type: "vector", url: `pmtiles://${pmtilesManzanas2010}`});
    if (pmtilesAgebs2010) mapa.addSource("agebs2010", {type: "vector", url: `pmtiles://${pmtilesAgebs2010}`});
    mapa.addSource("alcaldias", {type: "geojson", data: geoAlcaldias, promoteId: "CVEGEO"});
    mapa.addSource("entidades", {type: "geojson", data: geoEntidades, promoteId: "id"});
    mapa.addSource("flujos", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    mapa.addSource("destino", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    if (pmtilesMunicipios) mapa.addSource("municipios", {type: "vector", url: `pmtiles://${pmtilesMunicipios}`, promoteId: "CVEGEO"});
    if (geoLimite) mapa.addSource("cdmx-limite", {type: "geojson", data: geoLimite});

    capasTesela("manzanas", "manzanas", 13, 12);
    capasTesela("agebs", "agebs", 9, 9);
    if (pmtilesManzanas2010) capasTesela("manzanas2010", "manzanas", 13, 12);
    if (pmtilesAgebs2010) capasTesela("agebs2010", "agebs", 9, 9);
    mapa.addLayer({id: "alcaldias-relleno", type: "fill", source: "alcaldias", layout: {visibility: "none"},
      paint: {"fill-color": SIN_DATO, "fill-opacity": 0.85}});
    mapa.addLayer({id: "alcaldias-halo", type: "line", source: "alcaldias",
      paint: {"line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 5], "line-opacity": 0.9}});
    mapa.addLayer({id: "alcaldias-linea", type: "line", source: "alcaldias",
      paint: {"line-color": "#3d3d3d", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.1, 14, 1.8], "line-opacity": 0.9, "line-dasharray": [2.5, 1.5]}});
    mapa.addLayer({id: "alcaldias-hover", type: "line", source: "alcaldias",
      paint: {"line-color": ROJO_IBERO, "line-width": 3, "line-opacity": ["case", ["boolean", ["feature-state", "activa"], false], 1, 0]}});
    if (geoLimite) {
      mapa.addLayer({id: "cdmx-limite-halo", type: "line", source: "cdmx-limite",
        paint: {"line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4, 12, 6], "line-opacity": 0.9}});
      mapa.addLayer({id: "cdmx-limite", type: "line", source: "cdmx-limite",
        paint: {"line-color": "#1f1f1f", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.8, 12, 2.8], "line-opacity": 0.9}});
    }
    mapa.addLayer({id: "entidades-relleno", type: "fill", source: "entidades", layout: {visibility: "none"},
      paint: {"fill-color": SIN_DATO, "fill-opacity": 0.8}});
    mapa.addLayer({id: "entidades-linea", type: "line", source: "entidades", layout: {visibility: "none"},
      paint: {"line-color": "#ffffff", "line-width": 1, "line-opacity": 0.9}});
    mapa.addLayer({id: "entidades-hover", type: "line", source: "entidades", layout: {visibility: "none"},
      paint: {"line-color": ROJO_IBERO, "line-width": 2.5, "line-opacity": ["case", ["boolean", ["feature-state", "activa"], false], 1, 0]}});
    if (pmtilesMunicipios) {
      mapa.addLayer({id: "municipios-relleno", type: "fill", source: "municipios", "source-layer": "municipios", layout: {visibility: "none"},
        paint: {"fill-color": ["coalesce", ["feature-state", "color"], "rgba(0,0,0,0)"], "fill-opacity": 0.85}});
      mapa.addLayer({id: "municipios-linea", type: "line", source: "municipios", "source-layer": "municipios", minzoom: 6, layout: {visibility: "none"},
        paint: {"line-color": "#ffffff", "line-width": 0.4, "line-opacity": 0.6}});
      mapa.addLayer({id: "municipios-hover", type: "line", source: "municipios", "source-layer": "municipios", layout: {visibility: "none"},
        paint: {"line-color": ROJO_IBERO, "line-width": 2, "line-opacity": ["case", ["boolean", ["feature-state", "activa"], false], 1, 0]}});
    }
    // Borde claro bajo cada línea: separa los flujos del relleno de las
    // entidades y entre sí cuando se cruzan.
    mapa.addLayer({id: "flujos-halo", type: "line", source: "flujos", layout: {visibility: "none", "line-cap": "round"},
      paint: {"line-color": "#ffffff", "line-width": ["+", ["get", "grosor"], 2.5], "line-opacity": 0.55}});
    mapa.addLayer({id: "flujos-linea", type: "line", source: "flujos", layout: {visibility: "none", "line-cap": "round"},
      paint: {"line-color": ["get", "color"], "line-width": ["get", "grosor"], "line-opacity": ["coalesce", ["get", "opacidad"], 0.85]}});
    mapa.addLayer({id: "flujos-flecha", type: "symbol", source: "flujos",
      layout: {visibility: "none", "symbol-placement": "line", "symbol-spacing": 160, "icon-image": "flecha", "icon-allow-overlap": true, "icon-ignore-placement": true,
        "icon-rotation-alignment": "map", "icon-size": ["interpolate", ["linear"], ["get", "grosor"], 1, 0.35, 9, 0.7]},
      paint: {"icon-color": ["get", "color"], "icon-opacity": ["coalesce", ["get", "opacidad"], 0.85]}});
    // Trazo en movimiento sobre los flujos resaltados (filtro vacío en reposo).
    mapa.addLayer({id: "flujos-foco", type: "line", source: "flujos", filter: NINGUNO, layout: {visibility: "none", "line-cap": "butt"},
      paint: {"line-color": "#ffffff", "line-width": ["max", 1.2, ["*", ["get", "grosor"], 0.45]], "line-opacity": 0.95, "line-dasharray": [0, 4, 3]}});
    // Destino: la ciudad, con un círculo proporcional a los hablantes que llegan.
    mapa.addLayer({id: "flujos-destino", type: "circle", source: "destino", layout: {visibility: "none"},
      paint: {"circle-radius": ["get", "radio"], "circle-color": ROJO_IBERO, "circle-opacity": 0.7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5}});

    for (const capa of ["manzanas-relleno", "agebs-relleno", ...(pmtilesManzanas2010 ? ["manzanas2010-relleno"] : []), ...(pmtilesAgebs2010 ? ["agebs2010-relleno"] : []),
      "alcaldias-relleno", "entidades-relleno", ...(pmtilesMunicipios ? ["municipios-relleno"] : [])]) {
      mapa.on("mousemove", capa, (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null) return;
        if (capa === "entidades-relleno" && vistaActual.flujos && flujoBajo(e.point)) return;
        mapa.getCanvas().style.cursor = "pointer";
        const ref = {source: f.source, sourceLayer: f.sourceLayer, id: f.id};
        if (!activa || activa.id !== f.id || activa.source !== f.source) {
          apagarActiva();
          activa = ref;
          mapa.setFeatureState(ref, {activa: true});
        }
        globo.mostrar(globoDe(capa, f), e.lngLat);
        if (capa === "entidades-relleno" && vistaActual.flujos) resaltarFlujos(["==", ["get", "ent"], f.id]);
      });
      mapa.on("mouseleave", capa, () => { mapa.getCanvas().style.cursor = ""; apagarActiva(); globo.reposo(); if (capa === "entidades-relleno") resaltarFlujos(null); });
      mapa.on("click", capa, (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null) return;
        if (capa === "entidades-relleno" && vistaActual.flujos && flujoBajo(e.point)) return;
        fijar(`${f.source}:${f.id}`, globoDe(capa, f));
        seleccionada = {capa, id: f.id, propiedades: f.properties};
        pintarSeleccion();
        mostrarPestana("info");
      });
    }
    // Vista de origen: un solo manejador decide qué responde, con prioridad
    // destino > línea > entidad. Así el globo de la entidad y el de la línea no
    // se encimen: si hay una línea a menos de 6 px del cursor, manda la línea y
    // la entidad no se resalta; si no, el manejador de la entidad toma el turno.
    let enFlujo = false;
    mapa.on("mousemove", (e) => {
      if (!vistaActual.flujos) return;
      const hit = flujoBajo(e.point);
      if (hit?.tipo === "destino") {
        enFlujo = true;
        apagarActiva();
        mapa.getCanvas().style.cursor = "pointer";
        resaltarFlujos(["has", "ent"]);
        const p = hit.f.properties;
        globo.mostrar(`<div class="globo-titulo">Ciudad de México</div><table class="globo-tabla"><tr><th>Hablantes nacidos en otra entidad</th><td>${entero(p.total)}</td></tr><tr><th>Entidades de origen</th><td>${p.entidades}</td></tr></table>`, e.lngLat);
      } else if (hit?.tipo === "linea") {
        enFlujo = true;
        apagarActiva();
        mapa.getCanvas().style.cursor = "pointer";
        const p = hit.f.properties;
        resaltarFlujos(["all", ["==", ["get", "ent"], p.ent], ["==", ["get", "cat"], p.cat]]);
        globo.mostrar(globoFlujo(p), e.lngLat);
      } else if (enFlujo) {
        // Se salió de la línea: se limpia y, si quedó sobre una entidad, su
        // manejador vuelve a pintar en este mismo movimiento.
        enFlujo = false;
        const ent = mapa.queryRenderedFeatures(e.point, {layers: ["entidades-relleno"]})[0];
        // Si quedó sobre una entidad, se resaltan sus flujos aquí mismo (el
        // manejador de la entidad pudo correr antes en este movimiento).
        if (ent?.id != null) resaltarFlujos(["==", ["get", "ent"], ent.id]);
        else { resaltarFlujos(null); mapa.getCanvas().style.cursor = ""; globo.reposo(); }
      }
    });
    mapa.on("click", (e) => {
      if (!vistaActual.flujos) return;
      const hit = flujoBajo(e.point);
      if (hit?.tipo === "linea") fijar(`flujo:${hit.f.properties.ent}:${hit.f.properties.cat}`, globoFlujo(hit.f.properties));
    });
    estado.cargado = true;
    pintar();
  });

  // ---------------------------------------------------------------- valores
  const v = () => panel.value;
  const poblacionDe = (k) => POBLACIONES.find((p) => p.clave === k);
  const cruceDe = (k) => CRUCES.find((x) => x.clave === k);

  function filasAlcaldia({anio, poblacion, lengua, sexo}, nivel) {
    return lengua !== "todas"
      ? lenguas.filter((r) => r.anio === anio && r.lengua === lengua && r.sexo === sexo && r.nivel === nivel)
      : serie.filter((r) => r.anio === anio && r.poblacion === pobSerie(poblacion, anio, sexo) && r.sexo === sexo && r.nivel === nivel);
  }

  // Cortes FIJOS por indicador a lo largo de los años (lección 74): se miden
  // sobre todas las alcaldías, años y sexos de ese indicador.
  function cortesAlcaldia({poblacion, lengua}) {
    const clave = `alc|${poblacion}|${lengua}`;
    if (!cacheCortes.has(clave)) {
      const filas = lengua !== "todas"
        ? lenguas.filter((r) => r.lengua === lengua && r.nivel === "alcaldia")
        : serie.filter((r) => r.poblacion === pobSerie(poblacion, r.anio, r.sexo) && r.nivel === "alcaldia");
      cacheCortes.set(clave, cortesPorCuantil(filas.map((r) => 100 * r.num / r.den), 5));
    }
    return cacheCortes.get(clave);
  }

  function campoTesela(e) {
    const pob = poblacionDe(e.poblacion);
    if (e.cruce) return cruceDe(e.cruce).tesela[e.unidad];
    const suf = e.unidad === "manzana" ? (SEXOS.find((s) => s.clave === e.sexo)?.sufijo ?? "") : "";
    return pob.tesela[e.unidad] + (pob.porSexo ? suf : "");
  }

  function cortesTesela(e, campo) {
    const cruce = e.cruce ? cruceDe(e.cruce) : null;
    if (cruce?.categorias) return [1, 2, 3, 4, 5];
    const clave = `${e.unidad}|${campo}`;
    if (!cacheCortes.has(clave)) {
      // Cortes fijos entre ediciones: se calculan sobre las dos tablas de AGEB
      // (2010 y 2020) para que el mismo tono signifique lo mismo en los dos años.
      const tabla = e.unidad === "manzana" ? colonias : [...agebs, ...agebs2010];
      cacheCortes.set(clave, cortesPorCuantil(tabla.map((r) => r[campo]).filter((x) => x != null && Number.isFinite(+x)).map(Number), 5));
    }
    return cacheCortes.get(clave);
  }

  // ---------------------------------------------------------------- globos
  let vistaActual = {campo: null, unidad: "alcaldia", cruce: null, poblacion: null, valores: new Map()};
  function globoDe(capa, f) {
    const p = f.properties;
    const e = vistaActual;
    if (capa === "entidades-relleno") {
      const d = e.valores.get(f.id);
      if (!d) return `<div class="globo-titulo">${escapar(p.name)}</div><div class="globo-sub">Sin hablantes nacidos aquí en la muestra</div>`;
      return `<div class="globo-titulo">${escapar(p.name)}</div><div class="globo-sub">${entero(d.num)} hablantes de la ciudad nacieron aquí</div>
        <ul class="globo-lista">${d.detalle.map((t) => `<li>${escapar(t)}</li>`).join("")}</ul>`;
    }
    if (capa === "municipios-relleno") {
      const d = e.valores.get(f.id);
      return `<div class="globo-titulo">${escapar(p.NOMGEO)}</div><div class="globo-sub">${escapar(nombreEntidad(String(p.CVEGEO ?? "").slice(0, 2)))}</div>
        ${d ? `<ul class="globo-lista">${d.detalle.map((t) => `<li>${escapar(t)}</li>`).join("")}</ul>` : `<div class="globo-sub">Sin registro del catálogo</div>`}`;
    }
    if (capa === "alcaldias-relleno") {
      const d = e.valores.get(f.id);
      const vars = e.variantesAlcaldia?.get(f.id);
      const filaVar = vars?.length ? `<tr><th>Variantes probables</th><td>${escapar(vars.slice(0, 3).map(([v, n]) => `${v} (${entero(n)})`).join("; "))}</td></tr>` : "";
      return `<div class="globo-titulo">${escapar(p.alcaldia)}</div>
        <table class="globo-tabla"><tr><th>${escapar(e.etiqueta)}</th><td>${d ? pct(d.pct) : "sin dato"}</td></tr>
        <tr><th>Personas</th><td>${d ? `${entero(d.num)} de ${entero(d.den)}` : "sin dato"}</td></tr>${filaVar}</table>`;
    }
    const cruce = e.cruce ? cruceDe(e.cruce) : null;
    const titulo = capa.startsWith("manzanas") ? escapar(p.colonia ?? "Sin colonia") : `AGEB ${escapar(String(p.cve_ageb ?? "").slice(-4))}`;
    const valor = cruce?.categorias ? escapar(p[cruce.texto] ?? "sin grado") : pct(p[e.campo]);
    const presencia = e.cruce ? `<tr><th>${escapar(poblacionDe(e.poblacion).corto)}</th><td>${pct(p[poblacionDe(e.poblacion).tesela[e.unidad]])}</td></tr>` : "";
    return `<div class="globo-titulo">${titulo}</div><div class="globo-sub">${escapar(p.alcaldia)}</div>
      <table class="globo-tabla"><tr><th>${escapar(e.etiqueta)}</th><td>${valor}</td></tr>${presencia}
      <tr><th>Población</th><td>${entero(p.POBTOT)}</td></tr></table>`;
  }

  // ---------------------------------------------------------------- pintado
  function visibles(ids) {
    const todas = ["manzanas-relleno", "manzanas-borde", "manzanas-hover", "agebs-relleno", "agebs-borde", "agebs-hover",
      "manzanas2010-relleno", "manzanas2010-borde", "manzanas2010-hover", "agebs2010-relleno", "agebs2010-borde", "agebs2010-hover",
      "alcaldias-relleno", "alcaldias-halo", "alcaldias-linea", "alcaldias-hover", "cdmx-limite-halo", "cdmx-limite",
      "entidades-relleno", "entidades-linea", "entidades-hover", "flujos-halo", "flujos-linea", "flujos-flecha", "flujos-foco", "flujos-destino", "municipios-relleno", "municipios-linea", "municipios-hover"];
    for (const id of todas) if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", ids.includes(id) ? "visible" : "none");
    // Fuera de la vista de origen no queda ninguna animación corriendo.
    if (!ids.includes("flujos-foco")) { cancelAnimationFrame(animacionFlujo); animacionFlujo = null; }
  }

  function pintar() {
    const e = v();
    const pob = poblacionDe(e.poblacion);
    const cruce = e.cruce ? cruceDe(e.cruce) : null;
    const etiqueta = cruce ? cruce.etiqueta : e.lengua !== "todas" ? `Hablan ${catNombre.get(e.lengua)?.nombre ?? e.lengua}` : pob.corto;
    // Las dos vistas nacionales existen con una lengua concreta o con todas.
    const conOrigen = e.unidad === "alcaldia" && e.poblacion === "hablantes";
    botonOrigen.hidden = !conOrigen;
    botonLengua.hidden = !conOrigen || !pmtilesMunicipios;
    if (!conOrigen) { estado.origen = false; estado.lengua = false; }
    botonOrigen.textContent = estado.origen ? "Volver a la ciudad" : "Ver de dónde vienen";
    botonLengua.textContent = estado.lengua ? "Volver a la ciudad" : "Ver el mapa de la lengua";
    botonOrigen.hidden = botonOrigen.hidden || estado.lengua;
    botonLengua.hidden = botonLengua.hidden || estado.origen;
    variantes.hidden = !(conOrigen && e.lengua !== "todas");
    if (conOrigen && e.lengua !== "todas") pintarVariantes(e);
    // En la vista de origen el sexo no aplica (los flujos no lo desglosan).
    panel.mostrar("sexo", !estado.origen && !estado.lengua && panel.aplica("sexo"));
    if (!estado.cargado) return;

    if (estado.origen) return pintarOrigen(e, etiqueta);
    if (estado.lengua) return pintarLengua(e);

    if (e.unidad === "alcaldia") {
      const filas = filasAlcaldia(e, "alcaldia");
      const valores = new Map(filas.map((r) => [`09${r.cve}`, {pct: 100 * r.num / r.den, num: r.num, den: r.den, ee: r.ee}]));
      for (const f of geoAlcaldias.features) {
        const d = valores.get(f.properties.CVEGEO);
        mapa.setFeatureState({source: "alcaldias", id: f.properties.CVEGEO}, {valor: d ? d.pct : null});
      }
      const cortes = cortesAlcaldia(e);
      mapa.setPaintProperty("alcaldias-relleno", "fill-color", expresionColor("valor", cortes, RAMPA_MORADA, "feature-state"));
      visibles(["alcaldias-relleno", "alcaldias-halo", "alcaldias-linea", "alcaldias-hover", "cdmx-limite-halo", "cdmx-limite"]);
      // Con una lengua elegida, el globo de cada alcaldía lista sus variantes
      // probables (las tres mayores), sumando los tres niveles de certeza.
      const variantesAlcaldia = new Map();
      if (e.lengua !== "todas") {
        for (const r of variantesCiudad.filter((r) => r.anio === e.anio && r.lengua === e.lengua && r.variante)) {
          const k = `09${r.cve_alc}`;
          const m = variantesAlcaldia.get(k) ?? new Map();
          m.set(r.variante, (m.get(r.variante) ?? 0) + r.num);
          variantesAlcaldia.set(k, m);
        }
        for (const [k, m] of variantesAlcaldia) variantesAlcaldia.set(k, [...m.entries()].sort((a, b) => b[1] - a[1]));
      }
      vistaActual = {unidad: "alcaldia", etiqueta, valores, cruce: null, poblacion: e.poblacion, campo: null, variantesAlcaldia};
      const ent = filasAlcaldia(e, "entidad")[0];
      pintarResumen({e, etiqueta, cortes, ent, muestra: ent?.cota === "muestra"});
      return;
    }

    // La capa de 2010 es una fuente aparte con la misma estructura de campos.
    const id = CAPAS_UNIDAD[e.unidad] + (e.anio === 2010 && teselas2010[e.unidad] ? "2010" : "");
    const campo = campoTesela(e);
    const cortes = cortesTesela(e, campo);
    const rampaTesela = e.cruce && cruceDe(e.cruce)?.categorias ? ORDINAL[5] : RAMPA_MORADA;
    mapa.setPaintProperty(`${id}-relleno`, "fill-color", expresionColor(campo, cortes, rampaTesela));
    const condiciones = [];
    if (e.umbral > 0) condiciones.push([">=", ["to-number", ["get", pob.tesela[e.unidad]]], e.umbral]);
    if (e.unidad === "manzana" && e.ambito === "pueblos") condiciones.push(["==", ["to-string", ["get", "pueblo_originario"]], "True"]);
    for (const c of [`${id}-relleno`, `${id}-borde`]) mapa.setFilter(c, condiciones.length ? ["all", ...condiciones] : null);
    mapa.setPaintProperty(`${id}-relleno`, "fill-opacity", e.umbral > 0 ? 0.95 : ["interpolate", ["linear"], ["zoom"], 9, 0.55, 12, 0.75, 14, 0.9]);
    visibles([`${id}-relleno`, `${id}-borde`, `${id}-hover`, "alcaldias-halo", "alcaldias-linea", "cdmx-limite-halo", "cdmx-limite"]);
    vistaActual = {unidad: e.unidad, etiqueta, valores: new Map(), cruce: e.cruce, poblacion: e.poblacion, campo};
    const ent = serie.find((r) => r.anio === e.anio && r.nivel === "entidad" && r.poblacion === pobSerie(e.poblacion, e.anio, pob.porSexo ? e.sexo : "Total") && r.sexo === (pob.porSexo ? e.sexo : "Total"));
    pintarResumen({e, etiqueta, cortes, ent: cruce ? null : ent, muestra: false, cruce});
  }

  function pintarResumen({e, etiqueta, cortes, ent, muestra, cruce = null}) {
    const unidad = UNIDADES.find((u) => u.clave === e.unidad);
    const pob = poblacionDe(e.poblacion);
    const tituloLeyenda = cruce?.categorias ? cruce.etiqueta
      : `${etiqueta} (% de ${cruce ? (cruce.unidad === "viviendas" ? "las viviendas" : "la población") : "la población"} de cada ${unidad.singular})`
        + (e.umbral > 0 ? `, donde ${pob.corto.toLowerCase()} es ${e.umbral} % o más` : "");
    const ley = leyenda({cortes, titulo: tituloLeyenda, ...(cruce?.categorias ? {rampa: ORDINAL[5]} : {}),
      formato: cruce?.categorias ? (x) => ORDEN_GRADO[x - 1] : (x) => x.toFixed(cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1) + " %",
      abierta: !cruce?.categorias,
      notaSinDato: cruce?.categorias ? "Sin grado publicado" : "Sin dato publicado (INEGI suprime la cifra por confidencialidad)"});
    // La cifra de la ciudad vive en la tarjeta del mapa, como estado de reposo.
    enReposo = () => ent
      ? `<div class="globo-titulo">Ciudad de México · ${e.anio}</div><div class="globo-sub">${escapar(etiqueta)}</div>
         <div class="mapa-cifra-valor">${pct(100 * ent.num / ent.den)}${muestra && ent.ee ? `<span class="mapa-cifra-error"> ± ${(100 * ent.ee * 1.96).toFixed(1)}</span>` : ""}</div>
         <div class="mapa-cifra-nota">${entero(ent.num)} personas${muestra ? " · estimación de encuesta" : ""}</div>
         <div class="mapa-tarjeta-pista">Pasa el cursor por una ${unidad.singular} para ver su cifra; haz clic para fijarla y comparar hasta cinco</div>`
      : `<div class="globo-titulo">${escapar(etiqueta)}</div><div class="mapa-tarjeta-pista">Pasa el cursor por una ${unidad.singular} para ver su cifra; haz clic para fijarla y comparar hasta cinco</div>`;
    globo.reposo();
    const cifra = "";
    const fuente = e.unidad === "alcaldia" ? FUENTE_ANIO[e.anio] : `Censo ${e.anio} (INEGI), resultados por AGEB y manzana`;
    // El universo de la definición es el de la fila (5 años y más antes de
    // 2010; autoadscripción de 5+ en 2000 y de 3+ en 2010).
    let definicion = cruce ? cruce.definicion : pob.definicion;
    if (!cruce && ent?.universo && !/hablantes/i.test(ent.universo)) definicion = definicion.replace(/Personas de 3 años y más/, ent.universo.replace(/^Población/, "Personas")).replace(/sobre la población de 3 años y más/, `sobre la ${ent.universo.toLowerCase()}`);
    if (!cruce && e.anio === 2000 && ["autoads", "todas", "ambas"].includes(e.poblacion)) definicion += " En 2000 la pregunta era distinta: si la persona era náhuatl, maya, zapoteca, mixteca o de otro grupo indígena.";
    const aviso = e.umbral > 0 && e.unidad === "manzana"
      ? html`<p class="mapa-aviso">Solo las manzanas con ${e.umbral} % o más: son manzanas sueltas, acerca el mapa para verlas o cambia a AGEB.</p>` : "";
    const avisoTodas = e.poblacion === "todas" ? html`<p class="mapa-aviso">Una persona cuenta una sola vez aunque hable una lengua y además se considere indígena.</p>` : "";
    const avisoHogares = e.poblacion === "hogares" && e.unidad !== "alcaldia" && teselas2010[e.unidad]
      ? html`<p class="mapa-aviso">La definición de hogar indígena cambió en 2020 (incluye a los ascendientes que hablan la lengua); al comparar con 2010 parte del cambio es de definición.</p>` : "";
    leyendaCaja.replaceChildren(ley);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">${etiqueta}</h2>
      <p class="mapa-definicion">${definicion} <span class="mapa-fuente">${fuente}.</span></p>${cifra}${aviso}${avisoTodas}${avisoHogares}`);
  }

  // ---------------------------------------------------------------- selección
  // Detalle de la unidad fijada con clic, en la pestaña Información. Cada capa
  // trae lo que sus datos permiten: la alcaldía su serie y sus variantes; la
  // AGEB o manzana sus indicadores de 2020; la entidad sus lenguas y variantes de
  // origen; el municipio su lengua dominante y las variantes del catálogo.
  const tablaDetalle = (filas) => html`<table class="mapa-detalle-tabla">${filas.map(([k, v]) => html`<tr><th>${k}</th><td>${v}</td></tr>`)}</table>`;
  function pintarSeleccion() {
    if (!seleccionada) { seleccion.hidden = true; seleccion.replaceChildren(); return; }
    const e = v();
    const {capa, id, propiedades: p} = seleccionada;
    const nodos = [];
    let destacar = null;
    if (capa === "alcaldias-relleno") {
      const cve = String(id).slice(2);
      nodos.push(html`<h3 class="mapa-seleccion-titulo">${p.alcaldia}</h3>`);
      // Serie de la alcaldía para lo que está pintado.
      const filas = (e.lengua !== "todas"
        ? lenguas.filter((r) => r.lengua === e.lengua && r.cve === cve && r.nivel === "alcaldia" && r.sexo === e.sexo)
        : serie.filter((r) => r.poblacion === pobSerie(e.poblacion, r.anio, e.sexo) && r.cve === cve && r.nivel === "alcaldia" && r.sexo === e.sexo))
        .sort((a, b) => a.anio - b.anio);
      nodos.push(html`<p class="mapa-seleccion-sub">${vistaActual.etiqueta}, por edición</p>`,
        tablaDetalle(filas.map((r) => [String(r.anio) + (r.anio === e.anio ? " ◂" : ""), `${pct(100 * r.num / r.den)} · ${entero(r.num)}`])));
      if (e.lengua !== "todas") {
        const porV = new Map();
        for (const r of variantesCiudad.filter((r) => r.anio === e.anio && r.lengua === e.lengua && r.cve_alc === cve && r.variante)) porV.set(r.variante, (porV.get(r.variante) ?? 0) + r.num);
        const lista = [...porV.entries()].sort((a, b) => b[1] - a[1]);
        destacar = new Set(lista.slice(0, 5).map(([k]) => k));
        nodos.push(html`<p class="mapa-seleccion-sub">Variantes probables en ${p.alcaldia}, ${e.anio}</p>`,
          lista.length ? tablaDetalle(lista.slice(0, 8).map(([k, n]) => [k, entero(n)])) : html`<p class="mapa-seleccion-nota">Sin hablantes con origen conocido.</p>`);
      } else {
        const top = lenguas.filter((r) => r.anio === e.anio && r.cve === cve && r.nivel === "alcaldia" && r.sexo === "Total" && r.lengua < "8000").sort((a, b) => b.num - a.num).slice(0, 8);
        if (top.length) nodos.push(html`<p class="mapa-seleccion-sub">Lenguas más habladas en ${p.alcaldia}, ${e.anio}</p>`, tablaDetalle(top.map((r) => [r.lengua_nombre, entero(r.num)])));
      }
    } else if (capa === "agebs-relleno" || capa === "manzanas-relleno") {
      const esMza = capa.startsWith("manzanas");
      nodos.push(html`<h3 class="mapa-seleccion-titulo">${esMza ? (p.colonia ?? "Sin colonia") : `AGEB ${String(p.cve_ageb ?? "").slice(-4)}`}</h3><p class="mapa-seleccion-sub">${p.alcaldia} · Censo ${capa.includes("2010") ? 2010 : 2020}</p>`);
      const filas = [["Población", entero(p.POBTOT)]];
      for (const pob of POBLACIONES.filter((x) => x.tesela?.[e.unidad])) filas.push([pob.corto, pct(p[pob.tesela[e.unidad]])]);
      if (!capa.includes("2010")) for (const c of CRUCES.filter((x) => x.tesela[e.unidad])) filas.push([c.etiqueta, c.categorias ? (p[c.texto] ?? "sin grado") : pct(p[c.tesela[e.unidad]])]);
      if (esMza && p.pueblo_originario != null) filas.push(["Pueblo originario", String(p.pueblo_originario) === "True" ? "Sí" : "No"]);
      nodos.push(tablaDetalle(filas));
    } else if (capa === "entidades-relleno") {
      const ent = Object.entries(ENTIDAD).find(([, [iso]]) => iso === id)?.[0];
      const todas = e.lengua === "todas";
      const filas = variantesCiudad.filter((r) => r.anio === e.anio && r.cve_ent === ent && (todas || r.lengua === e.lengua));
      nodos.push(html`<h3 class="mapa-seleccion-titulo">${p.name}</h3><p class="mapa-seleccion-sub">Hablantes de la ciudad nacidos aquí, ${e.anio}: ${entero(filas.reduce((s, r) => s + r.num, 0))}</p>`);
      if (todas) {
        const porL = new Map();
        for (const r of filas) porL.set(r.lengua, (porL.get(r.lengua) ?? 0) + r.num);
        nodos.push(html`<p class="mapa-seleccion-sub">Por lengua</p>`, tablaDetalle([...porL.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => [catNombre.get(k)?.nombre ?? k, entero(n)])));
      }
      const porV = new Map();
      for (const r of filas) if (r.variante) porV.set(todas ? `${catNombre.get(r.lengua)?.nombre ?? r.lengua}: ${r.variante}` : r.variante, (porV.get(todas ? `${catNombre.get(r.lengua)?.nombre ?? r.lengua}: ${r.variante}` : r.variante) ?? 0) + r.num);
      const lista = [...porV.entries()].sort((a, b) => b[1] - a[1]);
      if (!todas) destacar = new Set(lista.map(([k]) => k));
      nodos.push(html`<p class="mapa-seleccion-sub">Variantes probables</p>`, lista.length ? tablaDetalle(lista.slice(0, 10).map(([k, n]) => [k, entero(n)])) : html`<p class="mapa-seleccion-nota">Sin registro del catálogo en esta entidad.</p>`);
    } else if (capa === "municipios-relleno") {
      const cve = String(id);
      const cat = clinMunicipios.filter((r) => `${r.cve_ent.slice(-2)}${r.cve_mun}` === cve && (e.lengua === "todas" || r.lengua === e.lengua));
      const hab = municipiosLenguas.filter((r) => r.cve === cve).sort((a, b) => b.hablantes - a.hablantes);
      nodos.push(html`<h3 class="mapa-seleccion-titulo">${p.NOMGEO}</h3><p class="mapa-seleccion-sub">${nombreEntidad(cve.slice(0, 2))}</p>`);
      if (hab.length) nodos.push(html`<p class="mapa-seleccion-sub">Hablantes en el municipio (Censo 2020)</p>`, tablaDetalle(hab.slice(0, 8).map((r) => [catNombre.get(r.lengua)?.nombre ?? r.lengua, entero(r.hablantes)])));
      if (e.lengua !== "todas") destacar = new Set(cat.map((r) => r.variante));
      nodos.push(html`<p class="mapa-seleccion-sub">Variantes según el Catálogo INALI</p>`, cat.length ? tablaDetalle(cat.map((r) => [catNombre.get(r.lengua)?.nombre ?? r.lengua, r.variante])) : html`<p class="mapa-seleccion-nota">Sin registro del catálogo.</p>`);
    }
    seleccion.replaceChildren(html`<div class="mapa-seleccion-caja">${nodos}</div>`);
    seleccion.hidden = false;
    if (e.lengua !== "todas" && e.unidad === "alcaldia") pintarVariantes(e, destacar);
  }

  // ---------------------------------------------------------------- origen
  // La variante viene ya asignada por scripts/loaders/variantes.py con tres
  // niveles de certeza (exacta por municipio, única en la entidad, estimada
  // por reparto) y "sin" para nacidos en la ciudad o sin registro. Aquí solo
  // se agrupa y se pinta.
  const CERTEZA = {exacta: "exacta (por municipio)", unica: "única en la entidad", estimada: "estimada (reparto)", sin: "sin variante"};
  const glosarioCerteza = () => html`<dl class="mapa-glosario">
    <div><dt>Exacta</dt><dd>se conoce el municipio donde vivía cinco años antes y el Catálogo INALI ubica ahí una sola variante de su lengua.</dd></div>
    <div><dt>Única</dt><dd>solo se conoce la entidad de nacimiento y en ella el Catálogo registra una sola variante.</dd></div>
    <div><dt>Estimada</dt><dd>la entidad tiene varias variantes: sus hablantes se reparten en proporción a los hablantes de cada variante en sus municipios (Censo 2020).</dd></div>
    <div><dt>Sin variante</dt><dd>nacidos en la ciudad, en otro país o en una entidad sin registro de la lengua.</dd></div>
  </dl>`;
  // Paleta por lengua para el modo "todas las lenguas": tono fijo por posición
  // en el catálogo, para que cada lengua conserve su color en las dos vistas.
  const LENGUAS_CAT = catalogo.filter((c) => c.clave < "8000").map((c) => c.clave);
  const colorLengua = (clave) => { const i = LENGUAS_CAT.indexOf(clave); return i < 0 ? GRIS_VARIANTE : `hsl(${Math.round((i * 360) / LENGUAS_CAT.length + 20) % 360}, 58%, ${i % 2 ? 42 : 55}%)`; };
  function variantesDe(lengua) {
    const nombreClin = catNombre.get(lengua)?.clin;
    return clin.filter((r) => normal(r.agrupacion) === normal(nombreClin));
  }
  function asignacion(e) {
    return variantesCiudad.filter((r) => r.anio === e.anio && r.lengua === e.lengua);
  }
  // Paleta de N tonos para las variantes de una lengua: tonos repartidos en
  // el círculo cromático, alternando dos luminosidades para que vecinos
  // consecutivos se distingan también por claridad. Con treinta categorías
  // ningún esquema es seguro para daltonismo; el nombre va siempre en el
  // globo y en la leyenda, y la metodología lo dice. hsl y no oklch: MapLibre
  // solo acepta nombres, hex, rgb y hsl.
  function paletaVariantes(n) {
    return Array.from({length: n}, (_, i) => `hsl(${Math.round((i * 360) / n + 20) % 360}, 58%, ${i % 2 ? 42 : 55}%)`);
  }
  // Un color por variante, fijo por su posición en el Catálogo, para que la
  // misma variante tenga el mismo tono en la lista, en las flechas de origen
  // y en el mapa de la lengua. Lo no asignable va en gris.
  function coloresVariantes(lengua) {
    const orden = variantesDe(lengua).map((r) => r.variante);
    const paleta = paletaVariantes(orden.length);
    return new Map(orden.map((v, i) => [v, paleta[i]]));
  }

  function pintarVariantes(e, destacar = null) {
    const lista = variantesDe(e.lengua);
    const filas = asignacion(e);
    const colores = coloresVariantes(e.lengua);
    const nombre = catNombre.get(e.lengua)?.nombre ?? e.lengua;
    const porVariante = new Map();
    for (const r of filas) {
      if (!r.variante) continue;
      const d = porVariante.get(r.variante) ?? {exacta: 0, unica: 0, estimada: 0};
      d[r.certeza] = (d[r.certeza] ?? 0) + r.num;
      porVariante.set(r.variante, d);
    }
    const sin = filas.filter((r) => r.certeza === "sin").reduce((s, r) => s + r.num, 0);
    const enCiudad = filas.filter((r) => r.certeza === "sin" && r.cve_ent === "009").reduce((s, r) => s + r.num, 0);
    const orden = lista.slice().sort((a, b) => {
      const ta = porVariante.get(a.variante), tb = porVariante.get(b.variante);
      return ((tb ? tb.exacta + tb.unica + tb.estimada : 0) - (ta ? ta.exacta + ta.unica + ta.estimada : 0));
    });
    variantes.replaceChildren(html`<h3 class="mapa-variantes-titulo">Variantes del ${nombre} en la ciudad, ${e.anio}</h3>
      <p class="mapa-variantes-nota">El Catálogo INALI 2008 registra ${lista.length} ${lista.length === 1 ? "variante" : "variantes"}; el Censo no pregunta cuál habla cada persona. La variante se infiere por el lugar de origen con el método del INALI: <strong>exacta</strong> si se conoce el municipio y ahí hay una sola variante, <strong>única</strong> si la entidad de nacimiento tiene una sola, <strong>estimada</strong> si tiene varias (reparto por los hablantes de cada una). ${entero(sin)} hablantes quedan sin variante (${entero(enCiudad)} nacidos en la ciudad).</p>
      ${glosarioCerteza()}
      <ul class="mapa-variantes-lista">${orden.map((r) => {
        const d = porVariante.get(r.variante);
        const total = d ? d.exacta + d.unica + d.estimada : 0;
        const partes = d ? [["exacta", d.exacta], ["unica", d.unica], ["estimada", d.estimada]].filter(([, n]) => n >= 0.5).map(([k, n]) => `${entero(n)} ${CERTEZA[k].split(" ")[0]}`).join(" · ") : "";
        const clase = destacar ? (destacar.has(r.variante) ? "es-destacada" : "es-tenue") : "";
        return html`<li class=${clase}>
          <span class="mapa-variante-chip" style="background:${colores.get(r.variante) ?? GRIS_VARIANTE}" aria-hidden="true"></span>
          <span class="mapa-variante-nombre">${r.variante}${total >= 0.5 ? html` <span class="mapa-variante-total">${entero(total)}</span>` : ""}</span>
          <span class="mapa-variante-auto">${r.autodenominacion.split("|")[0].trim()}</span>
          <span class="mapa-variante-donde">${r.entidades.split("|").map((x) => x.trim().toLowerCase()).join(", ")}${partes ? ` · ${partes}` : " · sin hablantes asignados"}</span>
        </li>`;
      })}</ul>`);
  }

  function pintarOrigen(e, etiqueta) {
    const todas = e.lengua === "todas";
    const filas = variantesCiudad.filter((r) => r.anio === e.anio && (todas || r.lengua === e.lengua) && r.cve_ent && ENTIDAD[r.cve_ent] && r.cve_ent !== "009");
    // Color de cada línea: por variante (una lengua) o por lengua (todas).
    let colores;
    if (todas) {
      const porLengua = new Map();
      for (const r of filas) porLengua.set(r.lengua, (porLengua.get(r.lengua) ?? 0) + r.num);
      colores = new Map([...porLengua.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => [k, colorLengua(k)]));
    } else {
      colores = coloresVariantes(e.lengua);
    }
    // Por entidad se dibuja una flecha con color por cada una de sus categorías
    // mayores (hasta TOPE_FLECHAS) y una gris con el resto sumado: Oaxaca tiene
    // 81 variantes del mixteco y una línea por cada una abría un abanico hasta
    // el mar. La leyenda lista solo las variantes que recibieron flecha.
    const TOPE_FLECHAS = 5;
    const usadas = new Map();
    const porIso = new Map(geoEntidades.features.map((f) => [f.properties.id, f]));
    const cdmx = puntoInterior(porIso.get("MX-CMX"));
    const valores = new Map();
    for (const f of geoEntidades.features) mapa.setFeatureState({source: "entidades", id: f.properties.id}, {valor: null});
    // Por entidad: total, y desglose por lengua y por variante.
    const porEnt = new Map();
    const totalOrigen = filas.reduce((s, r) => s + r.num, 0);
    for (const r of filas) {
      const d = porEnt.get(r.cve_ent) ?? {num: 0, lenguas: new Map(), variantes: new Map()};
      d.num += r.num;
      d.lenguas.set(r.lengua, (d.lenguas.get(r.lengua) ?? 0) + r.num);
      if (r.variante) {
        const k = todas ? `${catNombre.get(r.lengua)?.nombre ?? r.lengua}: ${r.variante}` : r.variante;
        d.variantes.set(k, (d.variantes.get(k) ?? 0) + r.num);
      }
      porEnt.set(r.cve_ent, d);
    }
    const max = Math.max(...[...porEnt.values()].map((d) => d.num), 1);
    const features = [];
    for (const [ent, d] of porEnt) {
      const iso = ENTIDAD[ent][0];
      const f = porIso.get(iso);
      mapa.setFeatureState({source: "entidades", id: iso}, {valor: d.num});
      const vars = [...d.variantes.entries()].sort((a, b) => b[1] - a[1]);
      const lens = [...d.lenguas.entries()].sort((a, b) => b[1] - a[1]);
      const detalle = todas
        ? [...lens.slice(0, 3).map(([k, n]) => `${catNombre.get(k)?.nombre ?? k}: ${entero(n)} hablantes`), ...(vars.length ? [`Variantes probables: ${vars.slice(0, 3).map(([v, n]) => `${v} (${entero(n)})`).join("; ")}`] : [])]
        : (vars.length ? vars.slice(0, 4).map(([v, n]) => `${v}: ${entero(n)} (variante probable)`) : ["Sin registro del catálogo en esta entidad"]);
      valores.set(iso, {num: d.num, detalle});
      if (!f) continue;
      const base = todas ? lens : vars;
      const conColor = base.filter(([k]) => colores.has(k)).slice(0, TOPE_FLECHAS);
      const elegidas = new Set(conColor.map(([k]) => k));
      for (const [k, n] of conColor) usadas.set(k, (usadas.get(k) ?? 0) + n);
      const resto = base.filter(([k]) => !elegidas.has(k)).reduce((s, [, n]) => s + n, 0);
      const trazos = [...conColor, ...(resto > 0 || !conColor.length ? [[null, resto || d.num]] : [])];
      // Las líneas de una misma entidad comparten origen y destino y se
      // separan por curvatura (abanico en el tramo medio, no en el origen).
      const a = puntoInterior(f);
      trazos.forEach(([k, n], idx) => {
        const curva = 0.18 + (idx - (trazos.length - 1) / 2) * 0.07;
        features.push({type: "Feature", properties: {ent: iso, num: n, color: colores.get(k) ?? GRIS_VARIANTE,
          cat: k ?? "__otras__", tipo: todas ? "Lengua" : "Variante probable", nombreEnt: f.properties.name, totalEnt: d.num, pct: totalOrigen ? 100 * n / totalOrigen : 0,
          etiqueta: k == null ? (todas ? "Otras lenguas" : "Variantes menores o sin registro") : (todas ? (catNombre.get(k)?.nombre ?? k) : k),
          grosor: 1.2 + 9 * Math.sqrt(n / max)}, geometry: {type: "LineString", coordinates: arco(a, cdmx, curva)}});
      });
    }
    features.sort((a, b) => (a.properties.color === GRIS_VARIANTE ? 0 : 1) - (b.properties.color === GRIS_VARIANTE ? 0 : 1));
    for (const f of features) f.properties.opacidad = f.properties.color === GRIS_VARIANTE ? 0.45 : 0.9;
    mapa.getSource("flujos").setData({type: "FeatureCollection", features});
    mapa.getSource("destino").setData({type: "FeatureCollection", features: [{type: "Feature", properties: {total: totalOrigen, entidades: porEnt.size, radio: Math.min(15, 5 + Math.sqrt(totalOrigen) / 30)}, geometry: {type: "Point", coordinates: cdmx}}]});
    resaltarFlujos(null);
    // Cortes fijos por lengua a través de las ediciones: con cuantiles de la
    // vista, cambiar de año recoloreaba las entidades aunque no cambiaran.
    const claveOrigen = `origen|${e.lengua}`;
    if (!cacheCortes.has(claveOrigen)) {
      const suma = new Map();
      for (const r of variantesCiudad) if ((todas || r.lengua === e.lengua) && r.cve_ent && ENTIDAD[r.cve_ent] && r.cve_ent !== "009") suma.set(`${r.anio}|${r.cve_ent}`, (suma.get(`${r.anio}|${r.cve_ent}`) ?? 0) + r.num);
      cacheCortes.set(claveOrigen, cortesPorCuantil([...suma.values()], 5));
    }
    const cortes = cacheCortes.get(claveOrigen);
    mapa.setPaintProperty("entidades-relleno", "fill-color", expresionColor("valor", cortes, RAMPA_MORADA, "feature-state"));
    visibles(["entidades-relleno", "entidades-linea", "entidades-hover", "flujos-halo", "flujos-linea", "flujos-flecha", "flujos-foco", "flujos-destino"]);
    vistaActual = {unidad: "entidad", etiqueta, valores, cruce: null, poblacion: e.poblacion, campo: null, flujos: true};
    const nombre = todas ? "lengua indígena" : (catNombre.get(e.lengua)?.nombre ?? e.lengua);
    const total = filas.reduce((s, r) => s + r.num, 0);
    const enCiudad = variantesCiudad.filter((r) => r.anio === e.anio && (todas || r.lengua === e.lengua) && r.cve_ent === "009").reduce((s, r) => s + r.num, 0);
    // Leyenda: solo las categorías que recibieron flecha con color, de mayor a
    // menor por hablantes; por lengua con "todas", por variante con una lengua.
    const chips = [...usadas.entries()].sort((a, b) => b[1] - a[1])
      .map(([k, ]) => html`<li class="mapa-chip-activo" tabindex="0" title="Resaltar sus flujos"
        onmouseenter=${() => resaltarFlujos(["==", ["get", "cat"], k])} onmouseleave=${() => resaltarFlujos(null)}
        onfocus=${() => resaltarFlujos(["==", ["get", "cat"], k])} onblur=${() => resaltarFlujos(null)}>
        <span class="mapa-variante-chip" style="background:${colores.get(k)}" aria-hidden="true"></span>${todas ? (catNombre.get(k)?.nombre ?? k) : k}</li>`);
    enReposo = () => `<div class="globo-titulo">Hablantes de ${escapar(nombre)} en la ciudad · ${e.anio}</div>
      <div class="mapa-cifra-valor">${entero(total)}</div><div class="mapa-cifra-nota">nacidos en otra entidad · ${entero(enCiudad)} nacidos en la ciudad</div>
      <div class="mapa-tarjeta-pista">Pasa el cursor por una entidad; haz clic para fijarla y comparar</div>`;
    globo.reposo();
    leyendaCaja.replaceChildren(
      leyenda({cortes, titulo: `Hablantes de ${nombre} nacidos en la entidad`, formato: (x) => punto(Math.round(x)), notaSinDato: "Sin hablantes en la muestra"}),
      html`<ul class=${`mapa-variantes-leyenda${chips.length > 8 ? " mapa-variantes-leyenda-larga" : ""}`}><li class="mapa-variantes-leyenda-titulo">${todas ? "Color de la flecha: lengua (las diez mayores)" : "Color de la flecha: variante probable (hasta cinco por entidad)"}. Pasa el cursor por una para ver solo sus flujos.</li>${chips}<li><span class="mapa-variante-chip" style="background:${GRIS_VARIANTE}" aria-hidden="true"></span>${todas ? "Otras lenguas" : "Variantes menores de cada entidad o sin registro"}</li></ul>`,
      todas ? "" : glosarioCerteza());
    resumen.replaceChildren(html`<h2 class="mapa-titulo">De dónde vienen quienes hablan ${nombre}</h2>
      <p class="mapa-definicion">Hablantes que viven en la Ciudad de México, según su entidad de nacimiento. Cada flecha va de la entidad a la ciudad; su grosor es el número de personas y su color, ${todas ? "la lengua" : "la variante probable"}. <span class="mapa-fuente">${FUENTE_ANIO[e.anio]}, muestra; variantes según el Catálogo INALI 2008.</span></p>`);
  }

  let municipiosPintados = [];
  function pintarLengua(e) {
    const todas = e.lengua === "todas";
    const nombre = todas ? "las lenguas indígenas" : (catNombre.get(e.lengua)?.nombre ?? e.lengua);
    // Catálogo: variantes por municipio (de la lengua elegida, o de todas).
    const catMun = new Map();
    for (const r of clinMunicipios) {
      if (!todas && r.lengua !== e.lengua) continue;
      const k = `${r.cve_ent.slice(-2)}${r.cve_mun}`;
      const m = catMun.get(k) ?? [];
      m.push({lengua: r.lengua, variante: r.variante});
      catMun.set(k, m);
    }
    let colores, orden;
    if (todas) {
      orden = LENGUAS_CAT;
      colores = new Map(orden.map((k) => [k, colorLengua(k)]));
    } else {
      colores = coloresVariantes(e.lengua);
      orden = [...colores.keys()];
    }
    // Con todas las lenguas, el municipio se pinta por la lengua con más
    // hablantes según el Censo 2020, y el globo lista las variantes del catálogo.
    const dominante = new Map();
    if (todas) for (const r of municipiosLenguas) if (!dominante.has(r.cve)) dominante.set(r.cve, r);
    for (const k of municipiosPintados) mapa.setFeatureState({source: "municipios", sourceLayer: "municipios", id: k}, {color: null});
    const valores = new Map();
    const claves = new Set([...catMun.keys(), ...(todas ? dominante.keys() : [])]);
    for (const k of claves) {
      const cat = catMun.get(k) ?? [];
      let color, detalle;
      if (todas) {
        const d = dominante.get(k);
        const lenguaColor = d?.lengua ?? cat[0]?.lengua;
        color = lenguaColor ? colores.get(lenguaColor) : null;
        detalle = [
          ...(d ? [`Lengua con más hablantes: ${catNombre.get(d.lengua)?.nombre ?? d.lengua} (${entero(d.hablantes)})`] : []),
          ...(cat.length ? [`Variantes del catálogo: ${cat.map((c) => `${c.variante}`).join("; ")}`] : []),
        ];
      } else {
        color = colores.get(cat[0].variante);
        detalle = cat.map((c) => `Variante: ${c.variante}`);
      }
      if (color) mapa.setFeatureState({source: "municipios", sourceLayer: "municipios", id: k}, {color});
      valores.set(k, {detalle});
    }
    municipiosPintados = [...claves];
    visibles(["municipios-relleno", "municipios-linea", "municipios-hover", "entidades-linea"]);
    vistaActual = {unidad: "municipio", etiqueta: nombre, valores, cruce: null, poblacion: e.poblacion, campo: null};
    const totalCiudad = variantesCiudad.filter((r) => r.anio === e.anio && (todas || r.lengua === e.lengua)).reduce((s, r) => s + r.num, 0);
    enReposo = () => `<div class="globo-titulo">Dónde se ${todas ? "hablan las lenguas indígenas" : `habla el ${escapar(nombre)}`}</div>
      <div class="mapa-cifra-nota">${todas ? `${claves.size} municipios` : `${orden.length} variantes en ${claves.size} municipios`}, según el Catálogo INALI 2008${todas ? " y el Censo 2020" : ""}</div>
      <div class="mapa-cifra-valor">${entero(totalCiudad)}</div><div class="mapa-cifra-nota">hablantes en la Ciudad de México, ${e.anio}</div>
      <div class="mapa-tarjeta-pista">Pasa el cursor por un municipio para ver su ${todas ? "lengua y sus variantes" : "variante"}</div>`;
    globo.reposo();
    const listaLeyenda = todas
      ? [...new Set([...dominante.values()].map((r) => r.lengua))].map((k) => [k, catNombre.get(k)?.nombre ?? k]).sort((a, b) => a[1].localeCompare(b[1], "es"))
      : orden.map((v) => [v, v]);
    leyendaCaja.replaceChildren(html`<ul class="mapa-variantes-leyenda mapa-variantes-leyenda-larga"><li class="mapa-variantes-leyenda-titulo">${todas ? "Lengua con más hablantes en el municipio (color por lengua)" : `Variantes del ${nombre} (color por variante)`}</li>
      ${listaLeyenda.map(([k, t]) => html`<li><span class="mapa-variante-chip" style="background:${colores.get(k)}" aria-hidden="true"></span>${t}</li>`)}</ul>`);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">${todas ? "El mapa de las lenguas indígenas" : `El mapa del ${nombre}`}</h2>
      <p class="mapa-definicion">${todas
        ? "Cada municipio se pinta con la lengua indígena que más se habla en él según el Censo 2020, y el globo lista las variantes que el Catálogo del INALI ubica ahí."
        : "Cada municipio se pinta con la variante que el Catálogo de las Lenguas Indígenas Nacionales ubica ahí; donde el catálogo registra varias, se pinta la primera y el globo las lista todas."} Es el territorio de la lengua, no dónde vive hoy cada hablante. <span class="mapa-fuente">INALI, Catálogo 2008; INEGI, Censo 2020 y marco geoestadístico 2020.</span></p>`);
  }
  botonLengua.addEventListener("click", () => {
    limpiarFijadas();
    estado.lengua = !estado.lengua;
    estado.origen = false;
    mapa.fitBounds(estado.lengua ? MEXICO : CDMX, {padding: 12, duration: 600});
    pintar();
  });
  botonOrigen.addEventListener("click", () => {
    limpiarFijadas();
    estado.origen = !estado.origen;
    estado.lengua = false;
    mapa.fitBounds(estado.origen ? MEXICO : CDMX, {padding: 12, duration: 600});
    pintar();
  });
  panel.addEventListener("input", () => {
    limpiarFijadas();
    if ((estado.origen || estado.lengua) && (v().unidad !== "alcaldia" || v().poblacion !== "hablantes")) {
      estado.origen = false;
      estado.lengua = false;
      mapa.fitBounds(CDMX, {padding: 12, duration: 600});
    }
    pintar();
  });
  alCambiarModo(() => pintar());
  pintar();

  return {nodo, panel, mapa, pintar};
}
