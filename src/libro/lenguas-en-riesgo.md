---
title: Lenguas en riesgo
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis, claves} from "../components/graficas.js";
import {punto, ordinal, COLOR_UNICO, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";
import {unidades} from "../components/formas.js";

const [riesgo, variantesCiudad, lenguasAlc] = await Promise.all([
  FileAttachment("../data/inali_riesgo_2012.csv").csv({typed: true}),
  FileAttachment("../data/variantes_ciudad.csv").csv(),
  FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}),
]);
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
// Grados del INALI, de menor a mayor riesgo. Es un orden: van en los pasos de
// la rampa morada del sitio, del claro al oscuro, igual que toda categoría con
// orden (edad, marginación, certeza). El rojo queda para indígena contra resto.
const GRADOS = ["No inmediato", "Mediano", "Alto", "Muy alto"];
const COLOR_GRADO = Object.fromEntries(GRADOS.map((g, i) => [g, ordinal(4)[i]]));
// Qué significa cada grado, en una línea, a la vista junto a las gráficas.
const GRADOS_TEXTO = [
  {termino: "Muy alto", texto: "Ninguna localidad donde sus hablantes sean 30 % o más de la población, o menos de 100 hablantes en ellas."},
  {termino: "Alto y mediano", texto: "Situaciones intermedias entre los dos extremos, según hablantes, localidades y niños que la hablan."},
  {termino: "No inmediato", texto: "Más de una de esas localidades, más de 1,000 hablantes en ellas y más de 25 % de niños de 5 a 14 años."},
];
const clavesRiesgo = (extra = []) => claves([...extra, ...GRADOS_TEXTO.map((g) => ({...g, color: COLOR_GRADO[g.termino] ?? COLOR_GRADO["Alto"]}))], {titulo: "Qué significa cada grado de riesgo (INALI, 2012)"});
const colorGrado = {domain: GRADOS, range: GRADOS.map((g) => COLOR_GRADO[g])};
const gradoDe = new Map(riesgo.map((r) => [r.variante, r.grado]));
const agrupaciones = [...new Set(riesgo.map((r) => r.agrupacion))].sort((a, b) => a.localeCompare(b, "es"));
```

<div class="hero-pagina">
  <span class="kicker">Parte 1 · Las lenguas · 4 de 4</span>
  <h1>Lenguas en riesgo</h1>
  <p class="hero-entrada">No todas las variantes tienen el mismo futuro. El INALI clasificó cada una según su riesgo de desaparecer, y esta página cruza esa clasificación con las variantes que se hablan en la ciudad.</p>
</div>

---

<h2 id="cuantas-en-riesgo" class="toc-anchor">Cuántas variantes están en riesgo</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">01</span> Cuántas variantes están en riesgo</span>
  <p class="seccion-entrada">El riesgo se mide por variante, porque dentro de una misma lengua puede haber variantes en situaciones muy distintas. Aquí se ve el panorama del país completo y, al elegir una lengua, el de cada una de sus variantes.</p>
</header>

```js
const selAgr = campo({id: "c10-agr", nombre: "agrupacion", etiqueta: "Lengua", opciones: [{clave: "todas", etiqueta: "Todas las lenguas", grupo: "En conjunto"}, ...agrupaciones.map((a) => ({clave: a, etiqueta: a, grupo: "Una a una"}))], valor: "todas"});
const familiasR = [...new Set(riesgo.map((r) => r.familia))].sort((a, b) => a.localeCompare(b, "es"));
const selFamR = campo({id: "c10-fam", nombre: "familia", etiqueta: "Familia", opciones: [{clave: "", etiqueta: "Todas las familias", grupo: "En conjunto"}, ...familiasR.map((f) => ({clave: f, etiqueta: f, grupo: "Una a una"}))], valor: ""});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${selAgr}${selFamR}</div></div>`;
const cuerpoA = document.createElement("div");
function pintarA() {
  const agr = selAgr.value;
  // La familia acota el panorama; con una lengua elegida no aplica.
  selFamR.hidden = agr !== "todas";
  const fam = agr === "todas" ? selFamR.value : "";
  const filas = riesgo.filter((r) => (agr === "todas" || r.agrupacion === agr) && (!fam || r.familia === fam));
  const porGrado = GRADOS.map((g) => ({grado: g, n: filas.filter((r) => r.grado === g).length}));
  const nodos = [kpis([
    {etiqueta: agr !== "todas" ? `Variantes del ${agr}` : fam ? `Variantes de la familia ${fam}` : "Variantes en el catálogo", cifra: String(filas.length), nota: "INALI 2012, con datos del Censo 2000"},
    {etiqueta: "En muy alto riesgo", cifra: String(porGrado[3].n), nota: "sin localidades donde sus hablantes sean mayoría relativa"},
    {etiqueta: "Con algún riesgo inmediato", cifra: pct(100 * (filas.length - porGrado[0].n) / Math.max(1, filas.length), 0), nota: "muy alto, alto o mediano"},
  ])];
  if (agr === "todas") {
    // Ranking de lenguas por variantes en riesgo muy alto o alto, apiladas por grado.
    const porAgr = agrupaciones.map((a) => { const f = filas.filter((r) => r.agrupacion === a); return {agrupacion: a, total: f.length, graves: f.filter((r) => r.grado === "Muy alto" || r.grado === "Alto").length}; }).filter((r) => r.graves > 0).sort((a, b) => b.graves - a.graves || b.total - a.total).slice(0, 20);
    const apiladas = porAgr.flatMap((a) => GRADOS.map((g) => ({agrupacion: a.agrupacion, grado: g, n: riesgo.filter((r) => r.agrupacion === a.agrupacion && r.grado === g).length})));
    nodos.push(
      figura({titulo: `Las ${filas.length} variantes${fam ? ` de la familia ${fam}` : ""} por grado de riesgo`, subtitulo: "Cada cuadro es una variante; el color, su grado de riesgo de desaparecer", pie: "INALI, Lenguas indígenas nacionales en riesgo de desaparición (2012) · los cuadros se acomodan de la variante en mayor riesgo a la de menor"},
        [unidades(porGrado.map((r) => ({categoria: r.grado, valor: r.n})), {ancho: Math.min(1320, width), orden: GRADOS.slice().reverse(), colores: GRADOS.slice().reverse().map((g) => COLOR_GRADO[g]), porFila: 26,
          renglones: [["Grado de riesgo", (d) => d.categoria], ["Variantes", (d) => `${d.valor} (${pct(100 * d.valor / Math.max(1, filas.length))})`]]})]),
      ...(porAgr.length ? [figura({titulo: `Lenguas con más variantes en riesgo muy alto o alto${fam ? ` de la familia ${fam}` : ""} (hasta 20)`, subtitulo: "Cada barra suma las variantes de la lengua; el color es su grado", pie: "INALI 2012 · cada barra es una agrupación lingüística; elige una en el panel para ver sus variantes"},
        [Plot.legend({color: {...colorGrado, legend: true}}), Plot.plot({marginLeft: 150, marginRight: 50, height: 22 * porAgr.length + 50, width: Math.min(1320, width), color: colorGrado, x: {label: "variantes", grid: true}, y: {label: null, domain: porAgr.map((r) => r.agrupacion)},
          marks: [Plot.barX(apiladas, {x: "n", y: "agrupacion", fill: "grado", order: GRADOS.slice().reverse()}),
            Plot.tip(apiladas.filter((r) => r.n), Plot.pointerY(Plot.stackX({x: "n", y: "agrupacion", z: "grado", order: GRADOS.slice().reverse(), maxRadius: Infinity, ...GLOBO, ...globo([["Agrupación", (r) => r.agrupacion], ["Grado de riesgo", (r) => r.grado], ["Variantes", (r) => r.n]])}))), Plot.ruleX([0])]})])] : []));
  } else {
    const orden = filas.slice().sort((a, b) => GRADOS.indexOf(b.grado) - GRADOS.indexOf(a.grado) || a.hablantes_2000 - b.hablantes_2000);
    nodos.push(figura({titulo: `Las variantes del ${agr} y su grado de riesgo`, subtitulo: "Hablantes de cada variante en el Censo 2000; el color es su grado de riesgo", pie: "INALI 2012, con datos del Censo 2000 · cada barra es una variante"},
      [Plot.legend({color: {...colorGrado, legend: true}}), Plot.plot({marginLeft: 230, marginRight: 80, height: Math.max(160, 22 * orden.length + 50), width: Math.min(1320, width), color: colorGrado, x: {label: "hablantes en 2000", grid: true, type: orden.some((r) => r.hablantes_2000 > 0) ? "symlog" : "linear"}, y: {label: null, domain: orden.map((r) => r.variante)},
        marks: [Plot.barX(orden, {x: "hablantes_2000", y: "variante", fill: "grado"}), Plot.text(orden, {x: "hablantes_2000", y: "variante", text: (r) => entero(r.hablantes_2000), dx: 6, textAnchor: "start", fontSize: 11}),
          Plot.tip(orden, Plot.pointerY({x: "hablantes_2000", y: "variante", maxRadius: Infinity, ...GLOBO, ...globo([["Variante", (r) => r.variante], ["Grado de riesgo", (r) => r.grado], ["Hablantes en 2000", (r) => entero(r.hablantes_2000)], ["En localidades donde son 30 % o más", (r) => entero(r.hablantes_2000_loc30)], ["Niños de 5 a 14 años", (r) => `${pct(r.prop_ninos)} de los hablantes`]])})), Plot.ruleX([0])]})]));
  }
  nodos.push(clavesRiesgo());
  nodos.push(fuenteDe({datos: ["D-INALI-RIESGO-2012", "D-INALI-CLIN-2008"], cotejos: ["variantes_muy_alto", "variantes_alto", "variantes_mediano", "variantes_no_inmediato", "clin_variantes"]}));
  nodos.push(explicacion("El INALI mide el riesgo de cada variante con tres datos del Censo 2000: cuántos hablantes tiene, cuántos viven en localidades donde los hablantes son 30 % o más de la población (donde la lengua se usa en la vida diaria) y qué proporción de sus hablantes son niños de 5 a 14 años (si se sigue transmitiendo). Muy alto riesgo es no tener ninguna de esas localidades o tener menos de 100 hablantes en ellas; no inmediato, tener más de una localidad así, más de 1,000 hablantes en ellas y más de 25 % de niños. Es la única clasificación oficial por variante y no se ha actualizado con censos posteriores."),
    tablaColumnas(filas.slice().sort((a, b) => a.lugar - b.lugar), [{etiqueta: "Variante", valor: (r) => r.variante}, {etiqueta: "Lengua", valor: (r) => r.agrupacion}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Grado de riesgo", valor: (r) => r.grado}, {etiqueta: "Hablantes 2000", num: true, valor: (r) => entero(r.hablantes_2000)}, {etiqueta: "En localidades con 30 % o más", num: true, valor: (r) => entero(r.hablantes_2000_loc30)}, {etiqueta: "% niños 5 a 14", num: true, valor: (r) => r.prop_ninos}], {titulo: "Ver las variantes"}));
  cuerpoA.replaceChildren(...nodos);
}
panelA.addEventListener("input", pintarA);
pintarA();
display(html`<section class="beta-seccion">${panelA}${cuerpoA}</section>`);
```

---

<h2 id="en-la-ciudad" class="toc-anchor">Las variantes en riesgo que se hablan en la ciudad</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">02</span> Las variantes en riesgo que se hablan en la ciudad</span>
  <p class="seccion-entrada">La ciudad recibe hablantes de todo el país, y con ellos pueden llegar variantes en riesgo. Saber cuáles son y cuántas personas las hablan permite ubicar dónde tendría sentido un esfuerzo de preservación en la ciudad.</p>
</header>

```js
const vc = variantesCiudad.map((r) => ({...r, anio: Number(r.anio), num: Number(r.num), lengua: String(r.lengua).padStart(4, "0"), cve_alc: String(r.cve_alc).padStart(3, "0"), grado: gradoDe.get(r.variante) ?? null})).filter((r) => r.variante);
const aniosV = [...new Set(vc.map((r) => r.anio))].sort();
const nombreAlc = new Map(lenguasAlc.filter((r) => r.nivel === "alcaldia").map((r) => [String(r.cve).padStart(3, "0"), r.nombre]));
const lenguasV = [...new Map(vc.map((r) => [r.lengua, r.lengua_nombre])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
const selAnioB = campo({id: "c10-anio", nombre: "anio", etiqueta: "Año", opciones: aniosV.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosV.at(-1))});
const selAlcB = campo({id: "c10-alc", nombre: "alcaldia", etiqueta: "Alcaldía", opciones: [{clave: "", etiqueta: "Toda la ciudad", grupo: "En conjunto"}, ...[...nombreAlc.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))], valor: ""});
const selLenB = campo({id: "c10-len", nombre: "lengua", etiqueta: "Lengua", opciones: [{clave: "", etiqueta: "Todas las lenguas", grupo: "En conjunto"}, ...lenguasV.map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))], valor: ""});
const selCertB = campo({id: "c10-cert", nombre: "certeza", etiqueta: "Certeza de la variante", opciones: [{clave: "", etiqueta: "Todas", grupo: "En conjunto"}, {clave: "exacta", etiqueta: "Exacta", grupo: "Una a una"}, {clave: "unica", etiqueta: "Única", grupo: "Una a una"}, {clave: "estimada", etiqueta: "Estimada", grupo: "Una a una"}], valor: ""});
const panelB = html`<div class="panel-filtros"><div class="panel-campos">${selAnioB}${selAlcB}${selLenB}${selCertB}</div></div>`;
const cuerpoB = document.createElement("div");
function pintarB() {
  const anio = Number(selAnioB.value);
  const filas = vc.filter((r) => r.anio === anio && (!selAlcB.value || r.cve_alc === selAlcB.value) && (!selLenB.value || r.lengua === selLenB.value) && (!selCertB.value || r.certeza === selCertB.value));
  const porGrado = GRADOS.map((g) => ({grado: g, num: filas.filter((r) => r.grado === g).reduce((s, r) => s + r.num, 0)}));
  const total = porGrado.reduce((s, r) => s + r.num, 0);
  porGrado.forEach((r) => { r.share = total ? 100 * r.num / total : 0; });
  const porVariante = new Map();
  for (const r of filas.filter((r) => r.grado === "Muy alto" || r.grado === "Alto")) { const k = r.variante; const d = porVariante.get(k) ?? {variante: k, lengua: r.lengua_nombre, grado: r.grado, num: 0}; d.num += r.num; porVariante.set(k, d); }
  const graves = [...porVariante.values()].sort((a, b) => b.num - a.num).slice(0, 20);
  const lugar = selAlcB.value ? nombreAlc.get(selAlcB.value) : "la ciudad";
  cuerpoB.replaceChildren(
    kpis([{etiqueta: `Hablantes con variante probable, ${lugar}`, cifra: entero(total), nota: `${anio}; la variante se infiere por el lugar de origen`}, {etiqueta: "En variantes de riesgo muy alto o alto", cifra: pct(porGrado[2].share + porGrado[3].share), nota: `${entero(porGrado[2].num + porGrado[3].num)} hablantes probables`}, {etiqueta: "Variantes en riesgo muy alto o alto presentes", cifra: String(porVariante.size), nota: "con al menos un hablante probable"}]),
    figura({titulo: `De cada 100 hablantes de ${lugar} con variante probable, cuántos hablan una variante en riesgo, ${anio}`, subtitulo: `${selLenB.value ? `${lenguasV.find(([k]) => k === selLenB.value)[1]} · ` : ""}${selCertB.value ? `solo variantes con certeza ${selCertB.select.selectedOptions[0].textContent.toLowerCase()} · ` : ""}cada cuadro es uno de cada 100 hablantes; el color, el grado de riesgo de su variante`, pie: "Censos e intercensales (INEGI), variante probable por lugar de origen, y grado de riesgo del INALI (2012) · los porcentajes se redondean para sumar 100"},
      [unidades(porGrado.map((r) => ({categoria: r.grado, valor: r.share, num: r.num})), {ancho: Math.min(520, width), orden: GRADOS.slice().reverse(), colores: GRADOS.slice().reverse().map((g) => COLOR_GRADO[g]), escala100: true, porFila: 10,
        renglones: [["Grado de riesgo", (d) => d.categoria], ["Hablantes probables", (d) => entero(d.num)], ["Parte de los hablantes", (d) => pct(d.valor)]]})]),
    graves.length ? figura({titulo: `Las variantes en riesgo muy alto o alto con más hablantes probables en ${lugar}`, subtitulo: `${anio} · hasta 20 variantes`, pie: "Variante probable por lugar de origen · cada barra es una variante; el color es su grado"},
      [Plot.plot({marginLeft: 260, marginRight: 60, height: 22 * graves.length + 50, width: Math.min(1320, width), color: colorGrado, x: {label: "hablantes probables", grid: true}, y: {label: null, domain: graves.map((r) => r.variante)},
        marks: [Plot.barX(graves, {x: "num", y: "variante", fill: "grado"}), Plot.text(graves, {x: "num", y: "variante", text: (r) => entero(r.num), dx: 6, textAnchor: "start", fontSize: 11}),
          Plot.tip(graves, Plot.pointerY({x: "num", y: "variante", maxRadius: Infinity, ...GLOBO, ...globo([["Variante", (r) => r.variante], ["Lengua", (r) => r.lengua], ["Grado de riesgo", (r) => r.grado], ["Hablantes probables", (r) => entero(r.num)]])})), Plot.ruleX([0])]})]) : html`<p class="beta-nota">Sin variantes en riesgo muy alto o alto con hablantes probables en esta selección.</p>`,
    clavesRiesgo([{termino: "Hablantes probables", texto: "Hablantes de la ciudad cuya variante se infiere por su lugar de origen; no es la variante que declararon, porque ningún censo la pregunta."}]),
    fuenteDe({datos: ["D-INALI-RIESGO-2012", "D-INALI-CLIN-2008", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["variantes_muy_alto", "variantes_alto", "variantes_mediano", "variantes_no_inmediato"], referencia: ["R-INALI-EST-2000"], nota: "El riesgo de cada variante es el que publica el INALI. La variante de cada hablante de la ciudad es probable, no registrada: se compara con la estimación por variante del INALI en la página de variantes."}),
    explicacion("Ningún censo pregunta la variante. La variante probable de cada hablante se infiere por su lugar de origen con el método del INALI (ver el mapa y la metodología), y aquí se cruza con el grado de riesgo de 2012. Es una aproximación: dice cuántos hablantes de la ciudad provienen de territorios donde se habla una variante en riesgo, no cuántos la hablan con certeza. Los nacidos en la ciudad no reciben variante y no aparecen."),
    tablaColumnas([...porVariante.values()].sort((a, b) => b.num - a.num), [{etiqueta: "Variante", valor: (r) => r.variante}, {etiqueta: "Lengua", valor: (r) => r.lengua}, {etiqueta: "Grado", valor: (r) => r.grado}, {etiqueta: "Hablantes probables", num: true, valor: (r) => entero(r.num)}], {titulo: "Ver las variantes en riesgo muy alto o alto"}));
}
panelB.addEventListener("input", pintarB);
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```

---

<h2 id="ganan-o-pierden" class="toc-anchor">Lenguas que ganan o pierden hablantes en la ciudad</h2>
<header class="seccion-cabeza relato-seccion">
  <span class="kicker"><span class="kicker-num">03</span> Lenguas que ganan o pierden hablantes en la ciudad</span>
  <p class="seccion-entrada">La clasificación del INALI es de 2012. Esta sección la complementa con lo que pasó después en la ciudad: qué lenguas tienen más o menos hablantes entre dos ediciones, y si el cambio supera el margen de error.</p>
</header>

```js
// Solo ediciones con el mismo universo (3 años y más): 2010, 2015, 2020 y 2025.
const desde2010 = lenguasAlc.filter((r) => String(r.lengua).padStart(4, "0") < "8000" && Number(r.anio) >= 2010).map((r) => ({...r, anio: Number(r.anio), lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(3, "0")}));
const ciudad = desde2010.filter((r) => r.nivel === "entidad" && r.sexo === "Total");
const aniosC = [...new Set(ciudad.map((r) => r.anio))].sort();
const selIni = campo({id: "c10-ini", nombre: "ini", etiqueta: "Desde", opciones: aniosC.slice(0, -1).map((a) => ({clave: String(a), etiqueta: String(a)})), valor: "2010"});
const selFin = campo({id: "c10-fin", nombre: "fin", etiqueta: "Hasta", opciones: aniosC.slice(1).map((a) => ({clave: String(a), etiqueta: String(a)})), valor: String(aniosC.at(-1))});
const selSexoC = campo({id: "c10-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: "En conjunto"}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: "Una a una"}, {clave: "Hombres", etiqueta: "Hombres", grupo: "Una a una"}], valor: "Total"});
const selAlcC = campo({id: "c10-alc-c", nombre: "alcaldia", etiqueta: "Alcaldía", opciones: [{clave: "", etiqueta: "Toda la ciudad", grupo: "En conjunto"}, ...[...nombreAlc.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, n]) => ({clave: k, etiqueta: n, grupo: "Una a una"}))], valor: ""});
const panelC = html`<div class="panel-filtros"><div class="panel-campos">${selIni}${selFin}${selAlcC}${selSexoC}</div></div>`;
const cuerpoC = document.createElement("div");
// El sentido del cambio lo dice la flecha; el color solo separa lo que supera
// el margen de error (morado) de lo que no (gris). Antes el aumento era azul y
// la disminución roja, los mismos tonos de "resto" e "indígena".
const CAMBIO = {Aumenta: COLOR_UNICO, Disminuye: COLOR_UNICO, "Sin cambio distinguible": "#bdbdb7"};
const LEYENDA_CAMBIO = {domain: ["Cambio mayor que el margen de error", "Sin cambio distinguible"], range: [COLOR_UNICO, "#bdbdb7"]};
function pintarC() {
  const ini = Number(selIni.value), fin = Math.max(Number(selFin.value), ini + 1);
  const sexo = selSexoC.value, alc = selAlcC.value;
  const lugar = alc ? nombreAlc.get(alc) : "la ciudad";
  const universo = desde2010.filter((r) => r.sexo === sexo && (alc ? r.nivel === "alcaldia" && r.cve === alc : r.nivel === "entidad"));
  const a = new Map(universo.filter((r) => r.anio === ini).map((r) => [r.lengua, r]));
  const b = new Map(universo.filter((r) => r.anio === fin).map((r) => [r.lengua, r]));
  const filas = [...b.values()].filter((r) => a.has(r.lengua)).map((r) => {
    const r0 = a.get(r.lengua);
    const e0 = r0.ee ? 1.96 * r0.ee * r0.den : 0, e1 = r.ee ? 1.96 * r.ee * r.den : 0;
    const dif = r.num - r0.num, error = Math.sqrt(e0 * e0 + e1 * e1);
    return {lengua: r.lengua_nombre, ini: r0.num, fin: r.num, dif, error, cambio: Math.abs(dif) > error ? (dif > 0 ? "Aumenta" : "Disminuye") : "Sin cambio distinguible"};
  }).sort((x, y) => y.fin - x.fin).slice(0, 20);
  const puntos = filas.flatMap((r) => [{lengua: r.lengua, anio: String(ini), num: r.ini, cambio: r.cambio}, {lengua: r.lengua, anio: String(fin), num: r.fin, cambio: r.cambio}]);
  cuerpoC.replaceChildren(
    kpis(Object.keys(CAMBIO).map((k) => ({etiqueta: k, cifra: String(filas.filter((r) => r.cambio === k).length), nota: `de las ${filas.length} lenguas con más hablantes, ${ini} a ${fin}`}))),
    figura({titulo: `Hablantes de las ${filas.length} lenguas mayores en ${lugar}, ${ini} y ${fin}`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}cada línea une las dos ediciones; el color dice si el cambio supera el margen de error`, pie: "Censos e intercensales (INEGI), muestras de la ciudad, personas de 3 años y más · cada línea es una lengua; punto hueco, primer año"},
      [Plot.legend({color: {...LEYENDA_CAMBIO, legend: true}}),
       Plot.plot({marginLeft: 150, marginRight: 70, height: 22 * filas.length + 50, width: Math.min(1320, width), color: {domain: Object.keys(CAMBIO), range: Object.values(CAMBIO)}, x: {label: "hablantes", grid: true, type: "log"}, y: {label: null, domain: filas.map((r) => r.lengua)},
        marks: [Plot.link(filas, {x1: "ini", x2: "fin", y1: "lengua", y2: "lengua", stroke: "cambio", strokeWidth: 2.5, markerEnd: "arrow"}),
          Plot.dot(puntos.filter((p) => p.anio === String(ini)), {x: "num", y: "lengua", stroke: "cambio", fill: "white", r: 3.5}),
          Plot.dot(puntos.filter((p) => p.anio === String(fin)), {x: "num", y: "lengua", fill: "cambio", r: 3.5}),
          Plot.text(filas, {x: "fin", y: "lengua", text: (r) => `${r.dif > 0 ? "+" : ""}${entero(r.dif)}`, dx: 10, textAnchor: "start", fontSize: 10.5}),
          Plot.tip(filas, Plot.pointerY({x: "fin", y: "lengua", maxRadius: Infinity, ...GLOBO, ...globo([["Lengua", (r) => r.lengua], [String(ini), (r) => entero(r.ini)], [String(fin), (r) => entero(r.fin)], ["Cambio", (r) => `${r.dif > 0 ? "+" : ""}${entero(r.dif)} (margen ± ${entero(r.error)})`], ["Lectura", (r) => r.cambio]])}))]})]),
    fuenteDe({datos: ["D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["nahuatl_2015", "nahuatl_2020", "word_tabla2_celdas_iguales", "cdmx_hli3_2025"], lectura: ["R-SECULT-LENGUAS", "R-SEPI-2024-DIV"]}),
    explicacion("Se comparan las ediciones que preguntan desde los 3 años (2010, 2015, 2020 y 2025), todas muestras con error de diseño. Un cambio se marca como aumento o disminución solo si supera el margen de error combinado de las dos ediciones al 95 %; si no, se dice que no es distinguible, aunque las cifras sean distintas. La escala es logarítmica para que quepan lenguas de cientos y de decenas de miles de hablantes."),
    tablaColumnas(filas, [{etiqueta: "Lengua", valor: (r) => r.lengua}, {etiqueta: String(ini), num: true, valor: (r) => entero(r.ini)}, {etiqueta: String(fin), num: true, valor: (r) => entero(r.fin)}, {etiqueta: "Cambio", num: true, valor: (r) => entero(r.dif)}, {etiqueta: "Margen ± 95 %", num: true, valor: (r) => entero(r.error)}, {etiqueta: "Lectura", valor: (r) => r.cambio}], {titulo: "Ver los datos"}));
}
panelC.addEventListener("input", pintarC);
pintarC();
display(html`<section class="beta-seccion">${panelC}${cuerpoC}</section>`);
```

<div class="relato-cierre">
  <p>Aquí termina el recorrido por las lenguas. La segunda parte sigue a las personas que las hablan en la Ciudad de México.</p>
  <a class="book-cta book-cta-primary" href="./la-ciudad-en-el-pais">Sigue: La ciudad en el país</a>
</div>
