// src/components/capitulo/datos.js
// Una sola preparacion de los datos para la historia y para la seccion de
// exploracion. Todas las cifras del texto salen de aqui; los porcentajes se
// calculan sumando numerador y denominador, nunca promediando tasas.

import * as d3 from "npm:d3";

// Clave INEGI de dos digitos a la clave ISO del geojson ("MX-OAX").
export const CVE_ISO = {"01": "AGU", "02": "BCN", "03": "BCS", "04": "CAM", "05": "COA", "06": "COL", "07": "CHP", "08": "CHH",
  "09": "CMX", "10": "DUR", "11": "GUA", "12": "GRO", "13": "HID", "14": "JAL", "15": "MEX", "16": "MIC", "17": "MOR",
  "18": "NAY", "19": "NLE", "20": "OAX", "21": "PUE", "22": "QUE", "23": "ROO", "24": "SLP", "25": "SIN", "26": "SON",
  "27": "TAB", "28": "TAM", "29": "TLA", "30": "VER", "31": "YUC", "32": "ZAC"};

export const ANIO = 2025;
export const NACIDOS_CDMX = "009";
// Codigos de lengua no especificos (8000 en adelante): fuera de las listas de
// lenguas, dentro de los totales.
const lenguaEspecifica = (l) => l < "8000";
export const esOtraEntidad = (ent) => ent <= "032" && ent !== NACIDOS_CDMX;
export const esOtroPais = (ent) => ent > "032" && ent !== "999";
export const nombreEnt = (n) => (n === "México" ? "Estado de México" : n);

const suma = (filas) => d3.sum(filas, (r) => r.num);

// Reparto de 100 puntos por el mayor residuo, para que la rejilla sume 100.
export function repartir100(valores) {
  const tot = d3.sum(valores);
  const base = valores.map((v, i) => ({i, x: (100 * v) / tot}));
  base.forEach((b) => { b.n = Math.floor(b.x); b.r = b.x - b.n; });
  let falta = 100 - d3.sum(base, (b) => b.n);
  for (const b of [...base].sort((a, c) => c.r - a.r)) { if (falta <= 0) break; b.n += 1; falta -= 1; }
  return base.map((b) => b.n);
}

export function preparar({origen, lenguasAlc}) {
  const filas = origen.map((r) => ({
    anio: +r.anio, tipo: r.tipo, num: +r.num, casos: +r.casos,
    ent: String(r.ent).padStart(3, "0"), ent_nombre: r.ent_nombre,
    lengua: String(r.lengua).padStart(4, "0"), lengua_nombre: r.lengua_nombre,
    cve_alc: String(r.cve_alc).padStart(3, "0")
  }));
  const nac = filas.filter((r) => r.tipo === "nacimiento");
  const res = filas.filter((r) => r.tipo === "residencia5");
  const aniosNac = [...new Set(nac.map((r) => r.anio))].sort();
  const aniosRes = [...new Set(res.map((r) => r.anio))].sort();

  const alcNombre = new Map(lenguasAlc.filter((r) => r.nivel === "alcaldia").map((r) => [String(r.cve).padStart(3, "0"), r.nombre]));
  const entNombre = new Map(filas.filter((r) => r.ent <= "032").map((r) => [r.ent, nombreEnt(r.ent_nombre)]));
  const entidades = [...entNombre.entries()].filter(([e]) => e !== NACIDOS_CDMX).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const lenguas = [...d3.rollup(filas.filter((r) => lenguaEspecifica(r.lengua)), (v) => v[0].lengua_nombre, (r) => r.lengua).entries()]
    .map(([clave, nombre]) => ({clave, nombre})).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const alcaldias = [...alcNombre.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));

  // ---------------------------------------------------------- historia
  const n25 = nac.filter((r) => r.anio === ANIO);
  const total = suma(n25);
  const ciudad = suma(n25.filter((r) => r.ent === NACIDOS_CDMX));
  const otra = suma(n25.filter((r) => esOtraEntidad(r.ent)));
  const pais = suma(n25.filter((r) => esOtroPais(r.ent)));
  const ne = suma(n25.filter((r) => r.ent === "999"));
  const [uOtra, uPais, uCiudad, uNe] = repartir100([otra, pais, ciudad, ne]);

  // Entidad de nacimiento por edicion (solo otras entidades del pais).
  const porAnioEnt = new Map(aniosNac.map((a) => [a, d3.rollup(nac.filter((r) => r.anio === a && esOtraEntidad(r.ent)), suma, (r) => r.ent)]));
  const totalOtraAnio = new Map(aniosNac.map((a) => [a, d3.sum([...porAnioEnt.get(a).values()])]));
  const maxEntAnio = d3.max(aniosNac, (a) => d3.max([...porAnioEnt.get(a).values()]));
  const ent25 = [...porAnioEnt.get(ANIO).entries()].map(([ent, num]) => ({ent, nombre: entNombre.get(ent), num, share: (100 * num) / otra}))
    .sort((a, b) => b.num - a.num);
  const casos25 = d3.rollup(n25.filter((r) => esOtraEntidad(r.ent)), (v) => d3.sum(v, (r) => r.casos), (r) => r.ent);

  // Alcaldia donde viven quienes nacieron en otra entidad.
  const otra25 = n25.filter((r) => esOtraEntidad(r.ent));
  const alcOtra = d3.rollup(otra25, suma, (r) => r.cve_alc);
  const maxAlc = d3.max(aniosNac, (a) => d3.max(d3.rollup(nac.filter((r) => r.anio === a && esOtraEntidad(r.ent)), suma, (r) => r.cve_alc).values()));
  const alcPorEnt = d3.rollup(otra25, suma, (r) => r.ent, (r) => r.cve_alc);

  // Lengua y lugar de nacimiento por alcaldia (mismo universo: la muestra).
  const porAlc = d3.rollup(n25, (v) => ({
    tot: suma(v),
    nah: suma(v.filter((r) => r.lengua === "0211")),
    cdmx: suma(v.filter((r) => r.ent === NACIDOS_CDMX))
  }), (r) => r.cve_alc);
  const lenguaPorEnt = d3.rollup(otra25.filter((r) => lenguaEspecifica(r.lengua)),
    (v) => d3.rollups(v, suma, (r) => r.lengua_nombre).sort((a, b) => b[1] - a[1])[0], (r) => r.ent);

  // Llegadas recientes: vivian en otra entidad cinco anos antes.
  const llegadas = aniosRes.map((a) => ({anio: a, num: suma(res.filter((r) => r.anio === a))}));
  const llegadasEnt = d3.rollup(res, suma, (r) => r.ent, (r) => r.anio);

  function sankey(destacada, tope = 6) {
    const ents = ent25.slice(0, tope).map((d) => d.ent);
    if (destacada && !ents.includes(destacada) && porAnioEnt.get(ANIO).has(destacada)) ents.push(destacada);
    const alcs = [...alcOtra.entries()].sort((a, b) => b[1] - a[1]).slice(0, tope).map(([c]) => c);
    const o = (r) => (ents.includes(r.ent) ? r.ent : "otras");
    const d = (r) => (alcs.includes(r.cve_alc) ? r.cve_alc : "otras");
    const flujos = d3.rollup(otra25, suma, (r) => o(r), (r) => d(r));
    const nodos = [...ents.map((e) => ({id: `o:${e}`, nombre: entNombre.get(e), lado: "o", clave: e})), {id: "o:otras", nombre: "Otras entidades", lado: "o", clave: "otras"},
      ...alcs.map((c) => ({id: `d:${c}`, nombre: alcNombre.get(c), lado: "d", clave: c})), {id: "d:otras", nombre: "Otras alcaldías", lado: "d", clave: "otras"}];
    const enlaces = [];
    for (const [oe, m] of flujos) for (const [dc, value] of m) if (value > 0) enlaces.push({source: `o:${oe}`, target: `d:${dc}`, value, oe, dc});
    return {nodos, enlaces, total: otra};
  }

  // Lo que la historia dice de una entidad elegida por el lector.
  function entidad(ent) {
    if (!ent) return null;
    const num = porAnioEnt.get(ANIO).get(ent) ?? 0;
    const alcs = [...(alcPorEnt.get(ent) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
    const lugar = ent25.findIndex((d) => d.ent === ent) + 1;
    return {
      ent, nombre: entNombre.get(ent), num, lugar,
      shareTotal: (100 * num) / total, shareOtra: (100 * num) / otra,
      pocosCasos: (casos25.get(ent) ?? 0) < 30,
      serie: aniosNac.map((a) => ({anio: a, num: porAnioEnt.get(a).get(ent) ?? 0})),
      alcs: alcs.map(([c, n]) => ({cve: c, nombre: alcNombre.get(c), num: n, share: (100 * n) / num})),
      lengua: lenguaPorEnt.get(ent) ?? null,
      llegadas: aniosRes.map((a) => ({anio: a, num: llegadasEnt.get(ent)?.get(a) ?? 0}))
    };
  }

  const historia = {
    total, ciudad, otra, pais, ne, unidades: {otra: uOtra, pais: uPais, ciudad: uCiudad, ne: uNe},
    aniosNac, porAnioEnt, totalOtraAnio, maxEntAnio, ent25, top5: ent25.slice(0, 5),
    alcOtra, maxAlc, alcPorEnt, porAlc, llegadas, sankey, entidad
  };

  // ---------------------------------------------------------- exploracion
  // Filas de la vista elegida en el panel; los totales incluyen los codigos de
  // lengua no especificos cuando no se filtra por lengua.
  function vista({medida, anio, lengua, alc}) {
    const base = (medida === "residencia5" ? res : nac).filter((r) => r.anio === anio && (!lengua || r.lengua === lengua) && (!alc || r.cve_alc === alc));
    const tot = suma(base);
    const porEnt = [...d3.rollup(base.filter((r) => esOtraEntidad(r.ent)), (v) => ({num: suma(v), casos: d3.sum(v, (r) => r.casos)}), (r) => r.ent).entries()]
      .map(([ent, d]) => ({ent, nombre: entNombre.get(ent), ...d, share: tot ? (100 * d.num) / tot : 0})).sort((a, b) => b.num - a.num);
    const resto = {
      ciudad: {num: suma(base.filter((r) => r.ent === NACIDOS_CDMX)), casos: d3.sum(base.filter((r) => r.ent === NACIDOS_CDMX), (r) => r.casos)},
      pais: {num: suma(base.filter((r) => esOtroPais(r.ent))), casos: d3.sum(base.filter((r) => esOtroPais(r.ent)), (r) => r.casos)},
      ne: {num: suma(base.filter((r) => r.ent === "999")), casos: d3.sum(base.filter((r) => r.ent === "999"), (r) => r.casos)}
    };
    const otraNum = d3.sum(porEnt, (d) => d.num);
    // Escala fija entre ediciones: el maximo de todas las ediciones con los
    // mismos filtros de medida, lengua y alcaldia.
    const fuente = medida === "residencia5" ? res : nac;
    const anios = medida === "residencia5" ? aniosRes : aniosNac;
    const tope = d3.max(anios, (a) => d3.max(d3.rollup(fuente.filter((r) => r.anio === a && esOtraEntidad(r.ent) && (!lengua || r.lengua === lengua) && (!alc || r.cve_alc === alc)), suma, (r) => r.ent).values()) ?? 0) || 1;
    return {porEnt, resto, tot, otraNum, tope};
  }

  return {historia, vista, aniosNac, aniosRes, entidades, entNombre, lenguas, alcaldias, alcNombre};
}
