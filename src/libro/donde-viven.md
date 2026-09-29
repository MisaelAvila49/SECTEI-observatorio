---
title: 4. Dónde viven
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {RAMPA_MORADA, ROJO_IBERO} from "../components/mapa.js";
import {punto} from "../components/base.js";

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
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 4</span>
  <h1>Dónde viven</h1>
  <p class="hero-entrada">De la alcaldía a la manzana. Este capítulo muestra en qué partes de la Ciudad de México vive la población indígena, cómo se relaciona esa distribución con la marginación urbana de cada AGEB y qué tanto coinciden las colonias con más población indígena con los pueblos originarios reconocidos.</p>
</div>

---

<h2 id="por-alcaldia" class="toc-anchor">Por alcaldía, 1990 - 2025</h2>

```js
display(seccionCenso(datos, {id: "c4alc", inicial: {nivel: "municipio", cveEnt: "09"}}));
```

---

<h2 id="por-ageb-y-manzana" class="toc-anchor">Por AGEB y por manzana, 2010 y 2020</h2>

```js
display(seccionCenso(datos, {id: "c4ageb", inicial: {nivel: "ageb", cveEnt: "09", vista: "mapa"}}));
```

---

<h2 id="marginacion" class="toc-anchor">Presencia indígena y marginación urbana</h2>

```js
// Población en hogares indígenas y hablantes por grado de marginación urbana de la AGEB (CONAPO 2020).
const GRADOS = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"];
const ag20 = agebs.map((r) => ({...r, cve_ageb: String(r.cve_ageb).padStart(13, "0")})).filter((r) => r.gm_conapo);
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
        Plot.plot({marginLeft: 80, marginRight: 60, height: 200, width: Math.min(440, width / 2), x: {label: `% ${nombrePob === "Hablantes de lengua indígena" ? "de la población de 3 años y más" : "de la población"}`, grid: true}, y: {label: null, domain: GRADOS},
          marks: [Plot.barX(porGrado, {x: "pct", y: "grado", fill: (r) => RAMPA_MORADA[1 + GRADOS.indexOf(r.grado) * 0.75 | 0]}), Plot.text(porGrado, {x: "pct", y: "grado", text: (r) => pct(r.pct), dx: 6, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(porGrado, Plot.pointerY({x: "pct", y: "grado", maxRadius: Infinity, title: (r) => `Grado ${r.grado.toLowerCase()}: ${r.agebs} AGEB\n${nombrePob}: ${pct(r.pct)}\n${entero(r.num)} de ${entero(r.den)} personas`})), Plot.ruleX([0])]}),
        Plot.plot({marginLeft: 80, marginRight: 60, height: 200, width: Math.min(440, width / 2), x: {label: "% de la población indígena", grid: true}, y: {label: null, domain: GRADOS},
          marks: [Plot.barX(porGrado, {x: "parte", y: "grado", fill: (r) => RAMPA_MORADA[1 + GRADOS.indexOf(r.grado) * 0.75 | 0]}), Plot.text(porGrado, {x: "parte", y: "grado", text: (r) => pct(r.parte), dx: 6, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(porGrado, Plot.pointerY({x: "parte", y: "grado", maxRadius: Infinity, title: (r) => `Grado ${r.grado.toLowerCase()}\n${pct(r.parte)} de la población indígena de ${lugar} vive en AGEB de este grado\n${entero(r.num)} personas`})), Plot.ruleX([0])]}),
      ]}</div>`]),
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
    figura({titulo: selQue.value === "top" ? "Las 25 colonias con mayor proporción de población en hogares indígenas" : "Los pueblos originarios reconocidos, por proporción de población en hogares indígenas", subtitulo: "Colonias del IECM con 500 habitantes o más; en rojo, las que están en el padrón de pueblos originarios de la SEPI", pie: "Censo 2020 (INEGI) por manzana, agregado a colonia (IECM 2022); padrón de pueblos y barrios originarios (SEPI) · cada barra es una colonia"},
      [Plot.plot({marginLeft: 260, marginRight: 60, height: 22 * lista.length + 60, width: Math.min(960, width), x: {label: "% de la población en hogares indígenas", grid: true}, y: {label: null, domain: lista.map((r) => r.etiqueta)},
        marks: [Plot.barX(lista, {x: "pct", y: "etiqueta", fill: (r) => (r.pueblo ? ROJO_IBERO : RAMPA_MORADA[3])}), Plot.text(lista, {x: "pct", y: "etiqueta", text: (r) => pct(r.pct), dx: 6, textAnchor: "start", fontSize: 11}),
          Plot.tip(lista, Plot.pointerY({x: "pct", y: "etiqueta", maxRadius: Infinity, title: (r) => `${r.colonia} (${r.alcaldia_col})\n${r.pueblo ? `Pueblo originario: ${r.nombre_pueblo || r.colonia}${r.etnia ? ` · ${r.etnia}` : ""}${r.lengua ? ` · ${r.lengua}` : ""}` : "Sin reconocimiento de pueblo originario"}\nPoblación en hogares indígenas: ${pct(r.pct)}\n${entero(r.PHOG_IND)} de ${entero(r.POBTOT)} personas`})), Plot.ruleX([0])]})]),
    explicacion("Las colonias son las unidades territoriales del IECM (2022); cada manzana del Censo se reparte entre las colonias que la cruzan según su área y se suman sus personas. La marca de pueblo originario viene del padrón de la Secretaría de Pueblos y Barrios Originarios, que reconoce 50 pueblos con la misma clave del IECM. Se dejan fuera las colonias con menos de 500 habitantes, donde una proporción alta puede deberse a unas pocas personas."),
    tablaColumnas(lista, [{etiqueta: "Colonia", valor: (r) => r.colonia}, {etiqueta: "Alcaldía", valor: (r) => r.alcaldia_col}, {etiqueta: "Pueblo originario", valor: (r) => (r.pueblo ? "Sí" : "No")}, {etiqueta: "% en hogares indígenas", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.PHOG_IND)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.POBTOT)}], {titulo: "Ver los datos"}));
}
panelC.addEventListener("input", pintarC);
pintarC();
display(html`<section class="beta-seccion">${panelC}${cuerpoC}</section>`);
```
