---
title: Colonias, pueblos y marginación
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis, claves} from "../components/graficas.js";
import {punto, ORDINAL, COLOR_UNICO, ROJO, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";
import {lollipop} from "../components/formas.js";

const [nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, colonias] = await Promise.all([
  FileAttachment("../data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/inpi_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("../data/geo_catalogo.csv").csv(),
  FileAttachment("../data/mx_entidades.json").json(),
  FileAttachment("../data/colonias_resumen.csv").csv({typed: true}),
]);
const pmtiles = {municipios: await FileAttachment("../data/municipios.pmtiles").url(), agebs: await FileAttachment("../data/agebs.pmtiles").url(), manzanas: await FileAttachment("../data/manzanas.pmtiles").url(), agebs2010: null, manzanas2010: null};
try { pmtiles.agebs2010 = await FileAttachment("../data/agebs_2010.pmtiles").url(); } catch { pmtiles.agebs2010 = null; }
try { pmtiles.manzanas2010 = await FileAttachment("../data/manzanas_2010.pmtiles").url(); } catch { pmtiles.manzanas2010 = null; }
const datos = datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles});
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
// Fuentes y cotejos del panel censal según la población que se pinta.
const DATOS_SERIE = ["D-ITER-1990", "D-ITER-1995", "D-ITER-2000", "D-ITER-2005", "D-ITER-2010", "D-EIC-2015", "D-ITER-2020", "D-EIC-2025-105", "D-EIC-2025-MICRO"];
const MUESTRAS = ["D-CENSO-2000-AMP", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
const FUENTES_CENSO = {
  hablantes: {datos: DATOS_SERIE, cotejos: ["cdmx_hli5_1990_n", "cdmx_hli5_1995_n", "cdmx_hli5_2000_n", "cdmx_hli5_2005_n", "cdmx_hli5_2010_n", "cdmx_hli5_2020_n", "cdmx_hli3_2015_n", "cdmx_hli3_2025", "eic2025_alcaldias_iguales", "word_tabla2_celdas_iguales", "iztapalapa_parte_2015"], lectura: ["R-SEPI-2024-DIV", "R-SECULT-LENGUAS"]},
  hogares: {datos: ["D-ITER-2005", "D-ITER-2010", "D-ITER-2020", "D-EIC-2025-105"], cotejos: ["cdmx_phog_2005_n", "cdmx_phog_2010_n", "cdmx_phog_ind", "cdmx_phog_2025_n"]},
  autoads: {datos: MUESTRAS, cotejos: ["cdmx_autoads_2010", "cdmx_autoads_2015_n", "cdmx_autoads_2020_n", "cdmx_autoads_2025"], lectura: ["R-SEPI-2024-PERFIL"]},
  inpi: {datos: ["D-INPI-2020-HOG", "D-INPI-2020-AUTO"], cotejos: ["pct_pi_nacional_2020", "autoads_mun_mediana_dif_2020"]},
};
FUENTES_CENSO.todas = {...FUENTES_CENSO.autoads, nota: "La unión de hablantes y personas que se consideran indígenas no tiene cifra publicada; se cotejan sus dos componentes por separado."};
FUENTES_CENSO.ambas = FUENTES_CENSO.todas;
const fuentesCenso = (v) => fuenteDe(FUENTES_CENSO[v.poblacion] ?? {datos: DATOS_SERIE, cotejos: [...FUENTES_CENSO.hablantes.cotejos.slice(0, 8), ...FUENTES_CENSO.autoads.cotejos]});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>Colonias, pueblos y marginación</h1>
  <p class="hero-entrada">Cómo se relaciona la presencia indígena de cada AGEB con su grado de marginación urbana, y qué colonias coinciden con los pueblos originarios reconocidos.</p>
</div>

---

<h2 id="marginacion" class="toc-anchor">Presencia indígena y marginación urbana</h2>

```js
// Población en hogares indígenas y hablantes por grado de marginación urbana de la AGEB (CONAPO 2020).
const GRADOS = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"];
const ag20 = agebs.map((r) => ({...r, cve_ageb: String(r.cve_ageb).padStart(13, "0")})).filter((r) => r.gm_conapo);
// Eje fijo del panel izquierdo: el máximo de todas las alcaldías y de las dos
// poblaciones, para que elegir una alcaldía no reescale la gráfica.
const MAX_MARG = Math.max(...[["PHOG_IND", "POBTOT"], ["P3YM_HLI", "P_3YMAS"]].flatMap(([n, d]) => ["", ...new Set(ag20.map((r) => r.alcaldia))].flatMap((a) => GRADOS.map((g) => {
  const f = ag20.filter((r) => (!a || r.alcaldia === a) && r.gm_conapo === g && r[n] != null && r[d] > 0);
  const den = f.reduce((s, r) => s + r[d], 0);
  return den ? 100 * f.reduce((s, r) => s + r[n], 0) / den : 0;
})))) * 1.1;
const selPob = campo({id: "c4m-pob", nombre: "poblacion", etiqueta: "Población", opciones: [{clave: "phog", etiqueta: "Viven en hogares indígenas"}, {clave: "hli", etiqueta: "Hablan una lengua indígena"}], valor: "phog"});
const selAlc = campo({id: "c4m-alc", nombre: "alcaldia", etiqueta: "Alcaldía", opciones: [{clave: "", etiqueta: "Toda la ciudad"}, ...[...new Set(ag20.map((r) => r.alcaldia))].sort((a, b) => a.localeCompare(b, "es")).map((a) => ({clave: a, etiqueta: a}))], valor: ""});
const panelM = html`<div class="panel-filtros"><div class="panel-campos">${selPob}${selAlc}</div></div>`;
const cuerpoM = document.createElement("div");
function pintarM() {
  const num = selPob.value === "phog" ? "PHOG_IND" : "P3YM_HLI", den = selPob.value === "phog" ? "POBTOT" : "P_3YMAS";
  const nombrePob = selPob.value === "phog" ? "Población en hogares indígenas" : "Hablantes de lengua indígena";
  const base = ag20.filter((r) => !selAlc.value || r.alcaldia === selAlc.value).filter((r) => r[num] != null && r[den] > 0);
  const porGrado = GRADOS.map((g) => { const f = base.filter((r) => r.gm_conapo === g); const n = f.reduce((s, r) => s + r[num], 0), d = f.reduce((s, r) => s + r[den], 0); return {grado: g, agebs: f.length, num: n, den: d, pct: d ? 100 * n / d : null}; }).filter((r) => r.agebs);
  const totalN = base.reduce((s, r) => s + r[num], 0);
  porGrado.forEach((r) => { r.parte = totalN ? 100 * r.num / totalN : 0; });
  const lugar = selAlc.value || "la ciudad";
  cuerpoM.replaceChildren(
    figura({titulo: `${nombrePob} según la marginación urbana de la AGEB, ${lugar}`, subtitulo: "Izquierda: qué proporción de la población de las AGEB de cada grado es indígena. Derecha: cómo se reparte la población indígena entre los grados", pie: "Censo 2020 (INEGI), tabulado por AGEB, y CONAPO, índice de marginación urbana 2020 · cada barra es un grado de marginación"},
      [html`<div class="grid grid-cols-2">${[
        Plot.plot({marginLeft: 80, marginRight: 60, height: 200, width: Math.min(440, width / 2), x: {label: `% ${nombrePob === "Hablantes de lengua indígena" ? "de la población de 3 años y más" : "de la población"}`, grid: true, domain: [0, MAX_MARG]}, y: {label: null, domain: GRADOS},
          marks: [Plot.barX(porGrado, {x: "pct", y: "grado", fill: (r) => ORDINAL[5][GRADOS.indexOf(r.grado)]}), Plot.text(porGrado, {x: "pct", y: "grado", text: (r) => pct(r.pct), dx: 6, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(porGrado, Plot.pointerY({x: "pct", y: "grado", maxRadius: Infinity, ...GLOBO, ...globo([["Grado de marginación", (r) => r.grado], ["AGEB", (r) => r.agebs], [nombrePob, (r) => pct(r.pct)], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`]])})), Plot.ruleX([0])]}),
        Plot.plot({marginLeft: 80, marginRight: 60, height: 200, width: Math.min(440, width / 2), x: {label: "% de la población indígena", grid: true, domain: [0, 100]}, y: {label: null, domain: GRADOS},
          marks: [Plot.barX(porGrado, {x: "parte", y: "grado", fill: (r) => ORDINAL[5][GRADOS.indexOf(r.grado)]}), Plot.text(porGrado, {x: "parte", y: "grado", text: (r) => pct(r.parte), dx: 6, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(porGrado, Plot.pointerY({x: "parte", y: "grado", maxRadius: Infinity, ...GLOBO, ...globo([["Grado de marginación", (r) => r.grado], ["Parte de la población indígena", (r) => pct(r.parte)], ["Personas", (r) => entero(r.num)]])})), Plot.ruleX([0])]}),
      ]}</div>`]),
    fuenteDe({datos: ["D-CONAPO-IMU-2020", "D-CENSO-2020-RESAGEBURB"], cotejos: ["pob_igual_conapo", "pob_igual_coneval", "viv_igual_coneval"], lectura: ["D-CONEVAL-GRS-2020"]}),
    explicacion("CONAPO clasifica cada AGEB urbana en cinco grados de marginación a partir de carencias de educación, salud, vivienda y bienes; no mide ingreso. Aquí cada AGEB de la ciudad se agrupa por su grado y se suman sus personas. La gráfica de la izquierda responde qué tan indígena es la población de las AGEB de cada grado; la de la derecha, en qué grados vive la población indígena. Las AGEB sin grado publicado (muy poca población) no entran."),
    tablaColumnas(porGrado, [{etiqueta: "Grado de marginación", valor: (r) => r.grado}, {etiqueta: "AGEB", num: true, valor: (r) => r.agebs}, {etiqueta: `% ${nombrePob.toLowerCase()}`, num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "% de la población indígena", num: true, valor: (r) => r.parte.toFixed(1)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
}
panelM.addEventListener("input", pintarM);
pintarM();
display(html`<section class="beta-seccion">${panelM}${cuerpoM}</section>`);
```

---

<h2 id="pueblos-y-colonias" class="toc-anchor">Pueblos originarios y colonias</h2>

```js
const col = colonias.map((r) => ({...r, pueblo: String(r.pueblo_originario) === "True", pct: r.POBTOT > 0 && r.PHOG_IND != null ? 100 * r.PHOG_IND / r.POBTOT : null})).filter((r) => r.pct != null && r.POBTOT >= 500);
const selQue = campo({id: "c4c-que", nombre: "que", etiqueta: "Mostrar", opciones: [{clave: "top", etiqueta: "Las 25 colonias con mayor proporción"}, {clave: "pueblos", etiqueta: "Los pueblos originarios reconocidos"}], valor: "top"});
const panelC = html`<div class="panel-filtros"><div class="panel-campos">${selQue}</div></div>`;
const cuerpoC = document.createElement("div");
function pintarC() {
  const lista = (selQue.value === "top" ? col.slice().sort((a, b) => b.pct - a.pct).slice(0, 25) : col.filter((r) => r.pueblo).sort((a, b) => b.pct - a.pct)).map((r) => ({...r, etiqueta: `${r.colonia} (${r.alcaldia_col})`}));
  const enPueblos = col.filter((r) => r.pueblo);
  const totalCiudad = col.reduce((s, r) => s + r.PHOG_IND, 0);
  const enP = enPueblos.reduce((s, r) => s + r.PHOG_IND, 0);
  const top25 = col.slice().sort((a, b) => b.pct - a.pct).slice(0, 25);
  cuerpoC.replaceChildren(
    kpis([{etiqueta: "Pueblos originarios en el padrón de la SEPI", cifra: String(enPueblos.length), nota: "colonias del IECM marcadas con el padrón oficial"}, {etiqueta: "Población indígena que vive en pueblos originarios", cifra: pct(100 * enP / totalCiudad), nota: `${entero(enP)} de ${entero(totalCiudad)} en hogares indígenas`}, {etiqueta: "De las 25 colonias con mayor proporción, son pueblos", cifra: String(top25.filter((r) => r.pueblo).length), nota: "el resto son colonias sin ese reconocimiento"}]),
    figura({titulo: selQue.value === "top" ? "Las 25 colonias con mayor proporción de población en hogares indígenas" : "Los pueblos originarios reconocidos, por proporción de población en hogares indígenas", subtitulo: "Colonias del IECM con 500 habitantes o más; en rojo, las que están en el padrón de pueblos originarios de la SEPI", pie: "Censo 2020 (INEGI) por manzana, agregado a colonia (IECM 2022); padrón de pueblos y barrios originarios (SEPI) · cada punto es una colonia; en rojo, los pueblos originarios"},
      [lollipop(lista.map((r) => ({...r, nombre: r.etiqueta, valor: r.pct})), {ancho: Math.min(960, width), dominio: [0, Math.max(...col.map((r) => r.pct)) * 1.08], margenIzq: 280,
        destacado: (r) => r.pueblo, formato: (v) => pct(v), etiquetaX: "% de la población en hogares indígenas",
        renglones: [["Colonia", (r) => `${r.colonia} (${r.alcaldia_col})`], ["Pueblo originario", (r) => (r.pueblo ? [r.nombre_pueblo || r.colonia, r.etnia, r.lengua].filter(Boolean).join(" · ") : "no")], ["En hogares indígenas", (r) => pct(r.pct)], ["Personas", (r) => `${entero(r.PHOG_IND)} de ${entero(r.POBTOT)}`]]})]),
    claves([{termino: "Colonia", texto: "Suma de las manzanas del Censo que caen en ella; una manzana que cruza dos colonias se reparte según su área."}, {termino: "Pueblo originario", texto: "Colonia que coincide con uno de los pueblos del padrón de la SEPI.", color: ROJO}]),
    fuenteDe({datos: ["D-CENSO-2020-RESAGEBURB", "D-IECM-COLONIAS-2022", "D-SEPI-PUEBLOS"], cotejos: ["cdmx_phog_ind"], nota: "El padrón de la SEPI reconoce 50 pueblos originarios; la agregación de manzanas a colonias es propia y no tiene cifra oficial con qué compararla, así que se coteja el total de la ciudad."}),
    explicacion("Las colonias son las unidades territoriales del IECM (2022); cada manzana del Censo se reparte entre las colonias que la cruzan según su área y se suman sus personas. La marca de pueblo originario viene del padrón de la Secretaría de Pueblos y Barrios Originarios, que reconoce 50 pueblos con la misma clave del IECM. Se dejan fuera las colonias con menos de 500 habitantes, donde una proporción alta puede deberse a unas pocas personas."),
    tablaColumnas(lista, [{etiqueta: "Colonia", valor: (r) => r.colonia}, {etiqueta: "Alcaldía", valor: (r) => r.alcaldia_col}, {etiqueta: "Pueblo originario", valor: (r) => (r.pueblo ? "Sí" : "No")}, {etiqueta: "% en hogares indígenas", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.PHOG_IND)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.POBTOT)}], {titulo: "Ver los datos"}));
}
panelC.addEventListener("input", pintarC);
pintarC();
display(html`<section class="beta-seccion">${panelC}${cuerpoC}</section>`);
```
