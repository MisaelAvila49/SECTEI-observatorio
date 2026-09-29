---
title: 1. Las lenguas de México
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {RAMPA_MORADA, ROJO_IBERO} from "../components/mapa.js";
import {punto} from "../components/base.js";

const [clin, lenguasNac, serieNac] = await Promise.all([
  FileAttachment("../data/clin_variantes.csv").csv(),
  FileAttachment("../data/lenguas_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_nacional.csv").csv({typed: true}),
]);
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const nac = lenguasNac.map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(2, "0")}));
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 1</span>
  <h1>Las lenguas de México</h1>
  <p class="hero-entrada">México reconoce 68 agrupaciones lingüísticas, repartidas en 11 familias y 364 variantes. Este capítulo cuenta cuántas son, a qué familia pertenecen, cuántas personas hablan cada una según el Censo 2020 y en qué entidades viven.</p>
</div>

---

<h2 id="cuantas-lenguas" class="toc-anchor">Cuántas lenguas y cuántas variantes</h2>

```js
// Catálogo INALI 2008: familias, agrupaciones y variantes.
const porFamilia = [...new Map(clin.map((r) => [r.familia, null])).keys()].map((f) => { const filas = clin.filter((r) => r.familia === f); return {familia: f, agrupaciones: new Set(filas.map((r) => r.agrupacion)).size, variantes: filas.length}; }).sort((a, b) => b.variantes - a.variantes);
const porAgrupacion = [...new Map(clin.map((r) => [r.agrupacion, r.familia])).entries()].map(([a, f]) => ({agrupacion: a, familia: f, variantes: clin.filter((r) => r.agrupacion === a).length})).sort((a, b) => b.variantes - a.variantes);
const selVista = campo({id: "c1-vista", nombre: "vista", etiqueta: "Mostrar", opciones: [{clave: "familias", etiqueta: "Las 11 familias"}, {clave: "agrupaciones", etiqueta: "Las agrupaciones con más variantes"}], valor: "familias"});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${selVista}</div></div>`;
const cuerpoA = document.createElement("div");
const colorFamilia = new Map(porFamilia.map((f, i) => [f.familia, i]));
function pintarA() {
  const nodos = [kpis([{etiqueta: "Familias lingüísticas", cifra: String(porFamilia.length), nota: "Catálogo de las Lenguas Indígenas Nacionales, INALI 2008"}, {etiqueta: "Agrupaciones lingüísticas", cifra: String(porAgrupacion.length), nota: "las 'lenguas' que pregunta el Censo"}, {etiqueta: "Variantes", cifra: String(clin.length), nota: "con autodenominación y municipios de referencia"}])];
  if (selVista.value === "familias") {
    nodos.push(figura({titulo: "Las 11 familias lingüísticas, por número de variantes", subtitulo: "Cada familia agrupa lenguas emparentadas; oto-mangue y yuto-nahua concentran la mayor diversidad", pie: "INALI, Catálogo de las Lenguas Indígenas Nacionales 2008 · cada barra es una familia; el número entre paréntesis, sus agrupaciones"},
      [Plot.plot({marginLeft: 140, marginRight: 70, height: 26 * porFamilia.length + 60, width: Math.min(900, width), x: {label: "variantes", grid: true}, y: {label: null, domain: porFamilia.map((r) => r.familia)},
        marks: [Plot.barX(porFamilia, {x: "variantes", y: "familia", fill: RAMPA_MORADA[3]}), Plot.text(porFamilia, {x: "variantes", y: "familia", text: (r) => `${r.variantes} (${r.agrupaciones})`, dx: 6, textAnchor: "start", fontSize: 11.5}),
          Plot.tip(porFamilia, Plot.pointerY({x: "variantes", y: "familia", maxRadius: Infinity, title: (r) => `Familia ${r.familia}\n${r.agrupaciones} agrupaciones · ${r.variantes} variantes`})), Plot.ruleX([0])]})]));
  } else {
    const top = porAgrupacion.slice(0, 25);
    nodos.push(figura({titulo: "Las 25 agrupaciones con más variantes", subtitulo: "Una variante es una forma de la lengua con diferencias estructurales o léxicas y una identidad sociolingüística propia", pie: "INALI, Catálogo de las Lenguas Indígenas Nacionales 2008 · cada barra es una agrupación; el color, su familia"},
      [Plot.plot({marginLeft: 150, marginRight: 60, height: 22 * top.length + 60, width: Math.min(900, width), x: {label: "variantes", grid: true}, y: {label: null, domain: top.map((r) => r.agrupacion)}, color: {legend: true, domain: porFamilia.map((f) => f.familia), range: ["#4d004b", "#88419d", "#2166AC", "#B87709", "#C4101B", "#8c96c6", "#1b7837", "#762a83", "#e08214", "#5e3c99", "#8a8a86"]},
        marks: [Plot.barX(top, {x: "variantes", y: "agrupacion", fill: "familia"}), Plot.text(top, {x: "variantes", y: "agrupacion", text: "variantes", dx: 6, textAnchor: "start", fontSize: 11.5}),
          Plot.tip(top, Plot.pointerY({x: "variantes", y: "agrupacion", maxRadius: Infinity, title: (r) => `${r.agrupacion} (familia ${r.familia})\n${r.variantes} variantes`})), Plot.ruleX([0])]})]));
  }
  nodos.push(explicacion("El Catálogo de las Lenguas Indígenas Nacionales (INALI, 2008) ordena las lenguas en tres niveles: la familia, que reúne lenguas con un origen común; la agrupación, que es lo que comúnmente se llama 'lengua' y lo que pregunta el Censo; y la variante, la forma concreta que se habla en un territorio, con su propia autodenominación. Las 364 variantes son las que el INALI trata como lenguas para fines de política pública."),
    tablaColumnas(porAgrupacion, [{etiqueta: "Agrupación", valor: (r) => r.agrupacion}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Variantes", num: true, valor: (r) => r.variantes}], {titulo: "Ver las 68 agrupaciones"}));
  cuerpoA.replaceChildren(...nodos);
}
panelA.addEventListener("input", pintarA);
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="cuantos-hablantes" class="toc-anchor">Cuántas personas hablan cada lengua</h2>

```js
const totalNac = nac.filter((r) => r.nivel === "nacional" && r.sexo === "Total");
const lenguasOrden = totalNac.slice().sort((a, b) => b.num - a.num);
const selLengua = campo({id: "c1-lengua", nombre: "lengua", etiqueta: "Lengua", opciones: [{clave: "todas", etiqueta: "Las 25 con más hablantes", grupo: "En conjunto"}, ...lenguasOrden.map((r) => ({clave: r.lengua, etiqueta: r.lengua_nombre, grupo: "Una a una"}))], valor: "todas"});
const selSexoB = campo({id: "c1-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: "En conjunto"}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: "Una a una"}, {clave: "Hombres", etiqueta: "Hombres", grupo: "Una a una"}], valor: "Total"});
const panelB = html`<div class="panel-filtros"><div class="panel-campos">${selLengua}${selSexoB}</div></div>`;
const cuerpoB = document.createElement("div");
function pintarB() {
  const sexo = selSexoB.value;
  const nodos = [];
  if (selLengua.value === "todas") {
    const filas = nac.filter((r) => r.nivel === "nacional" && r.sexo === sexo).sort((a, b) => b.num - a.num);
    const total = filas.reduce((s, r) => s + r.num, 0);
    const top = filas.slice(0, 25).map((r) => ({...r, share: 100 * r.num / total}));
    nodos.push(kpis([{etiqueta: "Hablantes de 3 años y más en el país", cifra: entero(total), nota: "muestra del Censo 2020; el conteo del ITER da 7,364,645"}, {etiqueta: "Lenguas con hablantes", cifra: String(filas.length), nota: "agrupaciones del catálogo del INALI en la muestra"}, {etiqueta: "Las cinco mayores reúnen", cifra: pct(top.slice(0, 5).reduce((s, r) => s + r.share, 0)), nota: "de todos los hablantes"}]),
      figura({titulo: `Las 25 lenguas con más hablantes en México, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}personas de 3 años y más; el porcentaje es su parte de todos los hablantes`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada barra es una agrupación lingüística; estimación con intervalo de 95 %"},
        [Plot.plot({marginLeft: 150, marginRight: 110, height: 22 * top.length + 60, width: Math.min(900, width), x: {label: "hablantes", grid: true}, y: {label: null, domain: top.map((r) => r.lengua_nombre)},
          marks: [Plot.barX(top, {x: "num", y: "lengua_nombre", fill: RAMPA_MORADA[3]}), Plot.ruleX(top, {x1: (r) => Math.max(0, r.num - 1.96 * r.ee * r.den), x2: (r) => r.num + 1.96 * r.ee * r.den, y: "lengua_nombre", stroke: "currentColor", strokeOpacity: 0.5}),
            Plot.text(top, {x: "num", y: "lengua_nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 8, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(top, Plot.pointerY({x: "num", y: "lengua_nombre", maxRadius: Infinity, title: (r) => `${r.lengua_nombre} (${r.familia})\n${entero(r.num)} hablantes · ${pct(r.share)} de los hablantes del país\n± ${entero(1.96 * r.ee * r.den)} (95 %)`})), Plot.ruleX([0])]})]),
      tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Lengua", valor: (r) => r.lengua_nombre}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los hablantes", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => entero(1.96 * r.ee * r.den)}], {titulo: "Ver las 70 lenguas"}));
  } else {
    const filas = nac.filter((r) => r.nivel === "entidad" && r.sexo === sexo && r.lengua === selLengua.value).sort((a, b) => b.num - a.num);
    const nombre = filas[0]?.lengua_nombre ?? selLengua.value;
    const total = filas.reduce((s, r) => s + r.num, 0);
    const top = filas.slice(0, 12).map((r) => ({...r, share: 100 * r.num / total, tasa: 100 * r.num / r.den}));
    nodos.push(kpis([{etiqueta: `Hablantes de ${nombre} en el país`, cifra: entero(total), nota: "personas de 3 años y más, 2020"}, {etiqueta: "Entidades con hablantes", cifra: String(filas.length), nota: "en la muestra del Censo"}, {etiqueta: "La entidad mayor reúne", cifra: pct(top[0]?.share ?? 0), nota: top[0]?.nombre ?? ""}]),
      figura({titulo: `Dónde viven los hablantes de ${nombre}, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}las doce entidades con más hablantes; el porcentaje es su parte de todos los hablantes de la lengua`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada barra es una entidad; el globo trae la proporción dentro de la entidad"},
        [Plot.plot({marginLeft: 150, marginRight: 110, height: 24 * top.length + 60, width: Math.min(900, width), x: {label: "hablantes", grid: true}, y: {label: null, domain: top.map((r) => r.nombre)},
          marks: [Plot.barX(top, {x: "num", y: "nombre", fill: (r) => (r.cve === "09" ? ROJO_IBERO : RAMPA_MORADA[3])}), Plot.text(top, {x: "num", y: "nombre", text: (r) => `${entero(r.num)} (${pct(r.share)})`, dx: 8, textAnchor: "start", fontSize: 11.5}),
            Plot.tip(top, Plot.pointerY({x: "num", y: "nombre", maxRadius: Infinity, title: (r) => `${r.nombre}\n${entero(r.num)} hablantes de ${nombre} · ${pct(r.share)} de la lengua\n${pct(r.tasa, 2)} de la población de 3 años y más de la entidad`})), Plot.ruleX([0])]})]),
      html`<p class="beta-nota">En rojo, la Ciudad de México. El mapa de la lengua por municipio, con la variante del catálogo, está en <a href="../mapa">el mapa</a>: elige la lengua y pulsa "Ver el mapa de la lengua".</p>`,
      tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total, tasa: 100 * r.num / r.den})), [{etiqueta: "Entidad", valor: (r) => r.nombre}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de la lengua", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "% de la entidad", num: true, valor: (r) => r.tasa.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => entero(1.96 * r.ee * r.den)}], {titulo: "Ver todas las entidades"}));
  }
  nodos.push(explicacion("El Censo 2020 pregunta a cada persona de 3 años y más si habla alguna lengua indígena y cuál. Las cifras salen del cuestionario ampliado, una muestra de cuatro millones de viviendas expandida a todo el país, por eso llevan intervalo. La muestra sobreestima al conteo completo (7,364,645 hablantes) en 2 por ciento en total, y más en algunas lenguas: el tabulado oficial da 589,144 hablantes de tseltal y 774,755 de maya, contra 672,586 y 800,533 de la muestra. Las cifras oficiales por lengua están en la tabla de verificaciones de la metodología. El desglose por entidad y sexo es el que esa muestra permite."));
  cuerpoB.replaceChildren(...nodos);
}
panelB.addEventListener("input", pintarB);
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```

---

<h2 id="donde-se-habla" class="toc-anchor">Dónde se habla cada lengua</h2>

<div class="beta-seccion">
  <p>El territorio de cada lengua está en el mapa: cada municipio del país se pinta con la variante que el Catálogo del INALI ubica ahí, y con "Todas las lenguas" cada municipio toma la lengua con más hablantes según el Censo 2020. Es el territorio histórico de la lengua, no dónde vive hoy cada hablante; el capítulo 2 muestra de dónde vienen quienes la hablan en la ciudad.</p>
  <p><a class="beta-boton-enlace" href="../mapa">Abrir el mapa de la lengua</a></p>
</div>

---

<h2 id="serie-nacional" class="toc-anchor">La serie nacional, 1990 - 2025</h2>

```js
const SERIES = [
  {clave: "hablantes5", etiqueta: "Hablan lengua indígena, 5 años y más", corto: "Hablantes (5 años y más)"},
  {clave: "hablantes3", etiqueta: "Hablan lengua indígena, 3 años y más", corto: "Hablantes (3 años y más)"},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas"},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas"},
];
const selSerie = campo({id: "c1-serie", nombre: "serie", etiqueta: "Población", opciones: [{clave: "todas", etiqueta: "Todas juntas (comparar)", grupo: "En conjunto"}, ...SERIES.map((s) => ({...s, grupo: "Una a una"}))], valor: "todas"});
const selMedida = campo({id: "c1-medida", nombre: "medida", etiqueta: "Medida", opciones: [{clave: "pct", etiqueta: "Porcentaje de la población"}, {clave: "num", etiqueta: "Personas"}], valor: "pct"});
const panelS = html`<div class="panel-filtros"><div class="panel-campos">${selSerie}${selMedida}</div></div>`;
const cuerpoS = document.createElement("div");
const COLORES = {hablantes5: "#88419d", hablantes3: "#4d004b", autoads: "#C4101B", hogares: "#2166AC"};
function pintarS() {
  const claves = selSerie.value === "todas" ? SERIES.map((s) => s.clave) : [selSerie.value];
  const filas = serieNac.filter((r) => claves.includes(r.poblacion)).map((r) => ({...r, serie: SERIES.find((s) => s.clave === r.poblacion).corto, valor: selMedida.value === "pct" ? r.pct : r.num}));
  const esPct = selMedida.value === "pct";
  const ultimo = (k) => serieNac.filter((r) => r.poblacion === k).sort((a, b) => b.anio - a.anio)[0];
  const ultimos = filas.filter((r) => r.anio === Math.max(...filas.filter((f) => f.serie === r.serie).map((f) => f.anio)));
  cuerpoS.replaceChildren(
    kpis([{etiqueta: "Hablantes de 3 años y más, 2025", cifra: entero(ultimo("hablantes3").num), nota: `${pct(ultimo("hablantes3").pct)} de la población de 3 años y más`}, {etiqueta: "Se consideran indígenas, 2025", cifra: entero(ultimo("autoads").num), nota: `${pct(ultimo("autoads").pct)} de la población`}, {etiqueta: "Hablantes de 5 años y más, 1990 y 2020", cifra: `${pct(serieNac.find((r) => r.poblacion === "hablantes5" && r.anio === 1990).pct)} y ${pct(ultimo("hablantes5").pct)}`, nota: "proporción de la población de 5 años y más"}]),
    figura({titulo: esPct ? "Población indígena de México por edición, en porcentaje" : "Población indígena de México por edición, en personas", subtitulo: "Cada serie usa el universo con que la publica el INEGI; el globo lo dice", pie: "Censos, conteos e intercensales (INEGI), cifras oficiales publicadas · cada punto es una edición; los huecos, ediciones sin la pregunta"},
      [Plot.plot({height: 320, width: Math.min(900, width), marginLeft: 70, marginRight: 170, x: {label: null, tickFormat: (d) => String(d), domain: [1988, 2027]}, y: {label: esPct ? "%" : "personas", grid: true, zero: true, tickFormat: esPct ? undefined : (d) => `${(d / 1e6).toFixed(0)} M`},
        color: {domain: claves.map((k) => SERIES.find((s) => s.clave === k).corto), range: claves.map((k) => COLORES[k])},
        marks: [Plot.line(filas, {x: "anio", y: "valor", stroke: "serie", strokeWidth: 2}), Plot.dot(filas, {x: "anio", y: "valor", fill: "serie", r: 4}),
          Plot.text(ultimos, {x: "anio", y: "valor", text: "serie", dx: 8, textAnchor: "start", fontSize: 11}),
          Plot.tip(filas, Plot.pointerX({x: "anio", y: "valor", maxRadius: Infinity, title: (r) => `${r.anio} · ${r.serie}\n${entero(r.num)} personas · ${pct(r.pct)}\nUniverso: ${r.universo}${r.nota ? `\n${r.nota}` : ""}`})),
          Plot.ruleY([0])]})]),
    explicacion("Son las cifras oficiales que el INEGI publicó en cada edición, sin recalcular. Los hablantes de 5 años y más forman la serie más larga (1990 - 2020, sin 2015); desde 2010 el Censo pregunta desde los 3 años. La autoadscripción cambió de universo: 5 años y más en 2000, 3 y más en 2010 y 2020, toda la población en 2015 y 2025, y en 2015 existió además la categoría 'se considera en parte'. La población en hogares indígenas del ITER (2010 y 2020) no es la del INPI, que suma además a los hablantes fuera de esos hogares."),
    tablaColumnas(filas.slice().sort((a, b) => a.anio - b.anio || a.serie.localeCompare(b.serie)), [{etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Población", valor: (r) => r.serie}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población de referencia", num: true, valor: (r) => entero(r.den)}, {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "Universo", valor: (r) => r.universo}, {etiqueta: "Fuente", valor: (r) => r.tabla}], {titulo: "Ver la serie con sus fuentes"}));
}
panelS.addEventListener("input", pintarS);
pintarS();
display(html`<section class="beta-seccion">${panelS}${cuerpoS}</section>`);
```
