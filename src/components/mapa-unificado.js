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
import {PALETA_VARIANTES, GRIS_VARIANTE, ORDEN_GRADO, punto, alCambiarModo} from "./base.js";
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
// Antes de 2010 solo hay hablantes de 5 años y más: se usa ese universo y la
// definición lo dice. Desde 2010, 3 años y más.
const pobSerie = (poblacion, anio) => (poblacion === "hablantes" && anio < 2010 ? "hablantes5" : POB_SERIE[poblacion]);
const FUENTE_ANIO = {1990: "Censo 1990 (INEGI)", 1995: "Conteo 1995 (INEGI)", 2000: "Censo 2000 (INEGI)", 2005: "Conteo 2005 (INEGI)",
  2010: "Censo 2010 (INEGI)", 2015: "Encuesta Intercensal 2015 (INEGI)", 2020: "Censo 2020 (INEGI)", 2025: "Encuesta Intercensal 2025 (INEGI)"};

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

// Arco suave entre dos puntos (curva cuadrática), para que las líneas de
// distintas entidades no se encimen en una sola recta al llegar a la ciudad.
function arco(a, b, n = 24) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * 0.18, cy = my + dx * 0.18;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
  }
  return pts;
}

export function mapaUnificado({serie, lenguas, origen, clin, variantesCiudad = [], catalogo, agebs, colonias,
    pmtilesManzanas, pmtilesAgebs, geoAlcaldias, geoLimite, geoEntidades}) {
  registrarProtocolo();
  const catNombre = new Map(catalogo.map((c) => [c.clave, c]));

  // Opciones de lengua: las de la última muestra, por hablantes en la ciudad.
  const ultimo = Math.max(...lenguas.map((r) => r.anio));
  const opcionesLengua = lenguas
    .filter((r) => r.anio === ultimo && r.nivel === "entidad" && r.sexo === "Total" && r.lengua < "8000")
    .sort((a, b) => b.num - a.num)
    .map((r) => ({clave: r.lengua, etiqueta: r.lengua_nombre}));

  const aniosDe = ({unidad, poblacion, lengua}) => {
    if (unidad !== "alcaldia") return [2020];
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
      : serie.filter((r) => r.poblacion === pobSerie(poblacion, anio) && r.anio === anio && r.nivel === "alcaldia");
    return filas.some((r) => r.sexo === "Mujeres");
  };

  const panel = panelMapa({lenguas: opcionesLengua, aniosDe, sexoDe});
  const contenedor = html`<div class="mapa-lienzo" role="region" aria-label="Mapa"></div>`;
  // Dentro del lienzo: la leyenda abajo a la derecha y una tarjeta de lectura
  // arriba a la izquierda, que muestra la cifra de la ciudad en reposo y la
  // unidad bajo el cursor al pasar el mouse. Sustituye al globo que seguía al
  // cursor y tapaba el mapa.
  const tarjeta = html`<div class="mapa-tarjeta" role="status" aria-live="polite"></div>`;
  const leyendaCaja = html`<div class="mapa-leyenda-caja"></div>`;
  contenedor.append(tarjeta, leyendaCaja);
  const lateral = html`<aside class="mapa-lateral"></aside>`;
  const resumen = html`<div class="mapa-resumen"></div>`;
  const botonOrigen = html`<button type="button" class="mapa-boton-origen" hidden>Ver de dónde vienen</button>`;
  const variantes = html`<div class="mapa-variantes" hidden></div>`;
  lateral.append(panel, resumen, botonOrigen, variantes);
  const nodo = html`<div class="mapa-pantalla">${contenedor}${lateral}</div>`;

  const estado = {origen: false, cargado: false};
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
  const globo = {
    mostrar(htmlTexto) { tarjeta.innerHTML = htmlTexto; tarjeta.classList.add("es-hover"); },
    reposo() { tarjeta.innerHTML = enReposo(); tarjeta.classList.remove("es-hover"); },
  };

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

  mapa.on("load", () => {
    mapa.addSource("manzanas", {type: "vector", url: `pmtiles://${pmtilesManzanas}`});
    mapa.addSource("agebs", {type: "vector", url: `pmtiles://${pmtilesAgebs}`});
    mapa.addSource("alcaldias", {type: "geojson", data: geoAlcaldias, promoteId: "CVEGEO"});
    mapa.addSource("entidades", {type: "geojson", data: geoEntidades, promoteId: "id"});
    mapa.addSource("flujos", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    if (geoLimite) mapa.addSource("cdmx-limite", {type: "geojson", data: geoLimite});

    capasTesela("manzanas", "manzanas", 13, 12);
    capasTesela("agebs", "agebs", 9, 9);
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
    mapa.addLayer({id: "flujos-linea", type: "line", source: "flujos", layout: {visibility: "none", "line-cap": "round"},
      paint: {"line-color": ["get", "color"], "line-width": ["get", "grosor"], "line-opacity": ["coalesce", ["get", "opacidad"], 0.85]}});

    for (const capa of ["manzanas-relleno", "agebs-relleno", "alcaldias-relleno", "entidades-relleno"]) {
      mapa.on("mousemove", capa, (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null) return;
        mapa.getCanvas().style.cursor = "pointer";
        const ref = {source: f.source, sourceLayer: f.sourceLayer, id: f.id};
        if (!activa || activa.id !== f.id || activa.source !== f.source) {
          apagarActiva();
          activa = ref;
          mapa.setFeatureState(ref, {activa: true});
        }
        globo.mostrar(globoDe(capa, f));
      });
      mapa.on("mouseleave", capa, () => { mapa.getCanvas().style.cursor = ""; apagarActiva(); globo.reposo(); });
    }
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
      : serie.filter((r) => r.anio === anio && r.poblacion === pobSerie(poblacion, anio) && r.sexo === sexo && r.nivel === nivel);
  }

  // Cortes FIJOS por indicador a lo largo de los años (lección 74): se miden
  // sobre todas las alcaldías, años y sexos de ese indicador.
  function cortesAlcaldia({poblacion, lengua}) {
    const clave = `alc|${poblacion}|${lengua}`;
    if (!cacheCortes.has(clave)) {
      const filas = lengua !== "todas"
        ? lenguas.filter((r) => r.lengua === lengua && r.nivel === "alcaldia")
        : serie.filter((r) => r.poblacion === pobSerie(poblacion, r.anio) && r.nivel === "alcaldia");
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
      const tabla = e.unidad === "manzana" ? colonias : agebs;
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
      if (!d) return `<div class="globo-titulo">${escapar(p.name)}</div><div class="globo-sub">Sin hablantes de esta lengua nacidos aquí en la muestra</div>`;
      return `<div class="globo-titulo">${escapar(p.name)}</div>
        <table class="globo-tabla"><tr><th>Hablantes nacidos aquí</th><td>${entero(d.num)}</td></tr>
        <tr><th>Variante probable</th><td>${escapar(d.variante)}</td></tr></table>`;
    }
    if (capa === "alcaldias-relleno") {
      const d = e.valores.get(f.id);
      return `<div class="globo-titulo">${escapar(p.alcaldia)}</div>
        <table class="globo-tabla"><tr><th>${escapar(e.etiqueta)}</th><td>${d ? pct(d.pct) : "sin dato"}</td></tr>
        <tr><th>Personas</th><td>${d ? `${entero(d.num)} de ${entero(d.den)}` : "sin dato"}</td></tr></table>`;
    }
    const cruce = e.cruce ? cruceDe(e.cruce) : null;
    const titulo = capa === "manzanas-relleno" ? escapar(p.colonia ?? "Sin colonia") : `AGEB ${escapar(String(p.cve_ageb ?? "").slice(-4))}`;
    const valor = cruce?.categorias ? escapar(p[cruce.texto] ?? "sin grado") : pct(p[e.campo]);
    const presencia = e.cruce ? `<tr><th>${escapar(poblacionDe(e.poblacion).corto)}</th><td>${pct(p[poblacionDe(e.poblacion).tesela[e.unidad]])}</td></tr>` : "";
    return `<div class="globo-titulo">${titulo}</div><div class="globo-sub">${escapar(p.alcaldia)}</div>
      <table class="globo-tabla"><tr><th>${escapar(e.etiqueta)}</th><td>${valor}</td></tr>${presencia}
      <tr><th>Población</th><td>${entero(p.POBTOT)}</td></tr></table>`;
  }

  // ---------------------------------------------------------------- pintado
  function visibles(ids) {
    const todas = ["manzanas-relleno", "manzanas-borde", "manzanas-hover", "agebs-relleno", "agebs-borde", "agebs-hover",
      "alcaldias-relleno", "alcaldias-halo", "alcaldias-linea", "alcaldias-hover", "cdmx-limite-halo", "cdmx-limite",
      "entidades-relleno", "entidades-linea", "entidades-hover", "flujos-linea"];
    for (const id of todas) if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", ids.includes(id) ? "visible" : "none");
  }

  function pintar() {
    const e = v();
    const pob = poblacionDe(e.poblacion);
    const cruce = e.cruce ? cruceDe(e.cruce) : null;
    const etiqueta = cruce ? cruce.etiqueta : e.lengua !== "todas" ? `Hablan ${catNombre.get(e.lengua)?.nombre ?? e.lengua}` : pob.corto;
    const conOrigen = e.unidad === "alcaldia" && e.lengua !== "todas";
    botonOrigen.hidden = !conOrigen;
    if (!conOrigen) estado.origen = false;
    botonOrigen.textContent = estado.origen ? "Volver a la ciudad" : "Ver de dónde vienen";
    variantes.hidden = !conOrigen;
    if (conOrigen) pintarVariantes(e);
    // En la vista de origen el sexo no aplica (los flujos no lo desglosan).
    panel.mostrar("sexo", !estado.origen && panel.aplica("sexo"));
    if (!estado.cargado) return;

    if (estado.origen) return pintarOrigen(e, etiqueta);

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
      vistaActual = {unidad: "alcaldia", etiqueta, valores, cruce: null, poblacion: e.poblacion, campo: null};
      const ent = filasAlcaldia(e, "entidad")[0];
      pintarResumen({e, etiqueta, cortes, ent, muestra: ent?.cota === "muestra"});
      return;
    }

    const id = CAPAS_UNIDAD[e.unidad];
    const campo = campoTesela(e);
    const cortes = cortesTesela(e, campo);
    mapa.setPaintProperty(`${id}-relleno`, "fill-color", expresionColor(campo, cortes));
    const condiciones = [];
    if (e.umbral > 0) condiciones.push([">=", ["to-number", ["get", pob.tesela[e.unidad]]], e.umbral]);
    if (e.unidad === "manzana" && e.ambito === "pueblos") condiciones.push(["==", ["to-string", ["get", "pueblo_originario"]], "True"]);
    for (const c of [`${id}-relleno`, `${id}-borde`]) mapa.setFilter(c, condiciones.length ? ["all", ...condiciones] : null);
    mapa.setPaintProperty(`${id}-relleno`, "fill-opacity", e.umbral > 0 ? 0.95 : ["interpolate", ["linear"], ["zoom"], 9, 0.55, 12, 0.75, 14, 0.9]);
    visibles([`${id}-relleno`, `${id}-borde`, `${id}-hover`, "alcaldias-halo", "alcaldias-linea", "cdmx-limite-halo", "cdmx-limite"]);
    vistaActual = {unidad: e.unidad, etiqueta, valores: new Map(), cruce: e.cruce, poblacion: e.poblacion, campo};
    const ent = serie.find((r) => r.anio === 2020 && r.nivel === "entidad" && r.poblacion === pobSerie(e.poblacion, 2020) && r.sexo === (pob.porSexo ? e.sexo : "Total"));
    pintarResumen({e, etiqueta, cortes, ent: cruce ? null : ent, muestra: false, cruce});
  }

  function pintarResumen({e, etiqueta, cortes, ent, muestra, cruce = null}) {
    const unidad = UNIDADES.find((u) => u.clave === e.unidad);
    const pob = poblacionDe(e.poblacion);
    const tituloLeyenda = cruce?.categorias ? cruce.etiqueta
      : `${etiqueta} (% de ${cruce ? (cruce.unidad === "viviendas" ? "las viviendas" : "la población") : "la población"} de cada ${unidad.singular})`
        + (e.umbral > 0 ? `, donde ${pob.corto.toLowerCase()} es ${e.umbral} % o más` : "");
    const ley = leyenda({cortes, titulo: tituloLeyenda,
      formato: cruce?.categorias ? (x) => ORDEN_GRADO[x - 1] : (x) => x.toFixed(cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1) + " %",
      abierta: !cruce?.categorias,
      notaSinDato: cruce?.categorias ? "Sin grado publicado" : "Sin dato publicado (INEGI suprime la cifra por confidencialidad)"});
    // La cifra de la ciudad vive en la tarjeta del mapa, como estado de reposo.
    enReposo = () => ent
      ? `<div class="globo-titulo">Ciudad de México · ${e.anio}</div><div class="globo-sub">${escapar(etiqueta)}</div>
         <div class="mapa-cifra-valor">${pct(100 * ent.num / ent.den)}${muestra && ent.ee ? `<span class="mapa-cifra-error"> ± ${(100 * ent.ee * 1.96).toFixed(1)}</span>` : ""}</div>
         <div class="mapa-cifra-nota">${entero(ent.num)} personas${muestra ? " · estimación de encuesta" : ""}</div>
         <div class="mapa-tarjeta-pista">Pasa el cursor por una ${unidad.singular} para ver su cifra</div>`
      : `<div class="globo-titulo">${escapar(etiqueta)}</div><div class="mapa-tarjeta-pista">Pasa el cursor por una ${unidad.singular} para ver su cifra</div>`;
    globo.reposo();
    const cifra = "";
    const fuente = e.unidad === "alcaldia" ? FUENTE_ANIO[e.anio] : "Censo 2020 (INEGI), resultados por AGEB y manzana";
    // El universo de la definición es el de la fila (5 años y más antes de
    // 2010; autoadscripción de 5+ en 2000 y de 3+ en 2010).
    let definicion = cruce ? cruce.definicion : pob.definicion;
    if (!cruce && ent?.universo && !/hablantes/i.test(ent.universo)) definicion = definicion.replace(/Personas de 3 años y más/, ent.universo.replace(/^Población/, "Personas")).replace(/sobre la población de 3 años y más/, `sobre la ${ent.universo.toLowerCase()}`);
    if (!cruce && e.anio === 2000 && ["autoads", "todas", "ambas"].includes(e.poblacion)) definicion += " En 2000 la pregunta era distinta: si la persona era náhuatl, maya, zapoteca, mixteca o de otro grupo indígena.";
    const aviso = e.umbral > 0 && e.unidad === "manzana"
      ? html`<p class="mapa-aviso">Solo las manzanas con ${e.umbral} % o más: son manzanas sueltas, acerca el mapa para verlas o cambia a AGEB.</p>` : "";
    const avisoTodas = e.poblacion === "todas" ? html`<p class="mapa-aviso">Una persona cuenta una sola vez aunque hable una lengua y además se considere indígena.</p>` : "";
    leyendaCaja.replaceChildren(ley);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">${etiqueta}</h2>
      <p class="mapa-definicion">${definicion} <span class="mapa-fuente">${fuente}.</span></p>${cifra}${aviso}${avisoTodas}`);
  }

  // ---------------------------------------------------------------- origen
  // La variante viene ya asignada por scripts/loaders/variantes.py con tres
  // niveles de certeza (exacta por municipio, única en la entidad, estimada
  // por reparto) y "sin" para nacidos en la ciudad o sin registro. Aquí solo
  // se agrupa y se pinta.
  const CERTEZA = {exacta: "exacta (por municipio)", unica: "única en la entidad", estimada: "estimada (reparto)", sin: "sin variante"};
  function variantesDe(lengua) {
    const nombreClin = catNombre.get(lengua)?.clin;
    return clin.filter((r) => normal(r.agrupacion) === normal(nombreClin));
  }
  function asignacion(e) {
    return variantesCiudad.filter((r) => r.anio === e.anio && r.lengua === e.lengua);
  }
  // Tres tonos para las tres variantes con más hablantes en la ciudad; el
  // resto y lo no asignable van en gris.
  function coloresVariantes(filas) {
    const suma = new Map();
    for (const r of filas) if (r.variante) suma.set(r.variante, (suma.get(r.variante) ?? 0) + r.num);
    const top = [...suma.entries()].sort((a, b) => b[1] - a[1]).slice(0, PALETA_VARIANTES.length);
    return new Map(top.map(([nombre], i) => [nombre, PALETA_VARIANTES[i]]));
  }

  function pintarVariantes(e) {
    const lista = variantesDe(e.lengua);
    const filas = asignacion(e);
    const colores = coloresVariantes(filas);
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
      <ul class="mapa-variantes-lista">${orden.map((r) => {
        const d = porVariante.get(r.variante);
        const total = d ? d.exacta + d.unica + d.estimada : 0;
        const partes = d ? [["exacta", d.exacta], ["unica", d.unica], ["estimada", d.estimada]].filter(([, n]) => n >= 0.5).map(([k, n]) => `${entero(n)} ${CERTEZA[k].split(" ")[0]}`).join(" · ") : "";
        return html`<li>
          <span class="mapa-variante-chip" style="background:${colores.get(r.variante) ?? GRIS_VARIANTE}" aria-hidden="true"></span>
          <span class="mapa-variante-nombre">${r.variante}${total >= 0.5 ? html` <span class="mapa-variante-total">${entero(total)}</span>` : ""}</span>
          <span class="mapa-variante-auto">${r.autodenominacion.split("|")[0].trim()}</span>
          <span class="mapa-variante-donde">${r.entidades.split("|").map((x) => x.trim().toLowerCase()).join(", ")}${partes ? ` · ${partes}` : " · sin hablantes asignados"}</span>
        </li>`;
      })}</ul>`);
  }

  function pintarOrigen(e, etiqueta) {
    const filas = asignacion(e).filter((r) => r.cve_ent && ENTIDAD[r.cve_ent] && r.cve_ent !== "009");
    const colores = coloresVariantes(filas);
    const porIso = new Map(geoEntidades.features.map((f) => [f.properties.id, f]));
    const cdmx = centro(porIso.get("MX-CMX"));
    const valores = new Map();
    for (const f of geoEntidades.features) mapa.setFeatureState({source: "entidades", id: f.properties.id}, {valor: null});
    // Entidad: total de hablantes nacidos ahí y sus variantes.
    const porEnt = new Map();
    for (const r of filas) {
      const d = porEnt.get(r.cve_ent) ?? {num: 0, variantes: new Map()};
      d.num += r.num;
      if (r.variante) d.variantes.set(r.variante, (d.variantes.get(r.variante) ?? 0) + r.num);
      porEnt.set(r.cve_ent, d);
    }
    const max = Math.max(...[...porEnt.values()].map((d) => d.num), 1);
    const features = [];
    for (const [ent, d] of porEnt) {
      const iso = ENTIDAD[ent][0];
      const f = porIso.get(iso);
      mapa.setFeatureState({source: "entidades", id: iso}, {valor: d.num});
      const lista = [...d.variantes.entries()].sort((a, b) => b[1] - a[1]);
      valores.set(iso, {num: d.num, variante: lista.length ? lista.slice(0, 3).map(([v, n]) => `${v} (${entero(n)})`).join("; ") + (lista.length > 3 ? "…" : "") : "sin registro del catálogo en esta entidad"});
      if (!f) continue;
      // Una línea por variante (las tres coloreadas y el resto en gris),
      // ligeramente separadas para que no se encimen.
      const trazos = lista.length ? lista : [[null, d.num]];
      trazos.forEach(([v, n], k) => {
        const a = centro(f);
        const desvio = (k - (trazos.length - 1) / 2) * 0.12;
        features.push({type: "Feature", properties: {ent: iso, num: n, color: colores.get(v) ?? GRIS_VARIANTE,
          grosor: 1 + 8 * Math.sqrt(n / max)}, geometry: {type: "LineString", coordinates: arco([a[0] + desvio, a[1] + desvio], cdmx)}});
      });
    }
    // Las grises primero y las coloreadas al final: MapLibre dibuja en orden y
    // las líneas de las tres variantes con color no deben quedar tapadas.
    features.sort((a, b) => (a.properties.color === GRIS_VARIANTE) - (b.properties.color === GRIS_VARIANTE) || a.properties.num - b.properties.num).reverse();
    features.sort((a, b) => (a.properties.color === GRIS_VARIANTE ? 0 : 1) - (b.properties.color === GRIS_VARIANTE ? 0 : 1));
    for (const f of features) f.properties.opacidad = f.properties.color === GRIS_VARIANTE ? 0.45 : 0.9;
    mapa.getSource("flujos").setData({type: "FeatureCollection", features});
    const cortes = cortesPorCuantil([...porEnt.values()].map((d) => d.num), 5);
    mapa.setPaintProperty("entidades-relleno", "fill-color", expresionColor("valor", cortes, RAMPA_MORADA, "feature-state"));
    visibles(["entidades-relleno", "entidades-linea", "entidades-hover", "flujos-linea"]);
    vistaActual = {unidad: "entidad", etiqueta, valores, cruce: null, poblacion: e.poblacion, campo: null};
    const nombre = catNombre.get(e.lengua)?.nombre ?? e.lengua;
    const total = filas.reduce((s, r) => s + r.num, 0);
    const enCiudad = asignacion(e).filter((r) => r.cve_ent === "009").reduce((s, r) => s + r.num, 0);
    const chips = [...colores.entries()].map(([n, c]) => html`<li><span class="mapa-variante-chip" style="background:${c}" aria-hidden="true"></span>${n}</li>`);
    enReposo = () => `<div class="globo-titulo">Hablantes de ${escapar(nombre)} en la ciudad · ${e.anio}</div>
      <div class="mapa-cifra-valor">${entero(total)}</div><div class="mapa-cifra-nota">nacidos en otra entidad · ${entero(enCiudad)} nacidos en la ciudad</div>
      <div class="mapa-tarjeta-pista">Pasa el cursor por una entidad</div>`;
    globo.reposo();
    leyendaCaja.replaceChildren(
      leyenda({cortes, titulo: `Hablantes de ${nombre} nacidos en la entidad`, formato: (x) => punto(Math.round(x)), notaSinDato: "Sin hablantes en la muestra"}),
      html`<ul class="mapa-variantes-leyenda"><li class="mapa-variantes-leyenda-titulo">Color de la línea: variante probable</li>${chips}<li><span class="mapa-variante-chip" style="background:${GRIS_VARIANTE}" aria-hidden="true"></span>Otras variantes o sin registro</li></ul>`);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">De dónde vienen quienes hablan ${nombre}</h2>
      <p class="mapa-definicion">Hablantes de ${nombre} que viven en la Ciudad de México, según su entidad de nacimiento. Cada línea une la entidad con la ciudad; su grosor es el número de personas y su color, la variante probable. <span class="mapa-fuente">${FUENTE_ANIO[e.anio]}, muestra; variantes según el Catálogo INALI 2008.</span></p>`);
  }

  botonOrigen.addEventListener("click", () => {
    estado.origen = !estado.origen;
    mapa.fitBounds(estado.origen ? MEXICO : CDMX, {padding: 12, duration: 600});
    pintar();
  });
  panel.addEventListener("input", () => {
    if (estado.origen && (v().unidad !== "alcaldia" || v().lengua === "todas")) {
      estado.origen = false;
      mapa.fitBounds(CDMX, {padding: 12, duration: 600});
    }
    pintar();
  });
  alCambiarModo(() => pintar());
  pintar();

  return {nodo, panel, mapa, pintar};
}
