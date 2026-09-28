// Mapa navegador: dibuja el nivel actual de la geografía con el indicador
// elegido, y baja de nivel con un clic sobre la unidad. Las migas suben.
//
// Todo lo que el mapa decide lo escribe en el panel de la sección con
// `panel.set(...)`; el mapa nunca guarda estado propio de filtros. La página
// llama a `pintar({v, ...})` cada vez que el panel cambia.
// Ver docs/arquitectura-filtros.md, §3 y §7.
import maplibregl from "npm:maplibre-gl@5.24.0";
import {registrarProtocolo, estiloBase, expresionColor, leyenda, RAMPA_MORADA, SIN_DATO, ROJO_IBERO} from "./mapa.js";
import {CVE_A_ISO, ISO_A_CVE, bajarA, contenedorDe, migasDe} from "./geografia.js";

const MEXICO = [[-118.5, 14.4], [-86.6, 32.8]];

export function mapaNavegador({panel, catalogo, fuente, geoEntidades, pmtilesMunicipios, pmtilesAgebs, pmtilesAgebs2010 = null,
    pmtilesManzanas, pmtilesManzanas2010 = null, globoDe, alto = "70vh"}) {
  registrarProtocolo();
  const lienzo = document.createElement("div");
  lienzo.className = "nav-lienzo";
  lienzo.style.height = alto;
  lienzo.setAttribute("role", "region");
  lienzo.setAttribute("aria-label", "Mapa navegable");
  const migas = document.createElement("nav");
  migas.className = "nav-migas";
  migas.setAttribute("aria-label", "Nivel del mapa");
  // La tarjeta y la leyenda van DEBAJO del lienzo, no encima: un panel
  // flotante tapa unidades y se traga el clic que debía bajar de nivel.
  const esquina = document.createElement("div");
  esquina.className = "nav-pie";
  const tarjeta = document.createElement("div");
  tarjeta.className = "nav-tarjeta";
  const leyendaCaja = document.createElement("div");
  leyendaCaja.className = "nav-leyenda";
  esquina.append(tarjeta, leyendaCaja);
  const nodo = document.createElement("div");
  nodo.className = "nav-mapa";
  nodo.append(lienzo, migas, esquina);

  const mapa = new maplibregl.Map({container: lienzo, style: estiloBase(), bounds: MEXICO, fitBoundsOptions: {padding: 12}, minZoom: 3, maxZoom: 17, attributionControl: {compact: true}});
  mapa.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  mapa.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
  nodo.mapa = mapa;
  let encuadrado = false, pendiente = null, cargado = false;
  new ResizeObserver(() => {
    if (lienzo.clientWidth <= 0) return;
    mapa.resize();
    if (!encuadrado) { encuadrado = true; mapa.fitBounds(MEXICO, {padding: 12, duration: 0}); }
  }).observe(lienzo);

  const popup = new maplibregl.Popup({closeButton: false, closeOnClick: false, className: "mapa-globo", offset: 12});
  let enReposo = "";
  const reposo = () => { tarjeta.innerHTML = enReposo; popup.remove(); };

  // Una capa por nivel; las de AGEB y manzana existen por edición.
  const CAPAS = {
    entidad: [{id: "entidades", fuente: "entidades", capa: null, llave: "id"}],
    municipio: [{id: "municipios", fuente: "municipios", capa: "municipios", llave: "CVEGEO"}],
    ageb: [{id: "agebs", fuente: "agebs", capa: "agebs", llave: "cve_ageb", anio: 2020}, ...(pmtilesAgebs2010 ? [{id: "agebs2010", fuente: "agebs2010", capa: "agebs", llave: "cve_ageb", anio: 2010}] : [])],
    manzana: [{id: "manzanas", fuente: "manzanas", capa: "manzanas", llave: "CVEGEO", anio: 2020}, ...(pmtilesManzanas2010 ? [{id: "manzanas2010", fuente: "manzanas2010", capa: "manzanas", llave: "CVEGEO", anio: 2010}] : [])],
  };
  const todasCapas = Object.values(CAPAS).flat();
  function capaDe(nivel, anio) {
    const lista = CAPAS[nivel];
    return lista.find((c) => c.anio === anio) ?? lista[0];
  }
  function agregarCapas(c, porEstado) {
    const sl = c.capa ? {"source-layer": c.capa} : {};
    mapa.addLayer({id: `${c.id}-relleno`, type: "fill", source: c.fuente, ...sl, layout: {visibility: "none"},
      paint: {"fill-color": SIN_DATO, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 12, 0.75, 15, 0.9]}});
    // Borde gris en AGEB y manzanas: con tasa cero el relleno es casi blanco y
    // un borde blanco las volvía invisibles sobre el mapa base.
    mapa.addLayer({id: `${c.id}-borde`, type: "line", source: c.fuente, ...sl, layout: {visibility: "none"},
      paint: {"line-color": porEstado ? "#ffffff" : "#9c9c98", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 10, 0.8, 15, 1], "line-opacity": porEstado ? 0.8 : 0.6}});
    mapa.addLayer({id: `${c.id}-hover`, type: "line", source: c.fuente, ...sl, layout: {visibility: "none"},
      paint: {"line-color": ROJO_IBERO, "line-width": 2.5, "line-opacity": ["case", ["boolean", ["feature-state", "activa"], false], 1, 0]}});
    mapa.addLayer({id: `${c.id}-sel`, type: "line", source: c.fuente, ...sl, layout: {visibility: "none"}, filter: ["==", ["get", c.llave], "__ninguna__"],
      paint: {"line-color": "#1f1f1f", "line-width": 3, "line-dasharray": [2, 1.2]}});
    c.porEstado = porEstado;
  }

  let activa = null;
  const apagar = () => { if (activa) { mapa.setFeatureState(activa, {activa: false}); activa = null; } };
  let vista = null;  // {v, nivel, capa, valores, campo}

  mapa.on("load", () => {
    mapa.addSource("entidades", {type: "geojson", data: geoEntidades, promoteId: "id"});
    mapa.addSource("municipios", {type: "vector", url: `pmtiles://${pmtilesMunicipios}`, promoteId: "CVEGEO"});
    mapa.addSource("agebs", {type: "vector", url: `pmtiles://${pmtilesAgebs}`});
    if (pmtilesAgebs2010) mapa.addSource("agebs2010", {type: "vector", url: `pmtiles://${pmtilesAgebs2010}`});
    mapa.addSource("manzanas", {type: "vector", url: `pmtiles://${pmtilesManzanas}`});
    if (pmtilesManzanas2010) mapa.addSource("manzanas2010", {type: "vector", url: `pmtiles://${pmtilesManzanas2010}`});
    for (const c of CAPAS.manzana) agregarCapas(c, false);
    for (const c of CAPAS.ageb) agregarCapas(c, false);
    for (const c of CAPAS.municipio) agregarCapas(c, true);
    for (const c of CAPAS.entidad) agregarCapas(c, true);

    for (const c of todasCapas) {
      const relleno = `${c.id}-relleno`;
      mapa.on("mousemove", relleno, (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null || !vista || vista.capa !== c) return;
        mapa.getCanvas().style.cursor = "pointer";
        const ref = {source: f.source, sourceLayer: f.sourceLayer, id: f.id};
        if (!activa || activa.id !== f.id || activa.source !== f.source) { apagar(); activa = ref; mapa.setFeatureState(ref, {activa: true}); }
        const cve = claveDe(c, f);
        popup.setLngLat(e.lngLat).setHTML(globoDe({nivel: vista.nivel, cve, propiedades: f.properties, valor: vista.valores.get(cve), v: vista.v})).addTo(mapa);
      });
      mapa.on("mouseleave", relleno, () => { mapa.getCanvas().style.cursor = ""; apagar(); reposo(); });
      mapa.on("click", relleno, (e) => {
        const f = e.features?.[0];
        if (!f || !vista || vista.capa !== c) return;
        const cve = claveDe(c, f);
        const r = bajarA(panel.geo(), cve, fuente.nivelMax);
        apagar(); popup.remove();
        panel.verMapa?.();
        panel.set({...r.geo, seleccion: r.bajo ? null : cve});
      });
    }
    cargado = true;
    if (pendiente) { const p = pendiente; pendiente = null; pintar(p); }
  });

  function claveDe(c, f) {
    const p = f.properties;
    if (c.llave === "id") return ISO_A_CVE.get(p.id) ?? p.id;
    return String(p[c.llave] ?? "");
  }
  function visibles(ids) {
    const set = new Set(ids);
    for (const c of todasCapas) for (const suf of ["relleno", "borde", "hover", "sel"]) {
      const id = `${c.id}-${suf}`;
      if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", set.has(id) ? "visible" : "none");
    }
  }
  function prefijo(c, cve, largo) {
    return ["==", ["slice", ["to-string", ["get", c.llave]], 0, largo], cve];
  }
  function pintarMigas(v) {
    migas.replaceChildren(...migasDe(v, catalogo).flatMap((m, i, arr) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "nav-miga"; b.textContent = m.etiqueta;
      if (i === arr.length - 1) { b.setAttribute("aria-current", "location"); b.disabled = true; }
      b.addEventListener("click", () => panel.set({...m.geo}));
      return i ? [Object.assign(document.createElement("span"), {className: "nav-miga-sep", textContent: "›", ariaHidden: "true"}), b] : [b];
    }));
  }

  /**
   * Dibuja el nivel actual.
   *  v        valor del panel (geografía y cortes)
   *  valores  Map cve -> {valor, ...} para capas por estado (entidad, municipio)
   *  campo    nombre del atributo de la tesela para AGEB y manzana
   *  cortes   cortes de color; titulo/formato/notaSinDato van a la leyenda
   *  tarjeta  HTML de la tarjeta en reposo (cifra del contenedor)
   */
  function pintar(p) {
    if (!cargado) { pendiente = p; return; }
    const {v, valores = new Map(), campo = null, cortes, titulo, formato, notaSinDato, tarjeta: htmlTarjeta = ""} = p;
    const c = capaDe(v.nivel, v.anio);
    vista = {v, nivel: v.nivel, capa: c, valores, campo};
    apagar(); popup.remove();
    const relleno = `${c.id}-relleno`;
    if (c.porEstado) {
      // Estado de todas las unidades del nivel: valor o nulo.
      if (v.nivel === "entidad") {
        for (const f of geoEntidades.features) mapa.setFeatureState({source: "entidades", id: f.properties.id}, {valor: valores.get(ISO_A_CVE.get(f.properties.id))?.valor ?? null});
        mapa.setFilter(relleno, null); mapa.setFilter(`${c.id}-borde`, null); mapa.setFilter(`${c.id}-hover`, null);
      } else {
        for (const u of catalogo.hijos("municipio", v.cveEnt)) mapa.setFeatureState({source: "municipios", sourceLayer: "municipios", id: u.cve}, {valor: valores.get(u.cve)?.valor ?? null});
        const filtro = prefijo(c, v.cveEnt, 2);
        for (const suf of ["relleno", "borde", "hover"]) mapa.setFilter(`${c.id}-${suf}`, filtro);
      }
      mapa.setPaintProperty(relleno, "fill-color", expresionColor("valor", cortes, RAMPA_MORADA, "feature-state"));
    } else {
      const filtro = v.nivel === "ageb" ? prefijo(c, v.cveMun, 5) : prefijo(c, v.cveAgeb, 13);
      for (const suf of ["relleno", "borde", "hover"]) mapa.setFilter(`${c.id}-${suf}`, filtro);
      mapa.setPaintProperty(relleno, "fill-color", expresionColor(campo, cortes, RAMPA_MORADA, "get"));
    }
    // Contorno de la unidad seleccionada sin bajar (fuente que no llega más abajo).
    const sel = `${c.id}-sel`;
    const llaveSel = c.llave === "id" ? CVE_A_ISO.get(v.seleccion ?? "") ?? "__ninguna__" : (v.seleccion ?? "__ninguna__");
    mapa.setFilter(sel, ["==", ["to-string", ["get", c.llave]], llaveSel]);
    visibles([relleno, `${c.id}-borde`, `${c.id}-hover`, sel]);
    // Encuadre al contenedor.
    const cont = contenedorDe(v);
    const caja = cont.nivel === "nacional" ? MEXICO : catalogo.de(cont.nivel, cont.cve)?.caja ?? MEXICO;
    mapa.fitBounds(caja, {padding: 24, duration: 500});
    pintarMigas(v);
    leyendaCaja.replaceChildren(leyenda({cortes, titulo, formato, notaSinDato}));
    enReposo = htmlTarjeta;
    reposo();
  }

  nodo.pintar = pintar;
  nodo.contar = (capaId) => mapa.queryRenderedFeatures({layers: [capaId]}).length;
  return nodo;
}
