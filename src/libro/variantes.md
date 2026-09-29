---
title: 5. Variantes y origen
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const [variantesCiudad, lenguasAlc, clin] = await Promise.all([
  FileAttachment("../data/variantes_ciudad.csv").csv(),
  FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("../data/clin_variantes.csv").csv(),
]);
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const DATOS_VAR = ["D-INALI-CLIN-2008", "D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
// La variante no se publica en ningún censo: no hay cifra oficial igual con
// qué cotejar. Lo más cercano es la estimación del INALI para 2000, hecha con
// el mismo cruce de lugar y Catálogo; se compara el orden de las variantes.
const notaInali = () => {
  const mayor = fuenteDe.valor("variantes", "inali2000_misma_variante_mayor"), top5 = fuenteDe.valor("variantes", "inali2000_top5");
  return `Ningún censo registra la variante, así que no hay una cifra oficial igual con qué cotejar. Lo más cercano es la estimación de hablantes por variante que publicó el INALI para 2000 con el mismo método: el lugar de residencia cruzado con el Catálogo. Frente a ella, la variante mayor de cada lengua con varias variantes es la misma en ${mayor != null ? `${mayor.toFixed(0)} %` : "la mayoría"} de las lenguas, y las cinco variantes mayores coinciden en promedio en ${top5 != null ? `${top5.toFixed(0)} %` : "su mayoría"}. Aquí se usa el lugar de nacimiento, no el de residencia, porque los hablantes de la ciudad llegaron de otra parte.`;
};
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
// Solo lenguas del catálogo (las claves 8000 y más son "otras de América" y "no especificado").
const vc = variantesCiudad.map((r) => ({...r, anio: Number(r.anio), num: Number(r.num), lengua: String(r.lengua).padStart(4, "0"), cve_alc: String(r.cve_alc).padStart(3, "0")})).filter((r) => r.lengua < "8000");
const nombreAlc = new Map(lenguasAlc.filter((r) => r.nivel === "alcaldia").map((r) => [String(r.cve).padStart(3, "0"), r.nombre]));
// Niveles de certeza, de más a menos seguro. Tres tonos de un mismo azul y gris
// para "sin variante": es un orden de confianza.
const CERTEZAS = [
  {clave: "exacta", etiqueta: "Exacta", color: "#08306b", texto: "se conoce el municipio donde vivía cinco años antes y ahí el Catálogo ubica una sola variante"},
  {clave: "unica", etiqueta: "Única", color: "#2171b5", texto: "solo se conoce la entidad de nacimiento, y en ella hay una sola variante de la lengua"},
  {clave: "estimada", etiqueta: "Estimada", color: "#9ecae1", texto: "la entidad tiene varias variantes; los hablantes se reparten según cuántos hay en los municipios de cada una"},
];
const colorCerteza = {domain: CERTEZAS.map((c) => c.etiqueta), range: CERTEZAS.map((c) => c.color)};
const etiquetaCerteza = new Map(CERTEZAS.map((c) => [c.clave, c.etiqueta]));
// Lenguas ordenadas por hablantes en la última edición.
const ultimoAnio = Math.max(...vc.map((r) => r.anio));
const porLengua = new Map();
for (const r of vc.filter((r) => r.anio === ultimoAnio)) porLengua.set(r.lengua, {nombre: r.lengua_nombre, num: (porLengua.get(r.lengua)?.num ?? 0) + r.num});
const lenguasOrden = [...porLengua.entries()].sort((a, b) => b[1].num - a[1].num);
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 5</span>
  <h1>Variantes y origen</h1>
  <p class="hero-entrada">Cada lengua indígena tiene variantes, y ningún censo pregunta cuál habla cada persona. Este capítulo muestra la variante probable de los hablantes de la Ciudad de México, inferida por su lugar de origen con el método del INALI, y qué tan segura es cada asignación.</p>
</div>

---

<h2 id="variantes-de-cada-lengua" class="toc-anchor">Las variantes de cada lengua en la ciudad</h2>

```js
const aniosV = [...new Set(vc.map((r) => r.anio))].sort();
const selLengua = campo({id: "c5-lengua", nombre: "lengua", etiqueta: "Lengua", opciones: lenguasOrden.map(([k, d]) => ({clave: k, etiqueta: d.nombre})), valor: lenguasOrden[0][0]});
const selAnio = campo({id: "c5-anio", nombre: "anio", etiqueta: "Año", opciones: aniosV.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(ultimoAnio)});
const selAlc = campo({id: "c5-alc", nombre: "alcaldia", etiqueta: "Alcaldía", opciones: [{clave: "", etiqueta: "Toda la ciudad", grupo: "En conjunto"}, ...[...nombreAlc.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))], valor: ""});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${selLengua}${selAnio}${selAlc}</div></div>`;
const cuerpoA = document.createElement("div");
function pintarA() {
  const lengua = selLengua.value, anio = Number(selAnio.value), alc = selAlc.value;
  const nombre = porLengua.get(lengua)?.nombre ?? lengua;
  const filas = vc.filter((r) => r.anio === anio && r.lengua === lengua && (!alc || r.cve_alc === alc));
  const conVar = filas.filter((r) => r.variante);
  const sin = filas.filter((r) => !r.variante).reduce((s, r) => s + r.num, 0);
  const total = filas.reduce((s, r) => s + r.num, 0);
  const porVar = new Map();
  for (const r of conVar) { const d = porVar.get(r.variante) ?? {variante: r.variante, total: 0, exacta: 0, unica: 0, estimada: 0}; d[r.certeza] += r.num; d.total += r.num; porVar.set(r.variante, d); }
  const top = [...porVar.values()].sort((a, b) => b.total - a.total).slice(0, 20);
  const apiladas = top.flatMap((d) => CERTEZAS.map((c) => ({variante: d.variante, certeza: c.etiqueta, num: d[c.clave]}))).filter((r) => r.num >= 0.5);
  const nCatalogo = clin.filter((r) => r.agrupacion.toLowerCase() === nombre.toLowerCase()).length;
  const lugar = alc ? nombreAlc.get(alc) : "la ciudad";
  cuerpoA.replaceChildren(
    kpis([{etiqueta: `Hablantes de ${nombre} en ${lugar}`, cifra: entero(total), nota: `${anio}; muestra censal`}, {etiqueta: "Con variante probable", cifra: pct(total ? 100 * (total - sin) / total : 0), nota: `${entero(sin)} sin variante (nacidos en la ciudad o sin registro)`}, {etiqueta: "Variantes presentes", cifra: `${porVar.size} de ${nCatalogo || "?"}`, nota: "del Catálogo del INALI con al menos un hablante probable"}]),
    top.length ? figura({titulo: `Variantes probables del ${nombre} en ${lugar}, ${anio}`, subtitulo: `Las ${top.length} variantes con más hablantes probables; el color dice qué tan segura es la asignación`, pie: "Censos e intercensales (INEGI), lugar de origen de cada hablante, y Catálogo de las Lenguas Indígenas Nacionales (INALI 2008) · cada barra es una variante"},
      [Plot.legend({color: {...colorCerteza, legend: true}}), Plot.plot({marginLeft: 270, marginRight: 60, height: 22 * top.length + 50, width: Math.min(980, width), color: colorCerteza, x: {label: "hablantes probables", grid: true}, y: {label: null, domain: top.map((r) => r.variante)},
        marks: [Plot.barX(apiladas, {x: "num", y: "variante", fill: "certeza", order: CERTEZAS.map((c) => c.etiqueta)}),
          Plot.text(top, {x: "total", y: "variante", text: (r) => entero(r.total), dx: 6, textAnchor: "start", fontSize: 11}),
          Plot.tip(top, Plot.pointerY({x: "total", y: "variante", maxRadius: Infinity, title: (r) => `${r.variante}\n${entero(r.total)} hablantes probables\nExacta ${entero(r.exacta)} · única ${entero(r.unica)} · estimada ${entero(r.estimada)}`})), Plot.ruleX([0])]})]) : html`<p class="beta-nota">Sin hablantes con variante probable en esta selección.</p>`,
    html`<p class="beta-nota">Para ver de dónde vienen y el territorio de cada variante, abre <a href="../mapa">el mapa</a>, elige la lengua y usa "Ver de dónde vienen" o "Ver el mapa de la lengua".</p>`,
    fuenteDe({datos: DATOS_VAR, referencia: ["R-INALI-EST-2000"], nota: notaInali(), lectura: ["R-INEGI-CLASIF-2020"]}),
    explicacion(["Ningún censo pregunta la variante. Aquí se aplica al lugar de origen de cada hablante el mismo cruce que usa el INALI para estimar hablantes por variante: el Catálogo ubica cada variante en municipios, y se asigna la variante que corresponde al lugar de donde viene la persona.", ...CERTEZAS.map((c) => `${c.etiqueta}: ${c.texto}.`), "Quienes nacieron en la ciudad o en otro país no reciben variante. Es una inferencia sobre el origen, no un dato de la persona: alguien pudo nacer en un lugar y hablar la variante de otro."]),
    tablaColumnas([...porVar.values()].sort((a, b) => b.total - a.total), [{etiqueta: "Variante", valor: (r) => r.variante}, {etiqueta: "Hablantes probables", num: true, valor: (r) => entero(r.total)}, {etiqueta: "Exacta", num: true, valor: (r) => entero(r.exacta)}, {etiqueta: "Única", num: true, valor: (r) => entero(r.unica)}, {etiqueta: "Estimada", num: true, valor: (r) => entero(r.estimada)}], {titulo: "Ver todas las variantes"}));
}
panelA.addEventListener("input", pintarA);
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="que-tan-segura" class="toc-anchor">Qué tan segura es la asignación</h2>

```js
const selAnioB = campo({id: "c5b-anio", nombre: "anio", etiqueta: "Año", opciones: aniosV.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(ultimoAnio)});
const panelB = html`<div class="panel-filtros"><div class="panel-campos">${selAnioB}</div></div>`;
const cuerpoB = document.createElement("div");
function pintarB() {
  const anio = Number(selAnioB.value);
  const top = lenguasOrden.slice(0, 15).map(([k]) => k);
  const filas = top.flatMap((k) => {
    const f = vc.filter((r) => r.anio === anio && r.lengua === k);
    const total = f.reduce((s, r) => s + r.num, 0);
    const nombre = porLengua.get(k).nombre;
    return [...CERTEZAS.map((c) => ({lengua: nombre, certeza: c.etiqueta, num: f.filter((r) => r.certeza === c.clave).reduce((s, r) => s + r.num, 0), total})), {lengua: nombre, certeza: "Sin variante", num: f.filter((r) => r.certeza === "sin").reduce((s, r) => s + r.num, 0), total}];
  }).map((r) => ({...r, share: r.total ? 100 * r.num / r.total : 0}));
  const dominio = [...CERTEZAS.map((c) => c.etiqueta), "Sin variante"];
  cuerpoB.replaceChildren(
    figura({titulo: `Cómo se asignó la variante en las 15 lenguas con más hablantes, ${anio}`, subtitulo: "Cada barra reparte a los hablantes de la lengua por nivel de certeza", pie: "Censos e intercensales (INEGI) y Catálogo del INALI 2008 · cada barra es una lengua; suma 100 %"},
      [Plot.legend({color: {domain: dominio, range: [...CERTEZAS.map((c) => c.color), "#bdbdbd"], legend: true}}),
       Plot.plot({marginLeft: 120, marginRight: 30, height: 24 * top.length + 50, width: Math.min(900, width), color: {domain: dominio, range: [...CERTEZAS.map((c) => c.color), "#bdbdbd"]}, x: {label: "% de los hablantes", grid: true, domain: [0, 100]}, y: {label: null, domain: top.map((k) => porLengua.get(k).nombre)},
        marks: [Plot.barX(filas, {x: "share", y: "lengua", fill: "certeza", order: dominio}),
          Plot.tip(filas.filter((r) => r.num >= 0.5), Plot.pointerY(Plot.stackX({x: "share", y: "lengua", z: "certeza", order: dominio, maxRadius: Infinity, title: (r) => `${r.lengua} · ${r.certeza}\n${entero(r.num)} hablantes (${pct(r.share)})`}))), Plot.ruleX([0])]})]),
    fuenteDe({datos: DATOS_VAR, referencia: ["R-INALI-EST-2000"], nota: notaInali()}),
    explicacion("La certeza depende de la lengua: una lengua que se habla en pocas entidades, cada una con una sola variante, sale casi toda 'única'; una lengua como el náhuatl o el zapoteco, con decenas de variantes en la misma entidad, sale casi toda 'estimada'. La parte sin variante son sobre todo hablantes nacidos en la ciudad. Como contraste externo, el orden de las variantes mayores de cada lengua coincide con el de los cuadros por variante del INALI de 2000 en 77 por ciento de las lenguas con varias variantes."));
}
panelB.addEventListener("input", pintarB);
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```
