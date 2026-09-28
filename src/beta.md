---
title: Beta de filtros
toc: false
---

# Beta: geografía y filtros en una sola sección

Prueba de la arquitectura de filtros del libro con datos reales. El nivel
manda: el país como una sola cifra, las entidades, los municipios, las AGEB y
las manzanas de la Ciudad de México. Entidad, municipio y AGEB acotan o
resaltan una unidad dentro del nivel. El análisis es la vista por omisión y
"Ver como: Mapa" abre el mapa en su lugar, donde un clic sobre la unidad baja
de nivel y las migas suben. Cada filtro aparece solo donde su fuente lo
publica: el grupo de edad existe en 2020 por país, entidad y municipio
(muestra del Censo), el sexo no existe para los hogares indígenas ni por AGEB,
y la serie 1990 - 2025 solo por alcaldía de la ciudad. La población admite
cinco formas de contar (hablan, viven en hogar indígena, se consideran,
hablan o se consideran, hablan y se consideran) y "por separado" las compara.

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {catalogoGeo, contenedorDe, etiquetaGeo, nivelDe} from "./components/geografia.js";
import {panelSeccion, SEXOS, EDADES, SEPARADO} from "./components/panel-seccion.js";
import {mapaNavegador} from "./components/mapa-navegador.js";
import {cortesPorCuantil, leyenda, RAMPA_MORADA, ROJO_IBERO} from "./components/mapa.js";
import {figura, explicacion, tablaColumnas} from "./components/graficas.js";
import {punto} from "./components/base.js";

const [nacional, serie, agebs, agebs2010, geoFilas, geoEntidades] = await Promise.all([
  FileAttachment("data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("data/geo_catalogo.csv").csv(),
  FileAttachment("data/mx_entidades.json").json(),
]);
let pmtilesAgebs2010 = null, pmtilesManzanas2010 = null;
try { pmtilesAgebs2010 = await FileAttachment("data/agebs_2010.pmtiles").url(); } catch { pmtilesAgebs2010 = null; }
try { pmtilesManzanas2010 = await FileAttachment("data/manzanas_2010.pmtiles").url(); } catch { pmtilesManzanas2010 = null; }
const pmtilesMunicipios = await FileAttachment("data/municipios.pmtiles").url();
const pmtilesAgebs = await FileAttachment("data/agebs.pmtiles").url();
const pmtilesManzanas = await FileAttachment("data/manzanas.pmtiles").url();
```

```js
// Las claves se leen como texto con sus ceros; `typed` las volvería números.
const nac = nacional.map((r) => ({...r, cve: String(r.cve).padStart(r.nivel === "municipio" ? 5 : 2, "0"), anio: Number(r.anio)}));
const ser = serie.map((r) => ({...r, cve: r.nivel === "entidad" ? "09" : "09" + String(r.cve).padStart(3, "0"), anio: Number(r.anio)}));
const ag = [...agebs.map((r) => ({...r, anio: 2020})), ...agebs2010.map((r) => ({...r, anio: 2010}))].map((r) => ({...r, cve_ageb: String(r.cve_ageb).padStart(13, "0")}));
const catalogo = catalogoGeo(geoFilas);
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const pct = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? "sin dato" : `${Number(v).toFixed(d)} %`);
const entero = (n) => (n == null || n === "" || !Number.isFinite(Number(n)) ? "sin dato" : punto(Math.round(Number(n))));

// Poblaciones y cómo se llaman en cada fuente.
const POBLACIONES = [
  {clave: "hablantes", etiqueta: "Hablan una lengua indígena", corto: "Hablantes de lengua indígena", tesela: "tasa_p3ym_hli", num: "P3YM_HLI", den: "P_3YMAS", serie: (anio) => (anio < 2010 ? "hablantes5" : "hablantes3"),
   definicion: "Personas de 3 años y más que hablan alguna lengua indígena, sobre la población de 3 años y más."},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas", tesela: "tasa_phog_ind", num: "PHOG_IND", den: "POBTOT", serie: () => "hogares",
   definicion: "Personas en hogares donde la jefa o el jefe, su cónyuge o (desde 2020) alguno de sus ascendientes habla lengua indígena, sobre la población total."},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas", tesela: null, num: null, den: null, serie: () => "autoads",
   definicion: "Personas de 3 años y más que se consideran indígenas de acuerdo con su cultura, sobre la población de 3 años y más. Estimación de la muestra del Censo."},
  {clave: "todas", etiqueta: "Cualquier forma: hablan o se consideran", corto: "Hablan o se consideran indígenas", tesela: null, num: null, den: null, serie: () => "todas",
   definicion: "Personas de 3 años y más que hablan una lengua indígena o se consideran indígenas; una persona cuenta una sola vez. Los hogares indígenas no entran en esta unión porque la muestra no trae esa marca por persona. Estimación de la muestra del Censo."},
  {clave: "ambas", etiqueta: "Hablan y se consideran indígenas", corto: "Hablan y se consideran indígenas", tesela: null, num: null, den: null, serie: () => "ambas",
   definicion: "Personas de 3 años y más que hablan una lengua indígena y además se consideran indígenas, sobre la población de 3 años y más. Estimación de la muestra del Censo."},
];
const MUESTRA = new Set(["autoads", "todas", "ambas"]);
const pobDe = (k) => POBLACIONES.find((p) => p.clave === k);
const enCiudad = (geo) => geo.cveEnt === "09";
const aniosSerie = (cve, poblacion) => [...new Set(ser.filter((r) => r.cve === cve && r.poblacion === pobDe(poblacion).serie(r.anio) && r.sexo === "Total").map((r) => r.anio))].sort();

// Declaración de la fuente: hasta dónde llega y qué publica en cada nivel.
const fuente = {
  poblaciones: POBLACIONES.map((p) => ({clave: p.clave, etiqueta: p.etiqueta})),
  nivelMax: (geo) => (geo.cveEnt === "09" ? "manzana" : "municipio"),
  poblacionesDe: (geo) => (geo.nivel === "ageb" || geo.nivel === "manzana" ? ["hablantes", "hogares"] : POBLACIONES.map((p) => p.clave)),
  aniosDe: ({geo, poblacion}) => {
    if (geo.nivel === "ageb" || geo.nivel === "manzana") return pmtilesAgebs2010 ? [2010, 2020] : [2020];
    if (geo.nivel === "municipio" && enCiudad(geo)) return aniosSerie("09", poblacion);
    return [2020];
  },
  sexoDe: ({geo, poblacion, anio}) => {
    if (poblacion === "hogares" || geo.nivel === "ageb") return false;
    if (geo.nivel === "manzana") return true;
    if (geo.nivel === "municipio" && enCiudad(geo) && anio !== 2020) return ser.some((r) => r.anio === anio && r.poblacion === pobDe(poblacion).serie(anio) && r.sexo === "Mujeres");
    return true;
  },
  edadDe: ({geo, poblacion, anio}) => anio === 2020 && poblacion !== "hogares" && ["nacional", "entidad", "municipio"].includes(geo.nivel),
};
const panel = panelSeccion({fuente, catalogo, id: "beta"});
```

```js
// Valores de cada unidad del nivel, cifra de una unidad y globo del mapa.
const CORTES = new Map();
function cortesFijos(clave, valores) {
  if (!CORTES.has(clave)) CORTES.set(clave, cortesPorCuantil(valores, 5));
  return CORTES.get(clave);
}
// Índice de la tabla nacional: 77 mil filas se consultan por clave, no con
// un recorrido por cada uno de los 2,478 municipios (eso tardaba segundos).
const INDICE_NAC = new Map(nac.map((r) => [`${r.nivel}|${r.cve}|${r.poblacion}|${r.sexo}|${r.edad}|${r.cota}`, r]));
function filaNac(nivel, cve, v) {
  const cota = MUESTRA.has(v.poblacion) || v.edad !== "Todas" ? "muestra" : "censo";
  return INDICE_NAC.get(`${nivel}|${cve}|${v.poblacion}|${v.sexo}|${v.edad}|${cota}`) ?? null;
}
const aValor = (r) => (r && r.den > 0 ? {valor: 100 * r.num / r.den, num: r.num, den: r.den, ee: r.ee, cota: r.cota, nombre: r.nombre} : null);
const valorAgeb = (r, p) => (r && r[p.tesela] != null ? {valor: r[p.tesela], num: r[p.num], den: r[p.den], cota: "censo", nombre: `AGEB ${r.cve_ageb.slice(-4)} (${r.alcaldia})`} : null);
// Valores de todas las unidades del nivel para los cortes de v (sexo, edad, año).
function valoresDe(v) {
  const p = pobDe(v.poblacion);
  const m = new Map();
  if (v.nivel === "nacional") {
    m.set("00", aValor(filaNac("nacional", "00", v)));
  } else if (v.nivel === "entidad") {
    for (const u of catalogo.todos("entidad")) m.set(u.cve, aValor(filaNac("entidad", u.cve, v)));
  } else if (v.nivel === "municipio") {
    if (enCiudad(v) && v.anio !== 2020) {
      for (const r of ser.filter((r) => r.nivel === "alcaldia" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) m.set(r.cve, aValor(r));
    } else {
      for (const u of catalogo.hijos("municipio", v.cveEnt)) m.set(u.cve, aValor(filaNac("municipio", u.cve, v)));
    }
  } else if (v.nivel === "ageb") {
    for (const r of ag.filter((r) => r.anio === v.anio && r.cve_ageb.startsWith(v.cveMun ?? "09"))) m.set(r.cve_ageb, valorAgeb(r, p));
  }
  return m;
}
// Cifra de una unidad concreta (el contenedor o la resaltada).
function cifraDe(nivel, cve, v) {
  const p = pobDe(v.poblacion);
  if (nivel === "nacional") return {nombre: "México", d: aValor(filaNac("nacional", "00", v))};
  if (nivel === "entidad") {
    const d = cve === "09" && v.anio !== 2020 ? aValor(ser.find((r) => r.nivel === "entidad" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) : aValor(filaNac("entidad", cve, v));
    return {nombre: catalogo.de("entidad", cve)?.nombre ?? cve, d};
  }
  if (nivel === "municipio") {
    const nombre = catalogo.de("municipio", cve)?.nombre ?? cve;
    if (cve.startsWith("09") && v.anio !== 2020) return {nombre, d: aValor(ser.find((r) => r.nivel === "alcaldia" && r.cve === cve && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo))};
    if (v.anio === 2020 && filaNac("municipio", cve, v)) return {nombre, d: aValor(filaNac("municipio", cve, v))};
    // La alcaldía como suma de sus AGEB con cifra publicada (pierde lo suprimido).
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
  return `<div class="globo-titulo">${escapar(nombre)}</div><table class="globo-tabla"><tr><th>${escapar(pob.corto)}</th><td>${pct(val)}</td></tr><tr><th>Personas</th><td>${escapar(personas)}</td></tr></table>${pista}`;
}
const mapa = mapaNavegador({panel, catalogo, fuente, geoEntidades, pmtilesMunicipios, pmtilesAgebs, pmtilesAgebs2010, pmtilesManzanas, pmtilesManzanas2010, globoDe});
```

```js
const cuerpo = document.createElement("div");
cuerpo.className = "beta-cuerpo";
// El ancho de la gráfica se mide en el DOM con un solo ResizeObserver
// (lección 87): al primer pintado el cuerpo aún mide cero.
let anchoCuerpo = 0;
new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0 && Math.abs(w - anchoCuerpo) > 8) { anchoCuerpo = w; pintar(); } }).observe(cuerpo);
const anchoGrafica = () => Math.max(320, anchoCuerpo || 900);
const etiquetaEdad = (c) => EDADES.find((e) => e.clave === c)?.etiqueta ?? c;

function pintar() {
  const v0 = panel.value;
  const pob = pobDe(v0.poblacion === SEPARADO ? v0.poblaciones[0] : v0.poblacion);
  // Para el mapa y las tarjetas las categorías "por separado" vuelven al
  // total; la gráfica las reparte en facetas más abajo.
  const v = {...v0, poblacion: v0.poblacion === SEPARADO ? v0.poblaciones[0] : v0.poblacion, sexo: v0.sexo === SEPARADO ? "Total" : v0.sexo, edad: v0.edad === SEPARADO ? "Todas" : v0.edad, anio: v0.anio === SEPARADO ? (v0.anios.includes(2020) ? 2020 : v0.anios.at(-1)) : v0.anio};
  const valores = valoresDe(v);
  const nivelCapa = v.nivel === "nacional" ? "entidad" : v.nivel;
  const sufijo = v.sexo === "Mujeres" ? "_f" : v.sexo === "Hombres" ? "_m" : "";
  const campo = v.nivel === "manzana" ? pob.tesela + sufijo : pob.tesela;
  // Cortes fijos por indicador y nivel (lección 74): sobre todas las unidades
  // del nivel en todas las ediciones, para que el tono no cambie al filtrar.
  let cortes;
  if (v.nivel === "ageb" || v.nivel === "manzana") cortes = cortesFijos(`ageb|${pob.tesela}`, ag.map((r) => r[pob.tesela]).filter((x) => x != null).map(Number));
  else if (v.nivel === "municipio") cortes = cortesFijos(`municipio|${v.poblacion}`, nac.filter((r) => r.nivel === "municipio" && r.poblacion === v.poblacion && r.sexo === "Total" && r.edad === "Todas").map((r) => 100 * r.num / r.den));
  else cortes = cortesFijos(`entidad|${v.poblacion}`, nac.filter((r) => r.nivel === "entidad" && r.poblacion === v.poblacion && r.den > 0).map((r) => 100 * r.num / r.den));
  const colorDe = (x) => (x == null ? "#d9d9d9" : RAMPA_MORADA[Math.min(RAMPA_MORADA.length - 1, cortes.filter((c, i) => i > 0 && x >= c).length)]);
  const formatoLeyenda = (x) => x.toFixed(cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1) + " %";
  const etiqueta = `${pob.corto}${v.sexo !== "Total" ? `, ${v.sexo.toLowerCase()}` : ""}${v.edad !== "Todas" ? `, ${etiquetaEdad(v.edad).toLowerCase()}` : ""}`;
  const tituloLeyenda = v.nivel === "nacional" ? "Formas de ser indígena (% de la población de 3 años y más; los cortes son los de hablantes por entidad)" : `${etiqueta} (% de la población de cada ${nivelDe(nivelCapa).singular})`;

  // Tarjeta: la unidad resaltada si la hay; si no, el contenedor.
  const cont = contenedorDe(v);
  const cifra = v.seleccion ? cifraDe(nivelCapa, v.seleccion, v) : cifraDe(cont.nivel, cont.cve, v);
  const pista = fuente.nivelMax(v) === nivelCapa ? "Este es el nivel más fino que publica la fuente" : "En el mapa, clic en una unidad para bajar de nivel; las migas suben";
  const tarjetaMapa = `<div class="globo-titulo">${escapar(cifra.nombre)} · ${v.anio}</div><div class="globo-sub">${escapar(etiqueta)}</div>
    <div class="mapa-cifra-valor">${cifra.d ? pct(cifra.d.valor) : "sin dato"}${cifra.d?.ee ? `<span class="mapa-cifra-error"> ± ${(100 * cifra.d.ee * 1.96).toFixed(1)}</span>` : ""}</div>
    <div class="mapa-cifra-nota">${cifra.d ? `${entero(cifra.d.num)} de ${entero(cifra.d.den)} personas · ${escapar(cifra.d.cota === "muestra" ? "estimación de la muestra" : cifra.d.cota)}` : "la fuente no publica esta celda"}</div>
    <div class="mapa-tarjeta-pista">${escapar(pista)}</div>`;
  mapa.pintar({v, valores: v.nivel === "nacional" ? valoresDe({...v, nivel: "entidad"}) : valores, campo, cortes, titulo: tituloLeyenda, formato: formatoLeyenda, notaSinDato: "Sin dato publicado", tarjeta: tarjetaMapa});

  // Vista: análisis por omisión; el mapa la sustituye cuando se pide.
  const enMapa = v.vista === "mapa";
  mapa.hidden = !enMapa;
  cuerpo.hidden = enMapa;

  // Gráfica. Sin "por separado": ranking del nivel con el color por VALOR y
  // los mismos cortes que el mapa; la unidad resaltada siempre aparece, con
  // contorno rojo. Con categorías por separado: una faceta por categoría
  // (hasta cuatro; dos dimensiones en rejilla) y mapa de calor con más.
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
  const titulo = (r) => `${r.nombre}${r.categoria ? ` · ${r.categoria}` : ""}\n${pob.corto}: ${r.pct.toFixed(1)} %\nPersonas: ${entero(r.num)} de ${entero(r.den)}${r.ee ? `\n± ${(196 * r.ee).toFixed(1)} puntos (95 %)` : ""}`;
  const marcasBarras = (datos, opciones = {}) => [
    Plot.barX(datos, {x: "pct", y: "nombre", fill: (r) => colorDe(r.pct), stroke: (r) => (esSel(r) ? ROJO_IBERO : "none"), strokeWidth: 2, ...opciones}),
    Plot.ruleX(datos.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => r.pct + 196 * r.ee, y: "nombre", stroke: "currentColor", strokeOpacity: 0.55, ...opciones}),
    Plot.text(datos, {x: "pct", y: "nombre", text: (r) => `${r.pct.toFixed(1)} %`, dx: 6, textAnchor: "start", fontSize: 11.5, fontWeight: (r) => (esSel(r) ? "bold" : "normal"), ...opciones}),
    Plot.tip(datos, Plot.pointerY({x: "pct", y: "nombre", maxRadius: Infinity, ...opciones, title: titulo})),
    Plot.ruleX([0]),
  ];
  const subtituloBase = `${v.anio}${v.sexo !== "Total" ? ` · ${v.sexo}` : ""}${v.edad !== "Todas" ? ` · ${etiquetaEdad(v.edad)}` : ""}`;
  const pieBase = `${filas.some((r) => r.cota === "muestra") ? "Censo 2020, cuestionario ampliado (estimación con intervalo)" : "Censo (INEGI)"} · cada barra es una ${nivelDe(nivelCapa).singular}; el color sigue los cortes del mapa`;
  const leyendaChica = () => leyenda({cortes, titulo: tituloLeyenda, formato: formatoLeyenda, notaSinDato: "Sin dato publicado"});
  // Las unidades que se dibujan: las mayores del nivel más la resaltada.
  const conSeleccion = (lista, n) => { const top = lista.slice(0, n); const s = filas.find(esSel); if (s && !top.some(esSel)) top.push(s); return top; };

  if (v.nivel === "manzana") {
    nodos.push(html`<p class="beta-nota">Las manzanas solo se dibujan en el mapa: el navegador no carga la tabla de 66 mil manzanas. Cambia "Ver como" a Mapa y pasa el cursor por una para ver su cifra.</p>`);
  } else if (v.nivel === "nacional") {
    // El país como una sola unidad: se comparan las FORMAS de ser indígena
    // (una barra por población); sexo y edad "por separado" las facetan.
    const dimsN = dims.filter((d) => d.campo !== "poblacion");
    const combos = dimsN.reduce((acc, d) => acc.flatMap((c) => d.cats.map((cat) => [...c, cat])), [[]]);
    const filasPais = combos.flatMap((combo) => {
      const vc = {...v}; const etiquetas = [];
      dimsN.forEach((d, i) => { vc[d.campo] = combo[i]; etiquetas.push(d.etiqueta(combo[i])); });
      return v0.poblaciones.map((k) => { const d = aValor(filaNac("nacional", "00", {...vc, poblacion: k})); return d ? {cve: k, nombre: pobDe(k).corto, pct: d.valor, num: d.num, den: d.den, ee: d.ee, cota: d.cota, categoria: etiquetas.join(" · "), c0: etiquetas[0] ?? "", c1: etiquetas[1] ?? ""} : null; }).filter(Boolean);
    });
    const selPob = v0.poblacion !== SEPARADO ? v0.poblacion : null;
    const esSelPob = (r) => r.cve === selPob;
    const marcasPais = (opciones = {}) => [
      Plot.barX(filasPais, {x: "pct", y: "nombre", fill: (r) => colorDe(r.pct), stroke: (r) => (esSelPob(r) ? ROJO_IBERO : "none"), strokeWidth: 2, ...opciones}),
      Plot.ruleX(filasPais.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => r.pct + 196 * r.ee, y: "nombre", stroke: "currentColor", strokeOpacity: 0.55, ...opciones}),
      Plot.text(filasPais, {x: "pct", y: "nombre", text: (r) => `${r.pct.toFixed(1)} %`, dx: 6, textAnchor: "start", fontSize: 11.5, fontWeight: (r) => (esSelPob(r) ? "bold" : "normal"), ...opciones}),
      Plot.tip(filasPais, Plot.pointerY({x: "pct", y: "nombre", maxRadius: Infinity, ...opciones, title: titulo})),
      Plot.ruleX([0]),
    ];
    // Solo las poblaciones con dato en este corte (los hogares no tienen sexo ni edad).
    const ordenPob = v0.poblaciones.filter((k) => filasPais.some((r) => r.cve === k)).map((k) => pobDe(k).corto);
    const maxP = Math.max(1, ...filasPais.map((r) => r.pct + 196 * (r.ee ?? 0))) * 1.1;
    const notaHog = (v.sexo !== "Total" || v.edad !== "Todas" || dimsN.length) && v0.poblaciones.includes("hogares") ? " Los hogares indígenas no se publican por sexo ni por edad y quedan fuera de este corte." : "";
    const sub = `${v.anio}${v.sexo !== "Total" ? ` · ${v.sexo}` : ""}${v.edad !== "Todas" ? ` · ${etiquetaEdad(v.edad)}` : ""}${selPob ? ` · resaltado: ${pob.corto}` : ""}${dimsN.length ? ` · un panel por ${dimsN.map((d) => d.rotulo).join(" y ")}` : ""}`;
    const pieP = `Censo 2020: conteo (ITER) para hablantes y hogares; cuestionario ampliado para el resto, con intervalo de 95 % · cada barra es una forma de ser indígena.${notaHog}`;
    if (!dimsN.length) {
      nodos.push(figura({titulo: "México: formas de ser indígena", subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 60, height: 60 + 26 * ordenPob.length, width: anchoGrafica(),
          x: {label: "% de la población de 3 años y más", grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasPais()})]));
    } else if (dimsN.length === 1) {
      nodos.push(figura({titulo: `México: formas de ser indígena por ${dimsN[0].rotulo}`, subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 50, height: 60 + 26 * ordenPob.length, width: anchoGrafica(),
          fx: {label: null, domain: dimsN[0].cats.map(dimsN[0].etiqueta)}, x: {label: "% de la población de 3 años y más", grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasPais({fx: "categoria"})})]));
    } else {
      nodos.push(figura({titulo: `México: formas de ser indígena por ${dimsN.map((d) => d.rotulo).join(" y ")}`, subtitulo: sub, pie: pieP},
        [leyendaChica(), Plot.plot({marginLeft: 220, marginRight: 110, height: (50 + 24 * ordenPob.length) * dimsN[1].cats.length, width: anchoGrafica(),
          fx: {label: null, domain: dimsN[0].cats.map(dimsN[0].etiqueta)}, fy: {label: null, domain: dimsN[1].cats.map(dimsN[1].etiqueta)}, x: {label: "% de la población de 3 años y más", grid: true, domain: [0, maxP]}, y: {label: null, domain: ordenPob}, marks: marcasPais({fx: "c0", fy: "c1"})})]));
    }
  } else if (!dims.length) {
    const top = conSeleccion(filas, 25);
    nodos.push(figura({titulo: `${etiquetaGeo(v, catalogo)}: ${pob.corto.toLowerCase()}`, subtitulo: `${subtituloBase}${filas.length > 25 ? ` · las 25 con mayor proporción de ${filas.length}` : ""}${notaSel}`, pie: pieBase},
      [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 60, height: Math.max(220, 22 * top.length + 60), width: anchoGrafica(),
        x: {label: "% de la población", grid: true, domain: [0, Math.max(1, ...top.map((r) => r.pct + (r.ee ? 196 * r.ee : 0))) * 1.08]}, y: {label: null, domain: top.map((r) => r.nombre)},
        marks: marcasBarras(top)})]));
  } else {
    // Combinaciones de categorías: producto de las dimensiones pedidas.
    const combos = dims.reduce((acc, d) => acc.flatMap((c) => d.cats.map((cat) => [...c, cat])), [[]]);
    const nCombos = combos.length;
    const orden = conSeleccion(filas, nCombos > 4 ? 30 : 20).map((r) => r.nombre);
    const porCat = combos.flatMap((combo) => {
      const vc = {...v}; const etiquetas = [];
      dims.forEach((d, i) => { vc[d.campo] = combo[i]; etiquetas.push(d.etiqueta(combo[i])); });
      return aFilas(valoresDe(vc), {categoria: etiquetas.join(" · "), c0: etiquetas[0], c1: etiquetas[1] ?? ""}).filter((r) => orden.includes(r.nombre));
    });
    const rotulos = dims.map((d) => d.rotulo).join(" y ");
    const maxX = Math.max(1, ...porCat.map((r) => r.pct + (r.ee ? 196 * r.ee : 0))) * 1.08;
    const conPob = dims.some((d) => d.campo === "poblacion");
    const otras = dims.filter((d) => d.campo !== "poblacion").map((d) => d.rotulo).join(" y ");
    const tituloFig = conPob ? `${etiquetaGeo(v, catalogo)}: formas de ser indígena${otras ? ` por ${otras}` : ""}` : `${etiquetaGeo(v, catalogo)}: ${pob.corto.toLowerCase()} por ${rotulos}`;
    if (nCombos <= 4) {
      nodos.push(figura({titulo: tituloFig, subtitulo: `${subtituloBase} · un panel por ${rotulos}, las ${orden.length} unidades con mayor proporción`, pie: pieBase},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 50, height: Math.max(240, 22 * orden.length + 70), width: anchoGrafica(),
          fx: {label: null, domain: combos.map((c) => c.map((x, i) => dims[i].etiqueta(x)).join(" · "))}, x: {label: "% de la población", grid: true, domain: [0, maxX]}, y: {label: null, domain: orden},
          marks: marcasBarras(porCat, {fx: "categoria"})})]));
    } else if (dims.length === 2 && dims.every((d) => d.cats.length <= 4)) {
      // Dos dimensiones chicas (sexo por edad): rejilla de facetas.
      const [d0, d1] = dims;
      nodos.push(figura({titulo: tituloFig, subtitulo: `${subtituloBase} · columnas por ${d0.rotulo}, filas por ${d1.rotulo}; las ${orden.length} unidades con mayor proporción`, pie: pieBase},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginRight: 110, height: Math.max(240, (20 * orden.length + 50) * d1.cats.length), width: anchoGrafica(),
          fx: {label: null, domain: d0.cats.map(d0.etiqueta)}, fy: {label: null, domain: d1.cats.map(d1.etiqueta)}, x: {label: "% de la población", grid: true, domain: [0, maxX]}, y: {label: null, domain: orden},
          marks: marcasBarras(porCat, {fx: "c0", fy: "c1"})})]));
    } else {
      nodos.push(figura({titulo: tituloFig, subtitulo: `Mapa de calor: una columna por ${rotulos}; las ${orden.length} unidades con mayor proporción en ${v.anio}`, pie: `${pieBase.split(" · ")[0]} · cada celda es una ${nivelDe(nivelCapa).singular} en una categoría; el color sigue los cortes del mapa; en blanco, celdas sin dato`},
        [leyendaChica(), Plot.plot({marginLeft: 200, marginTop: 34, height: Math.max(240, 22 * orden.length + 60), width: anchoGrafica(), padding: 0.08,
          x: {label: null, domain: combos.map((c) => c.map((x, i) => dims[i].etiqueta(x)).join(" · ")), axis: "top", tickRotate: nCombos > 10 ? -30 : 0}, y: {label: null, domain: orden},
          marks: [
            Plot.cell(porCat, {x: "categoria", y: "nombre", fill: (r) => colorDe(r.pct), inset: 0.5, stroke: (r) => (esSel(r) ? ROJO_IBERO : "none"), strokeWidth: 2}),
            Plot.text(porCat, {x: "categoria", y: "nombre", text: (r) => r.pct.toFixed(1), fontSize: 10.5, fill: (r) => (RAMPA_MORADA.indexOf(colorDe(r.pct)) >= 3 ? "white" : "black")}),
            Plot.tip(porCat, Plot.pointer({x: "categoria", y: "nombre", maxRadius: Infinity, title: titulo})),
          ]})]));
    }
  }

  // Serie por alcaldía: solo la ciudad y sus alcaldías tienen 1990 - 2025.
  const cveSerie = v.seleccion && nivelCapa === "municipio" && v.seleccion.startsWith("09") ? v.seleccion
    : cont.nivel === "entidad" && cont.cve === "09" ? "09" : cont.nivel === "municipio" && cont.cve.startsWith("09") ? cont.cve : null;
  if (cveSerie && v.nivel !== "nacional") {
    const s = ser.filter((r) => r.cve === cveSerie && r.poblacion === pob.serie(r.anio) && r.sexo === v.sexo && r.den > 0).map((r) => ({...r, pct: 100 * r.num / r.den}));
    const nombreSerie = cveSerie === "09" ? "Ciudad de México" : (catalogo.de("municipio", cveSerie)?.nombre ?? cveSerie);
    if (s.length > 1) nodos.push(figura({titulo: `${nombreSerie}: ${pob.corto.toLowerCase()}, ${s[0].anio} - ${s.at(-1).anio}`, subtitulo: "Serie por edición; el universo cambia de 5 a 3 años y más en 2010", pie: "Censos, conteos e intercensales (INEGI) · cada punto es una edición; los huecos, ediciones sin la pregunta"},
      [Plot.plot({height: 260, width: anchoGrafica(), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: {label: "%", grid: true, zero: true},
        marks: [Plot.line(s, {x: "anio", y: "pct", stroke: RAMPA_MORADA[3], strokeWidth: 2}), Plot.dot(s, {x: "anio", y: "pct", fill: (r) => (r.cota === "censo" ? RAMPA_MORADA[3] : "white"), stroke: RAMPA_MORADA[3], r: 4.5}),
          Plot.text(s, {x: "anio", y: "pct", text: (r) => `${r.pct.toFixed(1)}`, dy: -10, fontSize: 11}),
          Plot.tip(s, Plot.pointerX({x: "anio", y: "pct", maxRadius: Infinity, title: (r) => `${r.anio}\n${pob.corto}: ${r.pct.toFixed(1)} %\nPersonas: ${entero(r.num)} de ${entero(r.den)}\n${r.cota === "censo" ? "conteo censal" : "estimación de encuesta"}`})),
          Plot.ruleY([0])]})]));
  }
  nodos.push(explicacion(`${v0.poblacion === SEPARADO ? "Cada población es una forma distinta de contar a la población indígena; se comparan una junto a otra sin sumarlas. " : pob.definicion + " "}${["nacional", "entidad", "municipio"].includes(v.nivel) ? "Las cifras por sexo y las de hogares vienen del conteo censal (ITER); las de grupo de edad, la autoadscripción, la unión y la intersección, de la muestra del cuestionario ampliado, con su intervalo de 95 %." : "Las cifras por AGEB y manzana vienen del tabulado del Censo; las celdas suprimidas por confidencialidad se dejan sin dato."}`));
  if (filas.length && v.nivel !== "manzana" && v.nivel !== "nacional") nodos.push(tablaColumnas(filas, [
    {etiqueta: "Unidad", valor: (r) => r.nombre}, {etiqueta: "Clave", valor: (r) => r.cve}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)},
    {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.den)},
    {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Cota", valor: (r) => r.cota},
  ], {titulo: "Ver la tabla del nivel"}));
  cuerpo.replaceChildren(...nodos);
}
panel.addEventListener("input", pintar);
pintar();
display(html`<section class="beta-seccion">${panel}<div class="beta-vista">${mapa}${cuerpo}</div></section>`);
```

## Qué probar

Elige el nivel "Municipios" sin entidad: se comparan los 2,469 municipios del
país; escribe "Oaxaca" en entidad para acotar y "Oaxaca de Juárez" en
municipio para resaltarlo en el ranking (contorno rojo y cifra en el subtítulo). Vuelve a "Entidades
del país": la entidad se suelta sola. Cambia a "AGEB (Ciudad de México)" y
elige una alcaldía; pon "Por separado" en sexo y en grupo de edad a la vez
para ver la rejilla de facetas. Con "Ver como: Mapa", haz clic en una entidad,
después en una alcaldía de la ciudad y en una AGEB; las migas suben.
