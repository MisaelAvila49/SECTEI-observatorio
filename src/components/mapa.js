// Mapa de manzanas de la Ciudad de México sobre teselas vectoriales PMTiles.
//
// Se usa MapLibre y no Mapbox porque el sitio se publica en GitHub Pages: un
// archivo .pmtiles se sirve estático y el navegador lee de él por rangos HTTP,
// sin servidor de teselas, sin cuenta y sin token. El mapa de referencia del
// INIDE resolvió esto subiendo un mbtiles por capa a una cuenta de Mapbox, con
// el token expuesto en el cliente; aquí no hace falta.
//
// La otra diferencia de fondo con esa referencia: allá cada indicador es una
// capa distinta y solo se ve una a la vez, con los cortes de color quemados en
// el código. Aquí hay UNA capa de manzanas que carga todos los indicadores como
// atributos, y el filtro cambia la expresión de color en el cliente. Eso es lo
// que permite comparar sin recargar y mantener los filtros del proyecto.

// La versión de maplibre-gl va FIJADA a la 5, no abierta con ^: Observable
// resuelve `npm:` contra su CDN y no contra node_modules, así que sin el número
// exacto sirve la última publicada —la 6— por más que package.json diga otra
// cosa, y el caché de `src/.observablehq/cache/_npm` la conserva entre
// arranques aunque se reinstalen las dependencias.
//
// La 6 no sirve para esto por dos razones: dejó de publicar un export default,
// y —ya corregido eso— su protocolo personalizado no llega a pedir teselas a
// pmtiles. El handler se invoca UNA sola vez, para el TileJSON; MapLibre lee
// minzoom y maxzoom correctos y después no solicita ni una tesela, sin emitir
// un error. Además su worker se referencia como `/npm/maplibre-gl@6.8.0/...`,
// ruta que este servidor no sirve, y falla con ERR_FAILED.
//
// La 5 exporta por default, no con nombrados: `import {Map}` de la 5 falla con
// "does not provide an export named 'Map'".
import maplibregl from "npm:maplibre-gl@5.24.0";
import {Protocol} from "npm:pmtiles@4.5.0";

// Rojo de marca de la Ibero, el mismo del borde de acento de las tarjetas.
export const ROJO_IBERO = "#C4101B";

// Escala secuencial morada, la misma familia que usa el mapa del INIDE para
// hablantes de lengua indígena. Se conserva por continuidad visual con el
// antecedente, y porque un solo tono ordena bien de menor a mayor.
export const RAMPA_MORADA = ["#f7fcfd", "#bfd3e6", "#8c96c6", "#88419d", "#4d004b"];

// Gris para las manzanas sin dato. INEGI suprime por confidencialidad los
// valores de manzanas con muy poca población, y ese vacío NO es cero: se pinta
// distinto y se dice en la leyenda.
export const SIN_DATO = "#d9d9d9";

let protocoloRegistrado = false;

/** Registra el protocolo pmtiles:// una sola vez por página. */
function registrarProtocolo() {
  if (protocoloRegistrado) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocoloRegistrado = true;
}

/**
 * Estilo base de referencia, servido por OpenStreetMap.
 *
 * NO se usa Carto: sus teselas `basemaps.cartocdn.com` ahora exigen clave y
 * devuelven HTTP 200 con una imagen que dice "API KEY REQUIRED", así que el
 * fallo no se detecta comprobando el código de respuesta —hay que mirar el
 * contenido: la tesela del aviso tiene 25 colores únicos y una real, 55—.
 *
 * El fondo se atenúa y se dessatura por CSS: el dato vive en el color de las
 * manzanas, y un mapa base a plena intensidad compite con la rampa y hace
 * imposible juzgar un polígono.
 */
export function estiloBase() {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    },
    layers: [
      {id: "fondo", type: "background", paint: {"background-color": "#f8f8f6"}},
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {"raster-opacity": 0.55, "raster-saturation": -0.85}
      }
    ]
  };
}

/**
 * Construye la expresión de color de MapLibre para un indicador.
 *
 * Los cortes se reciben ya calculados sobre los datos, no fijos: una tasa que
 * en un indicador llega a 24 % y en otro a 3 % no puede compartir escala, o el
 * segundo se ve uniformemente vacío. Que el corte más oscuro caiga en el valor
 * más alto de la vista es la regla; lo que cambia es dónde está ese máximo.
 */
export function expresionColor(campo, cortes, rampa = RAMPA_MORADA) {
  const escalones = [];
  for (let i = 1; i < cortes.length; i++) {
    escalones.push(cortes[i], rampa[Math.min(i, rampa.length - 1)]);
  }

  // `step` exige al menos un par valor/color después del color base. Cuando la
  // distribución es tan asimétrica que todos los cuantiles colapsan en un solo
  // corte —pasa con los hablantes monolingües, que valen cero en la enorme
  // mayoría de las manzanas—, no queda ningún par y MapLibre rechaza el estilo
  // entero con "Expected at least 4 arguments, but found only 2": el mapa se
  // queda sin capa y solo se nota al cambiar de indicador.
  const porValor = escalones.length
    ? ["step", ["to-number", ["get", campo]], rampa[0], ...escalones]
    : rampa[0];

  return [
    "case",
    ["==", ["get", campo], null], SIN_DATO,
    porValor
  ];
}

/**
 * Cortes por cuantiles sobre los valores no nulos.
 *
 * Se usan cuantiles y no intervalos iguales porque la distribución está muy
 * sesgada a cero: casi 40 mil manzanas de 66 mil están por debajo de 1.33 %, y
 * con intervalos iguales el mapa entero sale del color más claro.
 */
export function cortesPorCuantil(valores, n = 5) {
  const v = valores.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return [0];

  // Los cuantiles se calculan sobre los valores POSITIVOS, no sobre todos. En
  // indicadores muy concentrados —los hablantes monolingües son cero en más del
  // 80 % de las colonias— los cinco cuantiles caían todos en 0: la escala
  // colapsaba a un solo corte y el mapa entero se pintaba de un color, sin
  // distinguir la manzana con veinte monolingües de la que no tiene ninguno.
  // El cero conserva su propia clase, la más clara, y el resto de la rampa se
  // reparte entre quienes sí tienen población.
  const positivos = v.filter((x) => x > 0);
  if (!positivos.length) return [0];

  const cortes = [0];
  for (let i = 0; i < n - 1; i++) {
    cortes.push(positivos[Math.floor((i / (n - 1)) * positivos.length)]);
  }

  // Cortes repetidos colapsarían dos clases en una; se dejan únicos y la
  // leyenda muestra menos clases, que es honesto sobre lo que el dato distingue.
  return [...new Set(cortes)].sort((a, b) => a - b);
}

/**
 * Crea el mapa y devuelve un objeto con el control para actualizarlo.
 *
 * @param {object} opciones
 * @param {string} opciones.pmtiles  ruta del archivo .pmtiles
 * @param {string} opciones.capa     nombre de la capa dentro del archivo
 * @param {string} opciones.campo    atributo a colorear
 * @param {number[]} opciones.cortes cortes de la escala
 * @param {function} opciones.tooltip recibe las propiedades y devuelve HTML
 */
export function mapaManzanas({
  pmtiles,
  capa = "manzanas",
  campo,
  cortes,
  rampa = RAMPA_MORADA,
  centro = [-99.1332, 19.3826],
  zoom = 10,
  alto = 620,
  tooltip,
  // Zoom desde el que se dibuja el borde entre polígonos y el resaltado bajo
  // el cursor. Con 66 mil manzanas tienen que esperar a zoom de calle; con
  // 2,400 AGEB se pueden ver desde la vista de ciudad.
  zoomBorde = 13,
  zoomHover = 12,
  // Contornos de referencia: la silueta del estado y sus alcaldías, como
  // GeoJSON ya cargado. Se probó además una máscara que aclaraba todo lo de
  // fuera del estado y se descartó: ensuciaba el mapa sin aportar: el contorno
  // basta para leer dónde termina la ciudad.
  limite,
  alcaldias
} = {}) {
  registrarProtocolo();

  const contenedor = document.createElement("div");
  contenedor.className = "mapa-manzanas";
  contenedor.style.height = `${alto}px`;
  // Observable inserta el nodo DESPUÉS de que este código corre, así que al
  // construirse el contenedor todavía mide 0x0. MapLibre se queda entonces con
  // su tamaño por defecto de 400x300 y —más grave— no llega a crear el caché
  // de teselas de la fuente, de modo que el mapa se queda vacío sin lanzar un
  // solo error. Se le avisa en cuanto el nodo entra al documento y cada vez que
  // cambia de tamaño.
  const observador = new ResizeObserver(() => {
    if (contenedor.clientWidth > 0) mapa.resize();
  });

  const mapa = new maplibregl.Map({
    container: contenedor,
    style: estiloBase(),
    center: centro,
    zoom,
    minZoom: 8,
    maxZoom: 17,
    attributionControl: {compact: true}
  });

  observador.observe(contenedor);

  mapa.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  mapa.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");

  // Handle para inspección desde pruebas de navegador; no lo usa la página.
  contenedor._mapa = mapa;

  const globo = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "mapa-globo"
  });

  // Órdenes recibidas antes de que carguen las capas (pintura y filtro). Un
  // filtro que llega temprano y se descarta no da error: deja el mapa sin
  // recortar, que es justo lo que no se nota.
  const pendiente = {pintura: null, filtro: undefined, realce: false};
  // Relleno translúcido a zoom de ciudad, para que se vea la mancha urbana
  // debajo; firme cuando el mapa está recortado a unas pocas unidades, que
  // sueltas y translúcidas casi no se distinguen.
  const OPACIDAD_BASE = ["interpolate", ["linear"], ["zoom"], 9, 0.5, 12, 0.72, 14, 0.88];
  const OPACIDAD_REALCE = 0.95;

  mapa.on("load", () => {
    mapa.addSource("manzanas", {type: "vector", url: `pmtiles://${pmtiles}`});

    mapa.addLayer({
      id: "manzanas-relleno",
      type: "fill",
      source: "manzanas",
      "source-layer": capa,
      paint: {
        "fill-color": expresionColor(campo, cortes, rampa),
        // Se aclara bastante al alejar: a zoom de ciudad los 66 mil polígonos
        // se encabalgan hasta formar una mancha uniforme donde no se distingue
        // el gradiente, y conviene ver por dónde va la mancha urbana debajo. A
        // zoom de calle el dato se pinta firme.
        "fill-opacity": OPACIDAD_BASE
      }
    });

    // Borde propio, dibujado solo a partir de zoom 13: por debajo, 66 mil
    // contornos se comen el color del relleno y el mapa se ve gris.
    mapa.addLayer({
      id: "manzanas-borde",
      type: "line",
      source: "manzanas",
      "source-layer": capa,
      minzoom: zoomBorde,
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], zoomBorde, 0.2, 16, 0.8],
        "line-opacity": 0.5
      }
    });

    // Contorno de la manzana bajo el cursor.
    //
    // Se resalta con feature-state y NO filtrando por CVEGEO. La clave no es
    // única dentro de las teselas: toda manzana que cruza el borde de una
    // tesela se parte y aparece en las dos, así que un filtro por CVEGEO
    // encendía a la vez varios trozos repartidos por el mapa —249 duplicados
    // entre solo cuatro teselas contiguas a z14—, que es de dónde salían los
    // contornos rojos sueltos que parpadeaban al mover el ratón.
    // feature-state marca la geometría concreta que está bajo el cursor.
    //
    // La capa va aparte de la de relleno porque el resaltado tiene que verse
    // por ENCIMA de los vecinos: un borde dibujado dentro del relleno queda
    // tapado por el polígono de al lado.
    mapa.addLayer({
      id: "manzanas-hover",
      type: "line",
      source: "manzanas",
      "source-layer": capa,
      // A zoom de ciudad una manzana mide menos de un píxel: resaltarla no
      // comunica nada y solo produce destellos al pasar el cursor.
      minzoom: zoomHover,
      paint: {
        "line-color": ROJO_IBERO,
        "line-width": 2,
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "activa"], false], 1,
          0
        ]
      }
    });

    // Los límites de alcaldía se dibujan en DOS capas superpuestas: una línea
    // blanca gruesa debajo y la oscura encima. Sobre el morado de las manzanas
    // una línea gris sola se pierde, y sobre el gris claro del mapa base una
    // negra sola se confunde con las avenidas; el halo blanco la despega de
    // ambos fondos sin necesidad de engrosarla hasta tapar el dato.
    if (alcaldias) {
      mapa.addSource("cdmx-alcaldias", {type: "geojson", data: alcaldias});
      mapa.addLayer({
        id: "cdmx-alcaldias-halo",
        type: "line",
        source: "cdmx-alcaldias",
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 5],
          "line-opacity": 0.9
        }
      });
      mapa.addLayer({
        id: "cdmx-alcaldias",
        type: "line",
        source: "cdmx-alcaldias",
        paint: {
          "line-color": "#3d3d3d",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.1, 14, 1.8],
          "line-opacity": 0.9,
          "line-dasharray": [2.5, 1.5]
        }
      });
    }

    // Límite del estado, con el mismo halo blanco y algo más grueso que el de
    // las alcaldías para que se lea la jerarquía entre ambos.
    if (limite) {
      mapa.addSource("cdmx-limite", {type: "geojson", data: limite});
      mapa.addLayer({
        id: "cdmx-limite-halo",
        type: "line",
        source: "cdmx-limite",
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4, 12, 6],
          "line-opacity": 0.9
        }
      });
      mapa.addLayer({
        id: "cdmx-limite",
        type: "line",
        source: "cdmx-limite",
        paint: {
          "line-color": "#1f1f1f",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.8, 12, 2.8],
          "line-opacity": 0.9
        }
      });
    }

    let activa = null;

    const apagarActiva = () => {
      if (activa == null) return;
      mapa.setFeatureState(
        {source: "manzanas", sourceLayer: capa, id: activa},
        {activa: false}
      );
      activa = null;
    };

    mapa.on("mousemove", "manzanas-relleno", (e) => {
      const f = e.features?.[0];
      if (!f || f.id == null) return;
      mapa.getCanvas().style.cursor = "pointer";
      if (f.id !== activa) {
        apagarActiva();
        activa = f.id;
        mapa.setFeatureState(
          {source: "manzanas", sourceLayer: capa, id: activa},
          {activa: true}
        );
      }
      if (tooltip) globo.setLngLat(e.lngLat).setHTML(tooltip(f.properties)).addTo(mapa);
    });

    mapa.on("mouseleave", "manzanas-relleno", () => {
      mapa.getCanvas().style.cursor = "";
      apagarActiva();
      globo.remove();
    });

    // Las capas ya existen: se aplican las órdenes que llegaron antes.
    if (pendiente.pintura) {
      mapa.setPaintProperty("manzanas-relleno", "fill-color", expresionColor(...pendiente.pintura));
    }
    if (pendiente.realce) mapa.setPaintProperty("manzanas-relleno", "fill-opacity", OPACIDAD_REALCE);
    if (pendiente.filtro !== undefined) {
      for (const capaId of ["manzanas-relleno", "manzanas-borde"]) mapa.setFilter(capaId, pendiente.filtro);
    }
  });

  // La instancia queda colgada del nodo para que los verificadores de navegador
  // puedan contar las marcas que de verdad se pintan (queryRenderedFeatures): un
  // filtro que no recorta nada no da error, solo deja el mapa igual.
  contenedor.mapa = mapa;

  return {
    nodo: contenedor,
    mapa,
    /** Cambia el indicador pintado sin recargar las teselas. */
    actualizar(nuevoCampo, nuevosCortes, nuevaRampa = rampa) {
      // Si las capas aún no cargan, la orden se guarda y se aplica en `load`:
      // antes se descartaba y el mapa se quedaba con el indicador inicial.
      pendiente.pintura = [nuevoCampo, nuevosCortes, nuevaRampa];
      if (!mapa.getLayer("manzanas-relleno")) return;
      mapa.setPaintProperty(
        "manzanas-relleno",
        "fill-color",
        expresionColor(nuevoCampo, nuevosCortes, nuevaRampa)
      );
    },
    /** Relleno firme mientras el mapa está recortado a pocas unidades. */
    realzar(activo) {
      pendiente.realce = Boolean(activo);
      if (!mapa.getLayer("manzanas-relleno")) return;
      mapa.setPaintProperty("manzanas-relleno", "fill-opacity", activo ? OPACIDAD_REALCE : OPACIDAD_BASE);
    },
    /** Acota la vista a un subconjunto, por ejemplo una alcaldía. */
    filtrar(expresion) {
      pendiente.filtro = expresion;
      for (const capaId of ["manzanas-relleno", "manzanas-borde"]) {
        if (mapa.getLayer(capaId)) mapa.setFilter(capaId, expresion);
      }
    }
  };
}

/**
 * Leyenda de escalones para la rampa, con su clase de "sin dato".
 *
 * La clase sin dato se dibuja separada del gradiente y con su etiqueta, porque
 * es de otra naturaleza: no es un valor bajo, es la ausencia del valor.
 */
// `abierta: false` es para escalas de CATEGORÍAS ordenadas (los cinco grados de
// marginación): ahí el último escalón no es "o más", es una categoría.
export function leyenda({cortes, rampa = RAMPA_MORADA, titulo, formato = (x) => x.toFixed(1),
    abierta = true, notaSinDato = "Sin dato publicado (INEGI suprime la cifra por confidencialidad)"}) {
  const nodo = document.createElement("figure");
  nodo.className = "mapa-leyenda";

  const h = document.createElement("figcaption");
  h.textContent = titulo;
  nodo.append(h);

  // La etiqueta va DEBAJO de su escalón, no encima del color. Antes se
  // superponía con un halo blanco, y sobre los dos tonos más oscuros de la
  // rampa el texto negro quedaba ilegible por más halo que llevara: en una
  // escala secuencial el extremo oscuro es precisamente el valor que más
  // importa leer. Fuera del color, el contraste no depende del escalón.
  const tira = document.createElement("div");
  tira.className = "mapa-leyenda-tira";
  for (let i = 0; i < cortes.length; i++) {
    const columna = document.createElement("div");
    columna.className = "mapa-leyenda-columna";

    const muestra = document.createElement("div");
    muestra.className = "mapa-leyenda-paso";
    muestra.style.background = rampa[Math.min(i, rampa.length - 1)];
    muestra.title = !abierta ? formato(cortes[i])
      : i === cortes.length - 1
      ? `${formato(cortes[i])} o más`
      : `de ${formato(cortes[i])} a ${formato(cortes[i + 1])}`;

    const texto = document.createElement("span");
    texto.className = "mapa-leyenda-valor";
    // El último escalón es abierto: se marca con "+" en vez de un tope que no
    // existe. Los demás muestran el valor donde empieza la clase.
    texto.textContent = abierta && i === cortes.length - 1
      ? `${formato(cortes[i])}+`
      : formato(cortes[i]);

    columna.append(muestra, texto);
    tira.append(columna);
  }
  nodo.append(tira);

  const nota = document.createElement("div");
  nota.className = "mapa-leyenda-sindato";
  nota.innerHTML =
    `<span class="mapa-leyenda-muestra" style="background:${SIN_DATO}"></span>` +
    `<span></span>`;
  nota.lastElementChild.textContent = notaSinDato;
  nodo.append(nota);

  return nodo;
}
