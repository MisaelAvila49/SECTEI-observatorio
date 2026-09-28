// Modelo de geografía del libro: niveles, llaves, contenedor, migas y etiquetas.
//
// La geografía de una sección es un solo objeto que viaja con su panel:
//   {nivel, cveEnt, cveMun, cveAgeb, seleccion}
// `nivel` es lo que se dibuja y compara: el país como una sola unidad, las
// entidades, los municipios, las AGEB o las manzanas. Las claves acotan
// (los municipios DE Oaxaca, las AGEB DE Iztapalapa) y son opcionales: sin
// ellas se comparan todas las unidades del nivel. `seleccion` es la unidad
// resaltada dentro del nivel sin bajar. Ver docs/arquitectura-filtros.md.

export const NIVELES = [
  {clave: "nacional", singular: "país", plural: "país", etiqueta: "País (una sola cifra)", longitud: 2},
  {clave: "entidad", singular: "entidad", plural: "entidades", etiqueta: "Entidades del país", longitud: 2},
  {clave: "municipio", singular: "municipio", plural: "municipios", etiqueta: "Municipios", longitud: 5},
  {clave: "ageb", singular: "AGEB", plural: "AGEB", etiqueta: "AGEB (Ciudad de México)", longitud: 13},
  {clave: "manzana", singular: "manzana", plural: "manzanas", etiqueta: "Manzanas (Ciudad de México)", longitud: 16},
];
export const ORDEN_NIVEL = NIVELES.map((n) => n.clave);
export const nivelDe = (clave) => NIVELES.find((n) => n.clave === clave);
// La capa del mapa que dibuja cada nivel: el país se ve sobre las entidades.
export const capaDeNivel = (nivel) => (nivel === "nacional" ? "entidad" : nivel);

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

// La unidad que contiene lo que se dibuja. Sin clave que acote, el
// contenedor es el país (o la ciudad, en AGEB y manzanas).
export function contenedorDe(geo) {
  if (geo.nivel === "nacional" || geo.nivel === "entidad") return {nivel: "nacional", cve: "00"};
  if (geo.nivel === "municipio") return geo.cveEnt ? {nivel: "entidad", cve: geo.cveEnt} : {nivel: "nacional", cve: "00"};
  if (geo.nivel === "ageb") return geo.cveMun ? {nivel: "municipio", cve: geo.cveMun} : {nivel: "entidad", cve: "09"};
  if (geo.cveAgeb) return {nivel: "ageb", cve: geo.cveAgeb};
  return geo.cveMun ? {nivel: "municipio", cve: geo.cveMun} : {nivel: "entidad", cve: "09"};
}

// Migas: del país al contenedor actual; cada una lleva la geografía a la que
// sube (el nivel de los hijos de esa unidad).
export function migasDe(geo, catalogo) {
  const migas = [{etiqueta: "México", geo: {nivel: "entidad", cveEnt: null, cveMun: null, cveAgeb: null}}];
  const enCiudad = geo.nivel === "ageb" || geo.nivel === "manzana";
  const ent = enCiudad ? "09" : geo.cveEnt;
  if (ent && (geo.nivel === "municipio" || enCiudad)) migas.push({etiqueta: catalogo.de("entidad", ent)?.nombre ?? ent, geo: {nivel: "municipio", cveEnt: ent, cveMun: null, cveAgeb: null}});
  if (geo.cveMun && enCiudad) migas.push({etiqueta: catalogo.de("municipio", geo.cveMun)?.nombre ?? geo.cveMun, geo: {nivel: "ageb", cveEnt: "09", cveMun: geo.cveMun, cveAgeb: null}});
  if (geo.cveAgeb && geo.nivel === "manzana") migas.push({etiqueta: `AGEB ${geo.cveAgeb.slice(-4)}`, geo: {nivel: "manzana", cveEnt: "09", cveMun: geo.cveMun, cveAgeb: geo.cveAgeb}});
  return migas;
}

export function etiquetaGeo(geo, catalogo) {
  if (geo.nivel === "nacional") return "El país";
  const n = nivelDe(geo.nivel);
  const c = contenedorDe(geo);
  const plural = `${n.plural[0].toUpperCase()}${n.plural.slice(1)}`;
  if (c.nivel === "nacional") return `${plural} del país`;
  const nombre = c.nivel === "ageb" ? `la AGEB ${c.cve.slice(-4)}` : (catalogo.de(c.nivel, c.cve)?.nombre ?? c.cve);
  return `${plural} de ${nombre}`;
}

// Geografía que resulta de hacer clic en una unidad del nivel dibujado: baja
// al siguiente nivel que la fuente publica para esa unidad, o se queda donde
// está y solo la selecciona.
export function bajarA(geo, cve, nivelMaxDe) {
  const nivel = capaDeNivel(geo.nivel);
  const siguiente = {entidad: "municipio", municipio: "ageb", ageb: "manzana", manzana: null}[nivel];
  const claves = {...geo, nivel};
  if (nivel === "entidad") { claves.cveEnt = cve; claves.cveMun = null; claves.cveAgeb = null; }
  if (nivel === "municipio") { claves.cveEnt = cve.slice(0, 2); claves.cveMun = cve; claves.cveAgeb = null; }
  if (nivel === "ageb") { claves.cveEnt = "09"; claves.cveMun = cve.slice(0, 5); claves.cveAgeb = cve; }
  const tope = nivelMaxDe(claves);
  const puede = siguiente && ORDEN_NIVEL.indexOf(siguiente) <= ORDEN_NIVEL.indexOf(tope);
  return {geo: puede ? {...claves, nivel: siguiente, seleccion: null} : {...geo, seleccion: cve}, bajo: Boolean(puede), seleccion: cve};
}
