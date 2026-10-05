// Sección censal del libro: panel por sección (el nivel manda), mapa
// navegador como vista alterna y gráfica por omisión, sobre las tablas del
// Censo (ITER nacional, muestra ampliada, INPI, serie por alcaldía y AGEB).
//
// Nació como la página de prueba /beta (ya retirada) y es pieza reutilizable: cada página la
// llama con sus datos y un estado inicial (nivel, población, vista) y, si
// quiere, oculta controles que no vienen al caso en esa sección.
// Ver docs/arquitectura-filtros.md.
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {catalogoGeo, contenedorDe, etiquetaGeo, nivelDe} from "./geografia.js";
import {panelSeccion, EDADES, SEPARADO} from "./panel-seccion.js";
import {mapaNavegador} from "./mapa-navegador.js";
import {cortesDalenius, leyenda, RAMPA_MORADA, ROJO_IBERO} from "./mapa.js";
import {figura, explicacion, tablaColumnas} from "./graficas.js";
import {punto, ejePct, GLOBO, globo} from "./base.js";

const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const pct = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? "sin dato" : `${Number(v).toFixed(d)} %`);
const entero = (n) => (n == null || n === "" || !Number.isFinite(Number(n)) ? "sin dato" : punto(Math.round(Number(n))));
const etiquetaEdad = (c) => EDADES.find((e) => e.clave === c)?.etiqueta ?? c;
const minuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);
// Antes de 2010 la pregunta de lengua empezaba a los 5 años: la foto de esas
// ediciones es de 5 años y más y la definición tiene que decirlo.
const definicionDe = (p, anio) => (p.clave === "hablantes" && anio < 2010 ? p.definicion.replace(/3 años y más/g, "5 años y más") : p.definicion);

// Poblaciones y cómo se llaman en cada fuente.
export const POBLACIONES = [
  {clave: "hablantes", etiqueta: "Hablan una lengua indígena", corto: "Hablantes de lengua indígena", tesela: "tasa_p3ym_hli", num: "P3YM_HLI", den: "P_3YMAS", serie: (anio) => (anio < 2010 ? "hablantes5" : "hablantes3"),
   // La serie en el tiempo va en un solo universo, 5 años y más, en las ocho
   // ediciones; por sexo solo hay 5 y más en 2005, 2015 y 2025, así que por
   // sexo la serie es de 3 años y más desde 2010.
   serieLarga: (anio, sexo) => (sexo === "Total" || anio < 2010 ? "hablantes5" : "hablantes3"),
   definicion: "Personas de 3 años y más que hablan alguna lengua indígena, sobre la población de 3 años y más."},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas", tesela: "tasa_phog_ind", num: "PHOG_IND", den: "POBTOT", serie: () => "hogares",
   definicion: "Personas en hogares donde la jefa o el jefe, su cónyuge o (desde 2020) alguno de sus ascendientes habla lengua indígena, sobre la población total."},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas", tesela: null, num: null, den: null, serie: () => "autoads",
   definicion: "Personas de 3 años y más que se consideran indígenas de acuerdo con su cultura, sobre la población de 3 años y más. Estimación de la muestra del Censo."},
  {clave: "todas", etiqueta: "Cualquier forma: hablan o se consideran", corto: "Hablan o se consideran indígenas", tesela: null, num: null, den: null, serie: () => "todas",
   definicion: "Personas de 3 años y más que hablan una lengua indígena o se consideran indígenas; una persona cuenta una sola vez. Los hogares indígenas no entran en esta unión porque la muestra no trae esa marca por persona. Estimación de la muestra del Censo."},
  {clave: "ambas", etiqueta: "Hablan y se consideran indígenas", corto: "Hablan y se consideran indígenas", tesela: null, num: null, den: null, serie: () => "ambas",
   definicion: "Personas de 3 años y más que hablan una lengua indígena y además se consideran indígenas, sobre la población de 3 años y más. Estimación de la muestra del Censo."},
  {clave: "inpi", etiqueta: "Población indígena (INPI)", corto: "Población indígena (INPI)", tesela: null, num: null, den: null, serie: null,
   definicion: "Definición del INPI: personas en hogares donde la jefa o el jefe, su cónyuge o alguno de sus ascendientes habla lengua indígena, más los hablantes que no viven en esos hogares, sobre la población total de todas las edades. No usa la autoadscripción. Con ella el INPI clasifica a cada municipio por presencia indígena."},
];
const MUESTRA = new Set(["autoads", "todas", "ambas"]);
export const pobDe = (k) => POBLACIONES.find((p) => p.clave === k);

/**
 * Normaliza las tablas tal como llegan de FileAttachment (typed) y arma los
 * índices. Se llama una vez por página y se comparte entre secciones.
 */
export function datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles}) {
  const nac = nacional.map((r) => ({...r, cve: String(r.cve).padStart(r.nivel === "municipio" ? 5 : 2, "0"), anio: Number(r.anio)}));
  const ser = serie.map((r) => ({...r, cve: r.nivel === "entidad" ? "09" : "09" + String(r.cve).padStart(3, "0"), anio: Number(r.anio)}));
  const ag = [...agebs.map((r) => ({...r, anio: 2020})), ...agebs2010.map((r) => ({...r, anio: 2010}))].map((r) => ({...r, cve_ageb: String(r.cve_ageb).padStart(13, "0")}));
  const catalogo = catalogoGeo(geoFilas);
  const INPI = new Map(inpi.map((r) => [`${r.nivel}|${String(r.cve).padStart(r.nivel === "municipio" ? 5 : 2, "0")}`, {...r, cve: String(r.cve).padStart(r.nivel === "municipio" ? 5 : 2, "0")}]));
  const INDICE_NAC = new Map(nac.map((r) => [`${r.nivel}|${r.cve}|${r.poblacion}|${r.sexo}|${r.edad}|${r.cota}`, r]));
  return {nac, ser, ag, inpi, catalogo, geoEntidades, pmtiles, INPI, INDICE_NAC};
}

/**
 * Sección censal completa. `inicial` fija el estado de arranque del panel
 * ({nivel, cveEnt, cveMun, poblacion, vista, anio}); `ocultar` esconde
 * controles que la sección no ofrece (por ejemplo ["vista"] sin mapa).
 */
export function seccionCenso(datos, {id = "sec", inicial = {}, ocultar = [], conMapa = true, tope = 25, fuentes = null} = {}) {
  const {nac, ser, ag, inpi, catalogo, geoEntidades, pmtiles, INPI, INDICE_NAC} = datos;
  const inpiDe = (nivel, cve) => INPI.get(`${nivel}|${cve}`) ?? null;
  const enCiudad = (geo) => geo.cveEnt === "09";
  const aniosSerie = (cve, poblacion) => (pobDe(poblacion).serie ? [...new Set(ser.filter((r) => r.cve === cve && r.poblacion === pobDe(poblacion).serie(r.anio) && r.sexo === "Total").map((r) => r.anio))].sort() : [2020]);

  const fuente = {
    poblaciones: POBLACIONES.map((p) => ({clave: p.clave, etiqueta: p.etiqueta})),
    nivelMax: (geo) => (geo.cveEnt === "09" ? "manzana" : "municipio"),
    poblacionesDe: (geo) => (geo.nivel === "ageb" || geo.nivel === "manzana" ? ["hablantes", "hogares"] : POBLACIONES.map((p) => p.clave)),
    aniosDe: ({geo, poblacion}) => {
      if (geo.nivel === "ageb" || geo.nivel === "manzana") return pmtiles.agebs2010 ? [2010, 2020] : [2020];
      if (geo.nivel === "municipio" && enCiudad(geo)) return aniosSerie("09", poblacion);
      return [2020];
    },
    sexoDe: ({geo, poblacion, anio}) => {
      if (poblacion === "hogares" || poblacion === "inpi" || geo.nivel === "ageb") return false;
      if (geo.nivel === "manzana") return true;
      if (geo.nivel === "municipio" && enCiudad(geo) && anio !== 2020) return ser.some((r) => r.anio === anio && r.poblacion === pobDe(poblacion).serie(anio) && r.sexo === "Mujeres");
      return true;
    },
    edadDe: ({geo, poblacion, anio}) => anio === 2020 && poblacion !== "hogares" && poblacion !== "inpi" && ["nacional", "entidad", "municipio"].includes(geo.nivel),
  };
  const panel = panelSeccion({fuente, catalogo, id});
  for (const k of ocultar) panel.mostrar(k, false);

  // ---------------------------------------------------------------- datos
  const CORTES = new Map();
  const cortesFijos = (clave, valores) => { if (!CORTES.has(clave)) CORTES.set(clave, cortesDalenius(valores, 5)); return CORTES.get(clave); };
  const filaNac = (nivel, cve, v) => INDICE_NAC.get(`${nivel}|${cve}|${v.poblacion}|${v.sexo}|${v.edad}|${MUESTRA.has(v.poblacion) || v.edad !== "Todas" ? "muestra" : "censo"}`) ?? null;
  const aValor = (r) => (r && r.den > 0 ? {valor: 100 * r.num / r.den, num: r.num, den: r.den, ee: r.ee, cota: r.cota, nombre: r.nombre} : null);
  const aValorInpi = (r) => (r && r.den > 0 ? {valor: 100 * r.num / r.den, num: r.num, den: r.den, ee: null, cota: "INPI (conteo)", nombre: r.nombre, tipo: r.tipo} : null);
  const celda = (nivel, cve, v) => (v.poblacion === "inpi" ? (v.sexo === "Total" && v.edad === "Todas" ? aValorInpi(inpiDe(nivel, cve)) : null) : aValor(filaNac(nivel, cve, v)));
  const valorAgeb = (r, p) => (r && r[p.tesela] != null ? {valor: r[p.tesela], num: r[p.num], den: r[p.den], cota: "censo", nombre: `AGEB ${r.cve_ageb.slice(-4)} (${r.alcaldia})`} : null);
  function valoresDe(v) {
    const p = pobDe(v.poblacion);
    const m = new Map();
    if (v.nivel === "nacional") m.set("00", celda("nacional", "00", v));
    else if (v.nivel === "entidad") for (const u of catalogo.todos("entidad")) m.set(u.cve, celda("entidad", u.cve, v));
    else if (v.nivel === "municipio") {
      if (enCiudad(v) && v.anio !== 2020 && p.serie) for (const r of ser.filter((r) => r.nivel === "alcaldia" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) m.set(r.cve, aValor(r));
      else for (const u of catalogo.hijos("municipio", v.cveEnt)) m.set(u.cve, celda("municipio", u.cve, v));
    } else if (v.nivel === "ageb") for (const r of ag.filter((r) => r.anio === v.anio && r.cve_ageb.startsWith(v.cveMun ?? "09"))) m.set(r.cve_ageb, valorAgeb(r, p));
    return m;
  }
  function cifraDe(nivel, cve, v) {
    const p = pobDe(v.poblacion);
    if (nivel === "nacional") return {nombre: "México", d: celda("nacional", "00", v)};
    if (nivel === "entidad") {
      const d = cve === "09" && v.anio !== 2020 && p.serie ? aValor(ser.find((r) => r.nivel === "entidad" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) : celda("entidad", cve, v);
      return {nombre: catalogo.de("entidad", cve)?.nombre ?? cve, d};
    }
    if (nivel === "municipio") {
      const nombre = catalogo.de("municipio", cve)?.nombre ?? cve;
      if (cve.startsWith("09") && v.anio !== 2020 && p.serie) return {nombre, d: aValor(ser.find((r) => r.nivel === "alcaldia" && r.cve === cve && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo))};
      if (v.anio === 2020 && celda("municipio", cve, v)) return {nombre, d: celda("municipio", cve, v)};
      const filas = ag.filter((r) => r.anio === v.anio && r.cve_ageb.startsWith(cve) && r[p.tesela] != null);
      const num = filas.reduce((s, r) => s + r[p.num], 0), den = filas.reduce((s, r) => s + r[p.den], 0);
      return {nombre, d: den ? {valor: 100 * num / den, num, den, cota: "suma de AGEB"} : null};
    }
    const r = ag.find((r) => r.anio === v.anio && r.cve_ageb === cve);
    return {nombre: `AGEB ${cve.slice(-4)}${r ? ` (${r.alcaldia})` : ""}`, d: valorAgeb(r, p)};
  }
  function globoDe({nivel, cve, propiedades: p, valor: d, v}) {
    const pob = pobDe(v.poblacion);
    const nombre = nivel === "entidad" ? catalogo.de("entidad", cve)?.nombre : nivel === "municipio" ? (catalogo.de("municipio", cve)?.nombre ?? p.NOMGEO) : nivel === "ageb" ? `AGEB ${String(cve).slice(-4)}` : (p.colonia ?? "Manzana");
    const val = d ? d.valor : (nivel === "manzana" ? p[pob.tesela + (v.sexo === "Mujeres" ? "_f" : v.sexo === "Hombres" ? "_m" : "")] : null);
    const personas = d ? `${entero(d.num)} de ${entero(d.den)}` : (nivel === "manzana" ? `población ${entero(p.POBTOT)}` : "");
    const pista = fuente.nivelMax(v) === nivel ? "" : `<div class="mapa-tarjeta-pista">Clic para bajar a ${nivelDe({entidad: "municipio", municipio: "ageb", ageb: "manzana"}[nivel])?.plural ?? "sus unidades"}</div>`;
    const tipo = nivel === "municipio" ? inpiDe("municipio", cve)?.tipo : null;
    const filaTipo = tipo ? `<tr><th>Tipo (INPI)</th><td>${escapar(tipo)}</td></tr>` : "";
    return `<div class="globo-titulo">${escapar(nombre)}</div><table class="globo-tabla"><tr><th>${escapar(pob.corto)}</th><td>${pct(val)}</td></tr><tr><th>Personas</th><td>${escapar(personas)}</td></tr>${filaTipo}</table>${pista}`;
  }
  const mapa = conMapa ? mapaNavegador({panel, catalogo, fuente, geoEntidades, pmtilesMunicipios: pmtiles.municipios, pmtilesAgebs: pmtiles.agebs, pmtilesAgebs2010: pmtiles.agebs2010, pmtilesManzanas: pmtiles.manzanas, pmtilesManzanas2010: pmtiles.manzanas2010, globoDe}) : null;
  if (!conMapa) panel.mostrar("vista", false);

  // -------------------------------------------------------------- pintado
  const cuerpo = document.createElement("div");
  cuerpo.className = "beta-cuerpo";
  let anchoCuerpo = 0;
  new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0 && Math.abs(w - anchoCuerpo) > 8) { anchoCuerpo = w; pintar(); } }).observe(cuerpo);
  const anchoGrafica = () => Math.max(320, anchoCuerpo || 900);

  // Eje FIJO por nivel, contenedor y población: el máximo de todos los sexos,
  // edades y años de esa población en ese ámbito. Con el máximo de la vista,
  // cambiar de año o de sexo movía el fondo y la misma barra cambiaba de largo
  // aparente; así cambia la barra y el fondo se queda.
  const TECHOS = new Map();
  function techoFijo(v) {
    const nivelCapa = v.nivel === "nacional" ? "entidad" : v.nivel;
    const cont = v.nivel === "ageb" ? (v.cveMun ?? "09") : (v.cveEnt ?? "");
    const clave = `${nivelCapa}|${cont}|${v.poblacion}`;
    if (!TECHOS.has(clave)) {
      const p = pobDe(v.poblacion);
      let vals;
      if (v.poblacion === "inpi") vals = inpi.filter((r) => r.nivel === nivelCapa && r.pct != null).map((r) => Number(r.pct));
      else if (nivelCapa === "ageb") vals = ag.filter((r) => r.cve_ageb.startsWith(cont) && r[p.tesela] != null).map((r) => Number(r[p.tesela]));
      else {
        vals = nac.filter((r) => r.nivel === nivelCapa && r.poblacion === v.poblacion && r.den > 0 && (nivelCapa !== "municipio" || !cont || r.cve.startsWith(cont))).map((r) => 100 * r.num / r.den);
        if (nivelCapa === "municipio" && cont === "09") {
          const claves = v.poblacion === "hablantes" ? ["hablantes3", "hablantes5"] : [v.poblacion];
          vals.push(...ser.filter((r) => r.nivel === "alcaldia" && claves.includes(r.poblacion) && r.den > 0).map((r) => 100 * r.num / r.den));
        }
      }
      TECHOS.set(clave, Math.min(100, Math.max(1, ...vals) * 1.08));
    }
    return TECHOS.get(clave);
  }
  const techoNacional = (poblaciones) => Math.min(100, Math.max(1, ...nac.filter((r) => r.nivel === "nacional" && poblaciones.includes(r.poblacion) && r.den > 0).map((r) => 100 * r.num / r.den)) * 1.1);

  function pintar() {
    const v0 = panel.value;
    const pob = pobDe(v0.poblacion === SEPARADO ? v0.poblaciones[0] : v0.poblacion);
    const v = {...v0, poblacion: v0.poblacion === SEPARADO ? v0.poblaciones[0] : v0.poblacion, sexo: v0.sexo === SEPARADO ? "Total" : v0.sexo, edad: v0.edad === SEPARADO ? "Todas" : v0.edad, anio: v0.anio === SEPARADO ? (v0.anios.includes(2020) ? 2020 : v0.anios.at(-1)) : v0.anio};
    const valores = valoresDe(v);
    const nivelCapa = v.nivel === "nacional" ? "entidad" : v.nivel;
    const sufijo = v.sexo === "Mujeres" ? "_f" : v.sexo === "Hombres" ? "_m" : "";
    const campo = v.nivel === "manzana" ? pob.tesela + sufijo : pob.tesela;
    let cortes;
    if (v.nivel === "ageb" || v.nivel === "manzana") cortes = cortesFijos(`ageb|${pob.tesela}`, ag.map((r) => r[pob.tesela]).filter((x) => x != null).map(Number));
    else if (v.poblacion === "inpi") cortes = cortesFijos(`${nivelCapa}|inpi`, inpi.filter((r) => r.nivel === nivelCapa && r.pct != null).map((r) => Number(r.pct)));
    else if (v.nivel === "municipio") cortes = cortesFijos(`municipio|${v.poblacion}`, nac.filter((r) => r.nivel === "municipio" && r.poblacion === v.poblacion && r.sexo === "Total" && r.edad === "Todas").map((r) => 100 * r.num / r.den));
    else cortes = cortesFijos(`entidad|${v.poblacion}`, nac.filter((r) => r.nivel === "entidad" && r.poblacion === v.poblacion && r.den > 0).map((r) => 100 * r.num / r.den));
    const colorDe = (x) => (x == null ? "#d9d9d9" : RAMPA_MORADA[Math.min(RAMPA_MORADA.length - 1, cortes.filter((c, i) => i > 0 && x >= c).length)]);
    const formatoLeyenda = (x) => x.toFixed(cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1) + " %";
    const etiqueta = `${pob.corto}${v.sexo !== "Total" ? `, ${v.sexo.toLowerCase()}` : ""}${v.edad !== "Todas" ? `, ${etiquetaEdad(v.edad).toLowerCase()}` : ""}`;
    const tituloLeyenda = v.nivel === "nacional" ? "Formas de ser indígena (% de la población de 3 años y más; los cortes son los de hablantes por entidad)" : `${etiqueta} (% de la población de cada ${nivelDe(nivelCapa).singular})`;

    const cont = contenedorDe(v);
    const cifra = v.seleccion ? cifraDe(nivelCapa, v.seleccion, v) : cifraDe(cont.nivel, cont.cve, v);
    if (mapa) {
      const pista = fuente.nivelMax(v) === nivelCapa ? "Este es el nivel más fino que publica la fuente" : "En el mapa, clic en una unidad para bajar de nivel; las migas suben";
      const tarjetaMapa = `<div class="globo-titulo">${escapar(cifra.nombre)} · ${v.anio}</div><div class="globo-sub">${escapar(etiqueta)}</div>
        <div class="mapa-cifra-valor">${cifra.d ? pct(cifra.d.valor) : "sin dato"}${cifra.d?.ee ? `<span class="mapa-cifra-error"> ± ${(100 * cifra.d.ee * 1.96).toFixed(1)}</span>` : ""}</div>
        <div class="mapa-cifra-nota">${cifra.d ? `${entero(cifra.d.num)} de ${entero(cifra.d.den)} personas · ${escapar(cifra.d.cota === "muestra" ? "estimación de la muestra" : cifra.d.cota)}` : "la fuente no publica esta celda"}</div>
        <div class="mapa-tarjeta-pista">${escapar(pista)}</div>`;
      mapa.pintar({v, valores: v.nivel === "nacional" ? valoresDe({...v, nivel: "entidad"}) : valores, campo, cortes, titulo: tituloLeyenda, formato: formatoLeyenda, notaSinDato: "Sin dato publicado", tarjeta: tarjetaMapa});
      const enMapa = v.vista === "mapa";
      mapa.hidden = !enMapa;
      cuerpo.hidden = enMapa;
    }

    const unidadDe = (cve, d) => d?.nombre ?? catalogo.de(nivelCapa, cve)?.nombre ?? cve;
    const aFilas = (m, cat) => [...m.entries()].filter(([, d]) => d).map(([cve, d]) => ({cve, nombre: unidadDe(cve, d), pct: d.valor, num: d.num, den: d.den, ee: d.ee, cota: d.cota, ...cat}));
    const dims = [];
    if (v0.poblacion === SEPARADO && v.nivel !== "nacional") dims.push({campo: "poblacion", cats: v0.poblaciones, rotulo: "población", etiqueta: (c) => pobDe(c).corto});
    if (v0.sexo === SEPARADO) dims.push({campo: "sexo", cats: ["Mujeres", "Hombres"], rotulo: "sexo", etiqueta: (c) => c});
    if (v0.edad === SEPARADO) dims.push({campo: "edad", cats: EDADES.filter((e) => e.clave !== "Todas" && e.clave !== SEPARADO).map((e) => e.clave), rotulo: "grupo de edad", etiqueta: etiquetaEdad});
    if (v0.anio === SEPARADO) dims.push({campo: "anio", cats: v0.anios, rotulo: "edición", etiqueta: String});
    const filas = aFilas(valores, {}).sort((a, b) => b.pct - a.pct);
    const nodos = [];
    const notaSel = v.seleccion && cifra.d ? ` · resaltado: ${cifra.nombre}, ${pct(cifra.d.valor)}` : "";
    const esSel = (r) => v.seleccion && r.cve === v.seleccion;
    const rotuloUnidad = v.nivel === "nacional" ? "Población" : nivelDe(nivelCapa).singular.charAt(0).toUpperCase() + nivelDe(nivelCapa).singular.slice(1);
    const renglones = [[rotuloUnidad, (r) => r.nombre], ["Corte", (r) => r.categoria || null], ["Porcentaje", (r) => `${r.pct.toFixed(1)} %${r.ee ? ` (± ${(196 * r.ee).toFixed(1)})` : ""}`], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`]];
    const marcasBarras = (datos, opciones = {}, sel = esSel) => [
      Plot.barX(datos, {x: "pct", y: "nombre", fill: (r) => colorDe(r.pct), stroke: (r) => (sel(r) ? ROJO_IBERO : "none"), strokeWidth: 2, ...opciones}),
      Plot.ruleX(datos.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => r.pct + 196 * r.ee, y: "nombre", stroke: "currentColor", strokeOpacity: 0.55, clip: "frame", ...opciones}),
      Plot.text(datos, {x: "pct", y: "nombre", text: (r) => `${r.pct.toFixed(1)} %`, dx: 6, textAnchor: "start", fontSize: 11.5, fontWeight: (r) => (sel(r) ? "bold" : "normal"), ...opciones}),
      Plot.tip(datos, Plot.pointerY({x: "pct", y: "nombre", maxRadius: Infinity, ...GLOBO, ...opciones, ...globo(renglones)})),
      Plot.ruleX([0]),
    ];
    const subtituloBase = `${v.anio}${v.sexo !== "Total" ? ` · ${v.sexo}` : ""}${v.edad !== "Todas" ? ` · ${etiquetaEdad(v.edad)}` : ""}`;
    const pieBase = `${filas.some((r) => r.cota === "muestra") ? "Censo 2020, cuestionario ampliado (estimación con intervalo)" : "Censo (INEGI)"} · cada barra es una ${nivelDe(nivelCapa).singular}; el color sigue los cortes del mapa`;
    const leyendaChica = () => leyenda({cortes, titulo: tituloLeyenda, formato: formatoLeyenda, notaSinDato: "Sin dato publicado"});
    const conSeleccion = (lista, n) => { const top = lista.slice(0, n); const s = filas.find(esSel); if (s && !top.some(esSel)) top.push(s); return top; };
    const ejeX = "% de la población";

    if (v.nivel === "manzana") {
      nodos.push(html`<p class="beta-nota">Las manzanas solo se dibujan en el mapa: el navegador no carga la tabla de 66 mil manzanas. Cambia "Ver como" a Mapa y pasa el cursor por una para ver su cifra.</p>`);
    } else if (v.nivel === "nacional") {
      const dimsN = dims.filter((d) => d.campo !== "poblacion");
      const combos = dimsN.reduce((acc, d) => acc.flatMap((c) => d.cats.map((cat) => [...c, cat])), [[]]);
      const filasPais = combos.flatMap((combo) => {
        const vc = {...v}; const etiquetas = [];
        dimsN.forEach((d, i) => { vc[d.campo] = combo[i]; etiquetas.push(d.etiqueta(combo[i])); });
        return v0.poblaciones.map((k) => { const d = celda("nacional", "00", {...vc, poblacion: k}); return d ? {cve: k, nombre: pobDe(k).corto, pct: d.valor, num: d.num, den: d.den, ee: d.ee, cota: d.cota, categoria: etiquetas.join(" · "), c0: etiquetas[0] ?? "", c1: etiquetas[1] ?? ""} : null; }).filter(Boolean);
      });
      const selPob = v0.poblacion !== SEPARADO ? v0.poblacion : null;
      const esSelPob = (r) => r.cve === selPob;
      const ordenPob = v0.poblaciones.filter((k) => filasPais.some((r) => r.cve === k)).map((k) => pobDe(k).corto);
      const maxP = techoNacional(v0.poblaciones);
      const notaHog = (v.sexo !== "Total" || v.edad !== "Todas" || dimsN.length) && v0.poblaciones.includes("hogares") ? " Los hogares indígenas y la población indígena del INPI no se publican por sexo ni por edad y quedan fuera de este corte." : "";
      const sub = `${subtituloBase}${selPob ? ` · resaltado: ${pob.corto}` : ""}${dimsN.length ? ` · un panel por ${dimsN.map((d) => d.rotulo).join(" y ")}` : ""}`;
      const pieP = `Censo 2020: conteo (ITER) para hablantes, hogares y la definición del INPI (esta sobre la población total); cuestionario ampliado para el resto, con intervalo de 95 % · cada barra es una forma de ser indígena.${notaHog}`;
      const ejeP = "% de la población (3 años y más; INPI y hogares sobre la población total)";
      const alto = 60 + 26 * ordenPob.length;
      if (!dimsN.length) nodos.push(figura({titulo: "México: formas de ser indígena", subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 60, height: alto, width: anchoGrafica(), x: {label: ejeP, grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasBarras(filasPais, {}, esSelPob)})]));
      else if (dimsN.length === 1) nodos.push(figura({titulo: `México: formas de ser indígena por ${dimsN[0].rotulo}`, subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 50, height: alto, width: anchoGrafica(), fx: {label: null, domain: dimsN[0].cats.map(dimsN[0].etiqueta)}, x: {label: ejeP, grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasBarras(filasPais, {fx: "categoria"}, esSelPob)})]));
      else nodos.push(figura({titulo: `México: formas de ser indígena por ${dimsN.map((d) => d.rotulo).join(" y ")}`, subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 110, height: (50 + 24 * ordenPob.length) * dimsN[1].cats.length, width: anchoGrafica(), fx: {label: null, domain: dimsN[0].cats.map(dimsN[0].etiqueta)}, fy: {label: null, domain: dimsN[1].cats.map(dimsN[1].etiqueta)}, x: {label: ejeP, grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasBarras(filasPais, {fx: "c0", fy: "c1"}, esSelPob)})]));
    } else if (!dims.length) {
      const top = conSeleccion(filas, tope);
      nodos.push(figura({titulo: `${etiquetaGeo(v, catalogo)}: ${minuscula(pob.corto)}`, subtitulo: `${subtituloBase}${filas.length > tope ? ` · las ${tope} con mayor proporción de ${filas.length}` : ""}${notaSel}`, pie: pieBase},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 60, height: Math.max(220, 22 * top.length + 60), width: anchoGrafica(),
          x: {label: ejeX, grid: true, domain: [0, techoFijo(v)]}, y: {label: null, domain: top.map((r) => r.nombre)}, marks: marcasBarras(top)})]));
    } else {
      const combos = dims.reduce((acc, d) => acc.flatMap((c) => d.cats.map((cat) => [...c, cat])), [[]]);
      const nCombos = combos.length;
      const orden = conSeleccion(filas, nCombos > 4 ? 30 : 20).map((r) => r.nombre);
      const porCat = combos.flatMap((combo) => {
        const vc = {...v}; const etiquetas = [];
        dims.forEach((d, i) => { vc[d.campo] = combo[i]; etiquetas.push(d.etiqueta(combo[i])); });
        return aFilas(valoresDe(vc), {categoria: etiquetas.join(" · "), c0: etiquetas[0], c1: etiquetas[1] ?? ""}).filter((r) => orden.includes(r.nombre));
      });
      const rotulos = dims.map((d) => d.rotulo).join(" y ");
      const maxX = dims.some((d) => d.campo === "poblacion") ? Math.max(...v0.poblaciones.map((k) => techoFijo({...v, poblacion: k}))) : techoFijo(v);
      const conPob = dims.some((d) => d.campo === "poblacion");
      const otras = dims.filter((d) => d.campo !== "poblacion").map((d) => d.rotulo).join(" y ");
      const tituloFig = conPob ? `${etiquetaGeo(v, catalogo)}: formas de ser indígena${otras ? ` por ${otras}` : ""}` : `${etiquetaGeo(v, catalogo)}: ${minuscula(pob.corto)} por ${rotulos}`;
      if (nCombos <= 4) nodos.push(figura({titulo: tituloFig, subtitulo: `${subtituloBase} · un panel por ${rotulos}, las ${orden.length} unidades con mayor proporción`, pie: pieBase},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 50, height: Math.max(240, 22 * orden.length + 70), width: anchoGrafica(), fx: {label: null, domain: combos.map((c) => c.map((x, i) => dims[i].etiqueta(x)).join(" · "))}, x: {label: ejeX, grid: true, domain: [0, maxX]}, y: {label: null, domain: orden}, marks: marcasBarras(porCat, {fx: "categoria"})})]));
      else if (dims.length === 2 && dims.every((d) => d.cats.length <= 4)) {
        const [d0, d1] = dims;
        nodos.push(figura({titulo: tituloFig, subtitulo: `${subtituloBase} · columnas por ${d0.rotulo}, filas por ${d1.rotulo}; las ${orden.length} unidades con mayor proporción`, pie: pieBase},
          [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 110, height: Math.max(240, (20 * orden.length + 50) * d1.cats.length), width: anchoGrafica(), fx: {label: null, domain: d0.cats.map(d0.etiqueta)}, fy: {label: null, domain: d1.cats.map(d1.etiqueta)}, x: {label: ejeX, grid: true, domain: [0, maxX]}, y: {label: null, domain: orden}, marks: marcasBarras(porCat, {fx: "c0", fy: "c1"})})]));
      } else nodos.push(figura({titulo: tituloFig, subtitulo: `Mapa de calor: una columna por ${rotulos}; las ${orden.length} unidades con mayor proporción en ${v.anio}`, pie: `${pieBase.split(" · ")[0]} · cada celda es una ${nivelDe(nivelCapa).singular} en una categoría; el color sigue los cortes del mapa; en blanco, celdas sin dato`},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginTop: 34, height: Math.max(240, 22 * orden.length + 60), width: anchoGrafica(), padding: 0.08,
          x: {label: null, domain: combos.map((c) => c.map((x, i) => dims[i].etiqueta(x)).join(" · ")), axis: "top", tickRotate: nCombos > 10 ? -30 : 0}, y: {label: null, domain: orden},
          marks: [
            Plot.cell(porCat, {x: "categoria", y: "nombre", fill: (r) => colorDe(r.pct), inset: 0.5, stroke: (r) => (esSel(r) ? ROJO_IBERO : "none"), strokeWidth: 2}),
            Plot.text(porCat, {x: "categoria", y: "nombre", text: (r) => r.pct.toFixed(1), fontSize: 10.5, fill: (r) => (RAMPA_MORADA.indexOf(colorDe(r.pct)) >= 3 ? "white" : "black")}),
            Plot.tip(porCat, Plot.pointer({x: "categoria", y: "nombre", maxRadius: Infinity, ...GLOBO, ...globo(renglones)})),
          ]})]));
    }

    // Serie por alcaldía: solo la ciudad y sus alcaldías tienen 1990 - 2025.
    const cveSerie = v.seleccion && nivelCapa === "municipio" && v.seleccion.startsWith("09") ? v.seleccion : cont.nivel === "entidad" && cont.cve === "09" ? "09" : cont.nivel === "municipio" && cont.cve.startsWith("09") ? cont.cve : null;
    if (cveSerie && v.nivel !== "nacional" && pob.serie) {
      const clave = (anio) => (pob.serieLarga ?? pob.serie)(anio, v.sexo);
      const s = ser.filter((r) => r.cve === cveSerie && r.poblacion === clave(r.anio) && r.sexo === v.sexo && r.den > 0).map((r) => ({...r, pct: 100 * r.num / r.den}));
      const universos = [...new Set(s.map((r) => r.universo).filter(Boolean).map((u) => u.replace(/ \(.*\)$/, "")))];
      const subSerie = universos.length === 1 ? `Serie por edición · ${universos[0].toLowerCase()}` : "Serie por edición; el universo cambia de 5 a 3 años y más en 2010";
      const nombreSerie = cveSerie === "09" ? "Ciudad de México" : (catalogo.de("municipio", cveSerie)?.nombre ?? cveSerie);
      if (s.length > 1) nodos.push(figura({titulo: `${nombreSerie}: ${minuscula(pob.corto)}, ${s[0].anio} - ${s.at(-1).anio}`, subtitulo: subSerie, pie: "Censos, conteos e intercensales (INEGI) · cada punto es una edición; los puntos huecos, estimaciones de encuesta"},
        [Plot.plot({height: 260, width: anchoGrafica(), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: ejePct(null, {zero: true}),
          marks: [Plot.line(s, {x: "anio", y: "pct", stroke: RAMPA_MORADA[3], strokeWidth: 2}), Plot.dot(s, {x: "anio", y: "pct", fill: (r) => (r.cota === "censo" ? RAMPA_MORADA[3] : "white"), stroke: RAMPA_MORADA[3], r: 4.5}),
            Plot.text(s, {x: "anio", y: "pct", text: (r) => `${r.pct.toFixed(1)} %`, dy: -10, fontSize: 11}),
            Plot.tip(s, Plot.pointerX({x: "anio", y: "pct", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Porcentaje", (r) => `${r.pct.toFixed(2)} %${r.ee ? ` (± ${(196 * r.ee).toFixed(2)})` : ""}`], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`], ["Fuente", (r) => (r.cota === "censo" ? "conteo censal" : "estimación de encuesta")]])})),
            Plot.ruleY([0])]})]));
    }
    if (fuentes) nodos.push(fuentes(v));
    nodos.push(explicacion(`${v0.poblacion === SEPARADO ? "Cada población es una forma distinta de contar a la población indígena; se comparan una junto a otra sin sumarlas. " : definicionDe(pob, v.anio) + " "}${["nacional", "entidad", "municipio"].includes(v.nivel) ? "Las cifras por sexo y las de hogares vienen del conteo censal (ITER); las de grupo de edad, la autoadscripción, la unión y la intersección, de la muestra del cuestionario ampliado, con su intervalo de 95 %." : "Las cifras por AGEB y manzana vienen del tabulado del Censo; las celdas suprimidas por confidencialidad se dejan sin dato."}`));
    if (filas.length && v.nivel !== "manzana" && v.nivel !== "nacional") nodos.push(tablaColumnas(filas, [
      {etiqueta: "Unidad", valor: (r) => r.nombre}, {etiqueta: "Clave", valor: (r) => r.cve}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)},
      {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.den)},
      {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Cota", valor: (r) => r.cota},
      ...(nivelCapa === "municipio" ? [{etiqueta: "Tipo de municipio (INPI)", valor: (r) => inpiDe("municipio", r.cve)?.tipo ?? ""}] : []),
    ], {titulo: "Ver la tabla del nivel"}));
    cuerpo.replaceChildren(...nodos);
  }
  panel.addEventListener("input", pintar);
  // Estado inicial de la sección: claves, nivel y selectores.
  const {poblacion, vista, anio, sexo, edad, ...geoInicial} = inicial;
  for (const [k, val] of Object.entries({poblacion, vista, anio, sexo, edad})) if (val != null) { const sel = panel.querySelector(`#${id}-${k}`); if (sel) sel.value = String(val); }
  if (Object.keys(geoInicial).length) panel.set(geoInicial); else pintar();
  const nodo = html`<section class="beta-seccion">${panel}<div class="beta-vista">${mapa ?? ""}${cuerpo}</div></section>`;
  nodo.panel = panel;
  nodo.repintar = pintar;
  return nodo;
}
