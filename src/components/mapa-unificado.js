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
const FUENTE_ANIO = {2010: "Censo 2010 (INEGI)", 2015: "Encuesta Intercensal 2015 (INEGI)", 2020: "Censo 2020 (INEGI)", 2025: "Encuesta Intercensal 2025 (INEGI)"};

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

export function mapaUnificado({serie, lenguas, origen, clin, catalogo, agebs, colonias,
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
      : serie.filter((r) => r.poblacion === POB_SERIE[poblacion] && r.nivel === "alcaldia");
    return [...new Set(filas.map((r) => r.anio))].sort();
  };

  const panel = panelMapa({lenguas: opcionesLengua, aniosDe});
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
      paint: {"line-color": ["get", "color"], "line-width": ["get", "grosor"], "line-opacity": 0.85}});

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
      : serie.filter((r) => r.anio === anio && r.poblacion === POB_SERIE[poblacion] && r.sexo === sexo && r.nivel === nivel);
  }

  // Cortes FIJOS por indicador a lo largo de los años (lección 74): se miden
  // sobre todas las alcaldías, años y sexos de ese indicador.
  function cortesAlcaldia({poblacion, lengua}) {
    const clave = `alc|${poblacion}|${lengua}`;
    if (!cacheCortes.has(clave)) {
      const filas = lengua !== "todas"
        ? lenguas.filter((r) => r.lengua === lengua && r.nivel === "alcaldia")
        : serie.filter((r) => r.poblacion === POB_SERIE[poblacion] && r.nivel === "alcaldia");
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
    const ent = serie.find((r) => r.anio === 2020 && r.nivel === "entidad" && r.poblacion === POB_SERIE[e.poblacion] && r.sexo === (pob.porSexo ? e.sexo : "Total"));
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
    const definicion = cruce ? cruce.definicion : pob.definicion;
    const aviso = e.umbral > 0 && e.unidad === "manzana"
      ? html`<p class="mapa-aviso">Solo las manzanas con ${e.umbral} % o más: son manzanas sueltas, acerca el mapa para verlas o cambia a AGEB.</p>` : "";
    const avisoTodas = e.poblacion === "todas" ? html`<p class="mapa-aviso">Una persona cuenta una sola vez aunque hable una lengua y además se considere indígena.</p>` : "";
    leyendaCaja.replaceChildren(ley);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">${etiqueta}</h2>
      <p class="mapa-definicion">${definicion} <span class="mapa-fuente">${fuente}.</span></p>${cifra}${aviso}${avisoTodas}`);
  }

  // ---------------------------------------------------------------- origen
  function variantesDe(lengua) {
    const nombreClin = catNombre.get(lengua)?.clin;
    return clin.filter((r) => normal(r.agrupacion) === normal(nombreClin));
  }
  function varianteProbable(lengua, ent) {
    const nombreEnt = normal(ENTIDAD[ent]?.[1]);
    const cands = variantesDe(lengua).filter((r) => r.entidades.split("|").map(normal).includes(nombreEnt));
    if (cands.length === 1) return {texto: cands[0].variante, variante: cands[0].variante};
    if (!cands.length) return {texto: "sin registro del catálogo en esta entidad", variante: null};
    return {texto: `una de ${cands.length} variantes de la entidad`, variante: null};
  }
  function datosOrigen(e) {
    const filas = origen.filter((r) => r.anio === e.anio && r.lengua === e.lengua && r.tipo === "nacimiento" && ENTIDAD[r.ent] && r.ent !== "009");
    return filas.map((r) => ({...r, ...varianteProbable(e.lengua, r.ent)}));
  }
  function coloresVariantes(filas) {
    const suma = new Map();
    for (const r of filas) if (r.variante) suma.set(r.variante, (suma.get(r.variante) ?? 0) + r.num);
    const top = [...suma.entries()].sort((a, b) => b[1] - a[1]).slice(0, PALETA_VARIANTES.length);
    return new Map(top.map(([nombre], i) => [nombre, PALETA_VARIANTES[i]]));
  }

  function pintarVariantes(e) {
    const lista = variantesDe(e.lengua);
    const filas = datosOrigen(e);
    const colores = coloresVariantes(filas);
    const nombre = catNombre.get(e.lengua)?.nombre ?? e.lengua;
    const nacidos = new Map();
    for (const r of filas) if (r.variante) nacidos.set(r.variante, (nacidos.get(r.variante) ?? 0) + r.num);
    variantes.replaceChildren(html`<h3 class="mapa-variantes-titulo">Variantes del ${nombre}</h3>
      <p class="mapa-variantes-nota">El Catálogo INALI 2008 registra ${lista.length} ${lista.length === 1 ? "variante" : "variantes"}. El Censo no pregunta cuál habla cada persona: la <strong>variante probable</strong> es la que el catálogo ubica en su entidad de nacimiento, cuando ahí hay una sola.</p>
      <ul class="mapa-variantes-lista">${lista.map((r) => html`<li>
        <span class="mapa-variante-chip" style="background:${colores.get(r.variante) ?? GRIS_VARIANTE}" aria-hidden="true"></span>
        <span class="mapa-variante-nombre">${r.variante}</span>
        <span class="mapa-variante-auto">${r.autodenominacion.split("|")[0].trim()}</span>
        <span class="mapa-variante-donde">${r.entidades.split("|").map((x) => x.trim().toLowerCase()).join(", ")}${nacidos.has(r.variante) ? ` · ${entero(nacidos.get(r.variante))} hablantes en la ciudad nacidos ahí` : ""}</span>
      </li>`)}</ul>`);
  }

  function pintarOrigen(e, etiqueta) {
    const filas = datosOrigen(e);
    const colores = coloresVariantes(filas);
    const porIso = new Map(geoEntidades.features.map((f) => [f.properties.id, f]));
    const cdmx = centro(porIso.get("MX-CMX"));
    const valores = new Map();
    for (const f of geoEntidades.features) mapa.setFeatureState({source: "entidades", id: f.properties.id}, {valor: null});
    const max = Math.max(...filas.map((r) => r.num), 1);
    const features = [];
    for (const r of filas) {
      const iso = ENTIDAD[r.ent][0];
      valores.set(iso, {num: r.num, variante: r.texto});
      mapa.setFeatureState({source: "entidades", id: iso}, {valor: r.num});
      const f = porIso.get(iso);
      if (!f) continue;
      features.push({type: "Feature", properties: {ent: iso, num: r.num, color: colores.get(r.variante) ?? GRIS_VARIANTE,
        grosor: 1 + 8 * Math.sqrt(r.num / max)}, geometry: {type: "LineString", coordinates: arco(centro(f), cdmx)}});
    }
    features.sort((a, b) => b.properties.num - a.properties.num);
    mapa.getSource("flujos").setData({type: "FeatureCollection", features});
    const cortes = cortesPorCuantil(filas.map((r) => r.num), 5);
    mapa.setPaintProperty("entidades-relleno", "fill-color", expresionColor("valor", cortes, RAMPA_MORADA, "feature-state"));
    visibles(["entidades-relleno", "entidades-linea", "entidades-hover", "flujos-linea"]);
    vistaActual = {unidad: "entidad", etiqueta, valores, cruce: null, poblacion: e.poblacion, campo: null};
    const nombre = catNombre.get(e.lengua)?.nombre ?? e.lengua;
    const total = filas.reduce((s, r) => s + r.num, 0);
    const enCiudad = origen.find((r) => r.anio === e.anio && r.lengua === e.lengua && r.tipo === "nacimiento" && r.ent === "009")?.num ?? 0;
    const chips = [...colores.entries()].map(([n, c]) => html`<li><span class="mapa-variante-chip" style="background:${c}" aria-hidden="true"></span>${n}</li>`);
    enReposo = () => `<div class="globo-titulo">Hablantes de ${escapar(nombre)} en la ciudad · ${e.anio}</div>
      <div class="mapa-cifra-valor">${entero(total)}</div><div class="mapa-cifra-nota">nacidos en otra entidad · ${entero(enCiudad)} nacidos en la ciudad</div>
      <div class="mapa-tarjeta-pista">Pasa el cursor por una entidad</div>`;
    globo.reposo();
    leyendaCaja.replaceChildren(
      leyenda({cortes, titulo: `Hablantes de ${nombre} nacidos en la entidad`, formato: (x) => punto(Math.round(x)), notaSinDato: "Sin hablantes en la muestra"}),
      html`<ul class="mapa-variantes-leyenda"><li class="mapa-variantes-leyenda-titulo">Color de la línea: variante probable</li>${chips}<li><span class="mapa-variante-chip" style="background:${GRIS_VARIANTE}" aria-hidden="true"></span>Otras variantes o varias posibles</li></ul>`);
    resumen.replaceChildren(html`<h2 class="mapa-titulo">De dónde vienen quienes hablan ${nombre}</h2>
      <p class="mapa-definicion">Hablantes de ${nombre} que viven en la Ciudad de México, según su entidad de nacimiento. Cada línea une la entidad con la ciudad y su grosor es el número de personas. <span class="mapa-fuente">${FUENTE_ANIO[e.anio]}, muestra.</span></p>`);
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
