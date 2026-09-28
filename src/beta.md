---
title: Beta de filtros
toc: false
---

# Beta: geografía y filtros en una sola sección

Prueba de la arquitectura de filtros del libro con datos reales: el panel de la
sección decide la geografía y los cortes; el análisis es la vista por omisión y
"Ver como: Mapa" abre el mapa en su lugar, donde un clic sobre la unidad baja
de nivel y las migas suben. Gráfica, mapa y tarjeta siguen la misma selección. Los niveles son las entidades del país, los municipios de una
entidad y, dentro de la Ciudad de México, las AGEB de una alcaldía y las
manzanas de una AGEB. Cada filtro aparece solo donde su fuente lo publica: el
grupo de edad existe en 2020 por entidad y municipio (muestra del Censo), el
sexo no existe para los hogares indígenas ni por AGEB, y la serie 1990 - 2025
solo por alcaldía de la ciudad.

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {catalogoGeo, contenedorDe, etiquetaGeo, nivelDe} from "./components/geografia.js";
import {panelSeccion, SEXOS, EDADES} from "./components/panel-seccion.js";
import {mapaNavegador} from "./components/mapa-navegador.js";
import {cortesPorCuantil} from "./components/mapa.js";
import {figura, explicacion, tablaColumnas} from "./components/graficas.js";
import {punto, COLOR_SERIE} from "./components/base.js";

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
  {clave: "hablantes", etiqueta: "Hablan una lengua indígena", corto: "Hablantes de lengua indígena", tesela: "tasa_p3ym_hli", serie: (anio) => (anio < 2010 ? "hablantes5" : "hablantes3"),
   definicion: "Personas de 3 años y más que hablan alguna lengua indígena, sobre la población de 3 años y más."},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas", tesela: "tasa_phog_ind", serie: () => "hogares",
   definicion: "Personas en hogares donde la jefa o el jefe, su cónyuge o (desde 2020) alguno de sus ascendientes habla lengua indígena, sobre la población total."},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas", tesela: null, serie: () => "autoads",
   definicion: "Personas de 3 años y más que se consideran indígenas de acuerdo con su cultura, sobre la población de 3 años y más. Estimación de la muestra del Censo."},
];
const pobDe = (k) => POBLACIONES.find((p) => p.clave === k);
const esCdmx = (geo) => geo.cveEnt === "09";
const aniosSerie = (cve, poblacion) => [...new Set(ser.filter((r) => r.cve === cve && r.poblacion === pobDe(poblacion).serie(r.anio) && r.sexo === "Total").map((r) => r.anio))].sort();

// Declaración de la fuente: hasta dónde llega y qué publica en cada nivel.
const fuente = {
  poblaciones: POBLACIONES.map((p) => ({clave: p.clave, etiqueta: p.etiqueta})),
  nivelMax: (geo) => (geo.cveEnt === "09" ? "manzana" : "municipio"),
  poblacionesDe: (geo) => (geo.nivel === "ageb" || geo.nivel === "manzana" ? ["hablantes", "hogares"] : ["hablantes", "hogares", "autoads"]),
  aniosDe: ({geo, poblacion}) => {
    if (geo.nivel === "ageb" || geo.nivel === "manzana") return pmtilesAgebs2010 ? [2010, 2020] : [2020];
    if (geo.nivel === "municipio" && esCdmx(geo)) return aniosSerie("09", poblacion);
    return [2020];
  },
  sexoDe: ({geo, poblacion, anio}) => {
    if (poblacion === "hogares" || geo.nivel === "ageb") return false;
    if (geo.nivel === "manzana") return true;
    if (geo.nivel === "municipio" && esCdmx(geo) && anio !== 2020) return ser.some((r) => r.anio === anio && r.poblacion === pobDe(poblacion).serie(anio) && r.sexo === "Mujeres");
    return true;
  },
  edadDe: ({geo, poblacion, anio}) => anio === 2020 && poblacion !== "hogares" && (geo.nivel === "entidad" || geo.nivel === "municipio"),
};
const panel = panelSeccion({fuente, catalogo, id: "beta"});
```

```js
// Valores de cada unidad del nivel y cifra del contenedor.
const CORTES = new Map();
function cortesFijos(clave, valores) {
  if (!CORTES.has(clave)) CORTES.set(clave, cortesPorCuantil(valores, 5));
  return CORTES.get(clave);
}
function filaNac(nivel, cve, v) {
  const conEdad = v.edad !== "Todas";
  const cota = v.poblacion === "autoads" || conEdad ? "muestra" : "censo";
  return nac.find((r) => r.nivel === nivel && r.cve === cve && r.poblacion === v.poblacion && r.sexo === v.sexo && r.edad === v.edad && r.cota === cota) ?? null;
}
const aValor = (r) => (r && r.den > 0 ? {valor: 100 * r.num / r.den, num: r.num, den: r.den, ee: r.ee, cota: r.cota, nombre: r.nombre} : null);
function valoresDe(v) {
  const p = pobDe(v.poblacion);
  const m = new Map();
  if (v.nivel === "entidad") {
    for (const u of catalogo.todos("entidad")) m.set(u.cve, aValor(filaNac("entidad", u.cve, v)));
  } else if (v.nivel === "municipio") {
    if (esCdmx(v) && v.anio !== 2020) {
      for (const r of ser.filter((r) => r.nivel === "alcaldia" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) m.set(r.cve, aValor(r));
    } else {
      for (const u of catalogo.hijos("municipio", v.cveEnt)) m.set(u.cve, aValor(filaNac("municipio", u.cve, v)));
    }
  } else if (v.nivel === "ageb") {
    for (const r of ag.filter((r) => r.anio === v.anio && r.cve_ageb.startsWith(v.cveMun))) m.set(r.cve_ageb, r[p.tesela] == null ? null : {valor: r[p.tesela], num: r[p.clave === "hablantes" ? "P3YM_HLI" : "PHOG_IND"], den: r[p.clave === "hablantes" ? "P_3YMAS" : "POBTOT"], cota: "censo", nombre: `AGEB ${r.cve_ageb.slice(-4)}`});
  }
  return m;
}
function cifraContenedor(v) {
  const c = contenedorDe(v);
  const p = pobDe(v.poblacion);
  if (c.nivel === "nacional") return {nombre: "México", d: aValor(filaNac("nacional", "00", v))};
  if (c.nivel === "entidad") {
    const d = esCdmx(v) && v.anio !== 2020 ? aValor(ser.find((r) => r.nivel === "entidad" && r.anio === v.anio && r.poblacion === p.serie(v.anio) && r.sexo === v.sexo)) : aValor(filaNac("entidad", c.cve, v));
    return {nombre: catalogo.de("entidad", c.cve)?.nombre, d};
  }
  if (c.nivel === "municipio") {
    // La alcaldía como suma de sus AGEB con cifra publicada (pierde lo suprimido).
    const filas = ag.filter((r) => r.anio === v.anio && r.cve_ageb.startsWith(c.cve) && r[p.tesela] != null);
    const num = filas.reduce((s, r) => s + r[p.clave === "hablantes" ? "P3YM_HLI" : "PHOG_IND"], 0), den = filas.reduce((s, r) => s + r[p.clave === "hablantes" ? "P_3YMAS" : "POBTOT"], 0);
    return {nombre: catalogo.de("municipio", c.cve)?.nombre, d: den ? {valor: 100 * num / den, num, den, cota: "suma de AGEB"} : null};
  }
  const r = ag.find((r) => r.anio === v.anio && r.cve_ageb === c.cve);
  return {nombre: `AGEB ${c.cve.slice(-4)}`, d: r && r[p.tesela] != null ? {valor: r[p.tesela], num: r[p.clave === "hablantes" ? "P3YM_HLI" : "PHOG_IND"], den: r[p.clave === "hablantes" ? "P_3YMAS" : "POBTOT"], cota: "censo"} : null};
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
const anchoGrafica = () => Math.max(320, Math.min(760, anchoCuerpo || 600));
function pintar() {
  const v = panel.value;
  const pob = pobDe(v.poblacion);
  const valores = valoresDe(v);
  const sufijo = v.sexo === "Mujeres" ? "_f" : v.sexo === "Hombres" ? "_m" : "";
  const campo = v.nivel === "manzana" ? pob.tesela + sufijo : pob.tesela;
  // Cortes fijos por indicador y nivel (lección 74): sobre todas las unidades
  // del nivel en todas las ediciones, para que el tono no cambie al filtrar.
  let cortes;
  if (v.nivel === "ageb" || v.nivel === "manzana") cortes = cortesFijos(`ageb|${pob.tesela}`, ag.map((r) => r[pob.tesela]).filter((x) => x != null).map(Number));
  else if (v.nivel === "entidad") cortes = cortesFijos(`entidad|${v.poblacion}|${v.sexo}|${v.edad}`, [...valores.values()].map((d) => d?.valor));
  else cortes = cortesFijos(`municipio|${v.poblacion}`, nac.filter((r) => r.nivel === "municipio" && r.poblacion === v.poblacion && r.sexo === "Total" && r.edad === "Todas").map((r) => 100 * r.num / r.den));
  const {nombre, d} = cifraContenedor(v);
  const etiqueta = `${pob.corto}${v.sexo !== "Total" ? `, ${v.sexo.toLowerCase()}` : ""}${v.edad !== "Todas" ? `, ${EDADES.find((e) => e.clave === v.edad).etiqueta.toLowerCase()}` : ""}`;
  const tarjeta = `<div class="globo-titulo">${escapar(nombre)} · ${v.anio}</div><div class="globo-sub">${escapar(etiqueta)}</div>
    <div class="mapa-cifra-valor">${d ? pct(d.valor) : "sin dato"}${d?.ee ? `<span class="mapa-cifra-error"> ± ${(100 * d.ee * 1.96).toFixed(1)}</span>` : ""}</div>
    <div class="mapa-cifra-nota">${d ? `${entero(d.num)} personas · ${escapar(d.cota === "muestra" ? "estimación de la muestra" : d.cota)}` : "la fuente no publica esta celda"}</div>
    <div class="mapa-tarjeta-pista">${fuente.nivelMax(v) === v.nivel ? "Este es el nivel más fino que publica la fuente" : "Clic en una unidad para bajar de nivel; las migas suben"}</div>`;
  mapa.pintar({v, valores, campo, cortes, titulo: `${etiqueta} (% de la población de cada ${nivelDe(v.nivel).singular})`, formato: (x) => x.toFixed(cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1) + " %", notaSinDato: "Sin dato publicado", tarjeta});

  // Gráfica: ranking de las unidades del nivel; por manzana solo el mapa.
  const filas = [...valores.entries()].filter(([, d]) => d).map(([cve, d]) => ({cve, nombre: d.nombre ?? catalogo.de(v.nivel, cve)?.nombre ?? cve, pct: d.valor, num: d.num, den: d.den, ee: d.ee, cota: d.cota})).sort((a, b) => b.pct - a.pct);
  const top = filas.slice(0, 25);
  const nodos = [];
  if (v.nivel === "manzana") {
    nodos.push(html`<p class="beta-nota">Las manzanas solo se dibujan en el mapa: el navegador no carga la tabla de 66 mil manzanas. Cambia "Ver como" a Mapa y pasa el cursor por una para ver su cifra.</p>`);
  } else {
    nodos.push(figura({titulo: `${etiquetaGeo(v, catalogo)}: ${pob.corto.toLowerCase()}`, subtitulo: `${v.anio}${v.sexo !== "Total" ? ` · ${v.sexo}` : ""}${v.edad !== "Todas" ? ` · ${EDADES.find((e) => e.clave === v.edad).etiqueta}` : ""}${filas.length > 25 ? ` · las 25 con mayor proporción de ${filas.length}` : ""}`,
      pie: `${top.some((r) => r.cota === "muestra") ? "Censo 2020, cuestionario ampliado (estimación con intervalo)" : "Censo (INEGI)"} · cada barra es una ${nivelDe(v.nivel).singular}`},
      [Plot.plot({
        marginLeft: 170, marginRight: 60, height: Math.max(220, 22 * top.length + 60), width: anchoGrafica(),
        x: {label: "% de la población", grid: true, domain: [0, Math.max(1, ...top.map((r) => r.pct + (r.ee ? 196 * r.ee : 0))) * 1.08]}, y: {label: null, domain: top.map((r) => r.nombre)},
        marks: [
          Plot.barX(top, {x: "pct", y: "nombre", fill: COLOR_SERIE[0], tip: false}),
          Plot.ruleX(top.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => r.pct + 196 * r.ee, y: "nombre", stroke: "currentColor", strokeOpacity: 0.6}),
          Plot.text(top, {x: "pct", y: "nombre", text: (r) => `${r.pct.toFixed(1)} %`, dx: 6, textAnchor: "start", fontSize: 12}),
          Plot.ruleX([0]),
        ],
      })]));
  }
  // Serie por alcaldía: solo la ciudad y sus alcaldías tienen 1990 - 2025.
  const c = contenedorDe(v);
  const cveSerie = c.nivel === "entidad" && c.cve === "09" ? "09" : c.nivel === "municipio" && c.cve.startsWith("09") ? c.cve : null;
  if (cveSerie) {
    const s = ser.filter((r) => r.cve === cveSerie && r.poblacion === pob.serie(r.anio) && r.sexo === v.sexo && r.den > 0).map((r) => ({...r, pct: 100 * r.num / r.den}));
    if (s.length > 1) nodos.push(figura({titulo: `${nombre}: ${pob.corto.toLowerCase()}, ${s[0].anio} - ${s.at(-1).anio}`, subtitulo: "Serie por edición; el universo cambia de 5 a 3 años y más en 2010", pie: "Censos, conteos e intercensales (INEGI) · cada punto es una edición; los huecos, ediciones sin la pregunta"},
      [Plot.plot({height: 240, width: anchoGrafica(), x: {label: null, tickFormat: (d) => String(d)}, y: {label: "%", grid: true, zero: true},
        marks: [Plot.line(s, {x: "anio", y: "pct", stroke: COLOR_SERIE[0], strokeWidth: 2}), Plot.dot(s, {x: "anio", y: "pct", fill: (r) => (r.cota === "censo" ? COLOR_SERIE[0] : "white"), stroke: COLOR_SERIE[0], r: 4.5}),
          Plot.text(s, {x: "anio", y: "pct", text: (r) => `${r.pct.toFixed(1)}`, dy: -10, fontSize: 11}), Plot.ruleY([0])]})]));
  }
  // Vista: análisis por omisión; el mapa la sustituye cuando se pide.
  const enMapa = v.vista === "mapa";
  mapa.hidden = !enMapa;
  cuerpo.hidden = enMapa;
  nodos.push(explicacion(`${pob.definicion} ${v.nivel === "entidad" || v.nivel === "municipio" ? "Las cifras por sexo y las de hogares vienen del conteo censal (ITER); las de grupo de edad y las de autoadscripción, de la muestra del cuestionario ampliado, con su intervalo de 95 %." : "Las cifras por AGEB y manzana vienen del tabulado del Censo; las celdas suprimidas por confidencialidad se dejan sin dato."}`));
  if (filas.length) nodos.push(tablaColumnas(filas, [
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

Cambia "Ver como" a Mapa. Haz clic en Oaxaca para ver sus municipios, después en cualquiera: la fuente no
llega más abajo fuera de la ciudad, así que el municipio se contornea y la
tarjeta lo dice. Vuelve a México con la miga. Haz clic en la Ciudad de México,
luego en Iztapalapa: aparecen sus AGEB y el año ofrece 2010 y 2020; un clic en
una AGEB muestra sus manzanas y el sexo vuelve a estar disponible. Con la
Ciudad de México abierta, cambia el año a 2015 o 1995: la serie por alcaldía
manda y el grupo de edad se oculta. Escribe "Yucatán" o "Iztapalapa" en los
buscadores para llegar sin el mapa, y prueba "Tla" en municipio con la ciudad
abierta para ver el aviso de varias coincidencias.
