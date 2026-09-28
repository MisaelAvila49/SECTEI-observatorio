// Modelo de geografía del libro: niveles, llaves, modo y etiquetas.
//
// La geografía de una sección es un solo objeto que viaja con su panel:
//   {nivel, cveEnt, cveMun, cveAgeb}
// `nivel` es el nivel de las unidades que se dibujan y comparan (las
// entidades del país, los municipios de un estado, las AGEB de una alcaldía,
// las manzanas de una AGEB); las claves dicen dentro de qué unidad. Cada
// fuente declara hasta qué nivel llega y el panel no ofrece uno más abajo.
// Ver docs/arquitectura-filtros.md.

export const NIVELES = [
  {clave: "entidad", singular: "entidad", plural: "entidades", padre: null, longitud: 2},
  {clave: "municipio", singular: "municipio", plural: "municipios", padre: "entidad", longitud: 5},
  {clave: "ageb", singular: "AGEB", plural: "AGEB", padre: "municipio", longitud: 13},
  {clave: "manzana", singular: "manzana", plural: "manzanas", padre: "ageb", longitud: 16},
];
export const ORDEN_NIVEL = NIVELES.map((n) => n.clave);
export const nivelDe = (clave) => NIVELES.find((n) => n.clave === clave);
export const masProfundo = (a, b) => ORDEN_NIVEL.indexOf(a) >= ORDEN_NIVEL.indexOf(b) ? a : b;

// Clave de dos dígitos -> ISO del geojson de entidades y nombre corto.
export const ENTIDADES = [
  ["01", "MX-AGU", "Aguascalientes"], ["02", "MX-BCN", "Baja California"], ["03", "MX-BCS", "Baja California Sur"],
  ["04", "MX-CAM", "Campeche"], ["05", "MX-COA", "Coahuila"], ["06", "MX-COL", "Colima"], ["07", "MX-CHP", "Chiapas"],
  ["08", "MX-CHH", "Chihuahua"], ["09", "MX-CMX", "Ciudad de México"], ["10", "MX-DUR", "Durango"], ["11", "MX-GUA", "Guanajuato"],
  ["12", "MX-GRO", "Guerrero"], ["13", "MX-HID", "Hidalgo"], ["14", "MX-JAL", "Jalisco"], ["15", "MX-MEX", "Estado de México"],
  ["16", "MX-MIC", "Michoacán"], ["17", "MX-MOR", "Morelos"], ["18", "MX-NAY", "Nayarit"], ["19", "MX-NLE", "Nuevo León"],
  ["20", "MX-OAX", "Oaxaca"], ["21", "MX-PUE", "Puebla"], ["22", "MX-QUE", "Querétaro"], ["23", "MX-ROO", "Quintana Roo"],
  ["24", "MX-SLP", "San Luis Potosí"], ["25", "MX-SIN", "Sinaloa"], ["26", "MX-SON", "Sonora"], ["27", "MX-TAB", "Tabasco"],
  ["28", "MX-TAM", "Tamaulipas"], ["29", "MX-TLA", "Tlaxcala"], ["30", "MX-VER", "Veracruz"], ["31", "MX-YUC", "Yucatán"],
  ["32", "MX-ZAC", "Zacatecas"],
].map(([cve, iso, nombre]) => ({cve, iso, nombre}));
export const CVE_A_ISO = new Map(ENTIDADES.map((e) => [e.cve, e.iso]));
export const ISO_A_CVE = new Map(ENTIDADES.map((e) => [e.iso, e.cve]));

// Llaves normalizadas al leer: sin ceros a la izquierda se pierden las
// entidades 01 a 09 sin aviso.
export const normalizarClave = (x, nivel) => String(x ?? "").padStart(nivelDe(nivel)?.longitud ?? 0, "0");

// Catálogo geográfico (src/data/geo_catalogo.csv): nombre, padre y caja de
// cada unidad, para buscar, encuadrar y rotular.
export function catalogoGeo(filas) {
  const porNivel = new Map(NIVELES.map((n) => [n.clave, []]));
  const porCve = new Map();
  for (const r of filas) {
    const u = {nivel: r.nivel, cve: normalizarClave(r.cve, r.nivel), nombre: r.nombre, padre: String(r.padre ?? ""),
      caja: [[+r.minx, +r.miny], [+r.maxx, +r.maxy]]};
    if (u.nivel === "municipio") u.padre = u.padre.padStart(2, "0");
    porNivel.get(u.nivel)?.push(u);
    porCve.set(`${u.nivel}:${u.cve}`, u);
  }
  return {
    de: (nivel, cve) => porCve.get(`${nivel}:${cve}`) ?? null,
    hijos: (nivel, cvePadre) => (porNivel.get(nivel) ?? []).filter((u) => !cvePadre || u.padre === cvePadre),
    todos: (nivel) => porNivel.get(nivel) ?? [],
  };
}

// Búsqueda por nombre sin acentos: exacta primero, luego por contenido.
// Devuelve la unidad, null si no hay ninguna, o {varias: [...]} si hay más de
// una coincidencia parcial y ninguna exacta (lección 68: los dos estados se
// avisan, no se resuelven en silencio).
const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export function buscarUnidad(lista, texto) {
  const t = sinAcentos(texto);
  if (!t) return null;
  const exacta = lista.find((u) => sinAcentos(u.nombre) === t);
  if (exacta) return exacta;
  const parciales = lista.filter((u) => sinAcentos(u.nombre).includes(t));
  if (parciales.length === 1) return parciales[0];
  if (parciales.length > 1) return {varias: parciales};
  return null;
}

// La unidad contenedora de lo que se dibuja: el país, la entidad, el
// municipio o la AGEB, según el nivel.
export function contenedorDe(geo) {
  if (geo.nivel === "entidad") return {nivel: "nacional", cve: "00"};
  if (geo.nivel === "municipio") return {nivel: "entidad", cve: geo.cveEnt};
  if (geo.nivel === "ageb") return {nivel: "municipio", cve: geo.cveMun};
  return {nivel: "ageb", cve: geo.cveAgeb};
}

// Migas: del país hasta el contenedor actual, cada una con la geografía a la
// que sube.
export function migasDe(geo, catalogo) {
  const migas = [{etiqueta: "México", geo: {nivel: "entidad", cveEnt: null, cveMun: null, cveAgeb: null}}];
  if (geo.cveEnt && geo.nivel !== "entidad") migas.push({etiqueta: catalogo.de("entidad", geo.cveEnt)?.nombre ?? geo.cveEnt, geo: {nivel: "municipio", cveEnt: geo.cveEnt, cveMun: null, cveAgeb: null}});
  if (geo.cveMun && (geo.nivel === "ageb" || geo.nivel === "manzana")) migas.push({etiqueta: catalogo.de("municipio", geo.cveMun)?.nombre ?? geo.cveMun, geo: {nivel: "ageb", cveEnt: geo.cveEnt, cveMun: geo.cveMun, cveAgeb: null}});
  if (geo.cveAgeb && geo.nivel === "manzana") migas.push({etiqueta: `AGEB ${geo.cveAgeb.slice(-4)}`, geo: {...geo}});
  return migas;
}

export function etiquetaGeo(geo, catalogo) {
  const n = nivelDe(geo.nivel);
  const c = contenedorDe(geo);
  if (c.nivel === "nacional") return "Entidades del país";
  const nombre = c.nivel === "ageb" ? `la AGEB ${c.cve.slice(-4)}` : (catalogo.de(c.nivel, c.cve)?.nombre ?? c.cve);
  return `${n.plural[0].toUpperCase()}${n.plural.slice(1)} de ${nombre}`;
}

// Geografía que resulta de hacer clic en una unidad del nivel actual: baja al
// siguiente nivel que la fuente publica para esa unidad, o se queda donde está
// y solo la selecciona.
export function bajarA(geo, cve, nivelMaxDe) {
  const siguiente = {entidad: "municipio", municipio: "ageb", ageb: "manzana", manzana: null}[geo.nivel];
  const claves = {...geo};
  if (geo.nivel === "entidad") claves.cveEnt = cve;
  if (geo.nivel === "municipio") claves.cveMun = cve;
  if (geo.nivel === "ageb") claves.cveAgeb = cve;
  const tope = nivelMaxDe(claves);
  const puede = siguiente && ORDEN_NIVEL.indexOf(siguiente) <= ORDEN_NIVEL.indexOf(tope);
  return {geo: puede ? {...claves, nivel: siguiente} : geo, bajo: Boolean(puede), seleccion: cve};
}
