---
title: Las lenguas de México
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, ejePct, COLOR_UNICO, ROJO, alCambiarModo, GLOBO, globo} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

import {treemap, lollipop, burbujas} from "../components/formas.js";
const geoEnt = await FileAttachment("../data/mx_entidades.json").json();
const [clin, lenguasNac, serieNac] = await Promise.all([
  FileAttachment("../data/clin_variantes.csv").csv(),
  FileAttachment("../data/lenguas_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_nacional.csv").csv({typed: true}),
]);
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const uni = (u) => String(u ?? "").replace(/pob (\d)\+/, "población de $1 años y más").replace("viv. particulares", "viviendas particulares");
const nac = lenguasNac.map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), cve: String(r.cve).padStart(2, "0")}));
```

<div class="hero-pagina">
  <span class="kicker">Las lenguas</span>
  <h1>Las lenguas de México</h1>
  <p class="hero-entrada">México reconoce 68 agrupaciones lingüísticas, repartidas en 11 familias y 364 variantes. Esta página muestra cómo se organizan, cuántas personas hablan cada una y en qué entidades viven.</p>
</div>

---

<h2 id="cuantas-lenguas" class="toc-anchor">Cuántas lenguas y cuántas variantes</h2>

```js
// Catálogo INALI 2008: familias, agrupaciones y variantes.
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "Sin familia asignada");
const porFamilia = [...new Map(clin.map((r) => [r.familia, null])).keys()].map((f) => { const filas = clin.filter((r) => r.familia === f); return {familia: f, agrupaciones: new Set(filas.map((r) => r.agrupacion)).size, variantes: filas.length}; }).sort((a, b) => b.variantes - a.variantes);
const porAgrupacion = [...new Map(clin.map((r) => [r.agrupacion, r.familia])).entries()].map(([a, f]) => ({agrupacion: a, familia: f, variantes: clin.filter((r) => r.agrupacion === a).length})).sort((a, b) => b.variantes - a.variantes);
const selVista = campo({id: "c1-vista", nombre: "vista", etiqueta: "Mostrar", opciones: [{clave: "familias", etiqueta: "Familias y agrupaciones (todo el catálogo)"}, {clave: "agrupaciones", etiqueta: "Las agrupaciones con más variantes"}], valor: "familias"});
const panelA = html`<div class="panel-filtros"><div class="panel-campos">${selVista}</div></div>`;
const cuerpoA = document.createElement("div");
function pintarA() {
  const nodos = [kpis([{etiqueta: "Familias lingüísticas", cifra: String(porFamilia.length), nota: "Catálogo de las Lenguas Indígenas Nacionales, INALI 2008"}, {etiqueta: "Agrupaciones lingüísticas", cifra: String(porAgrupacion.length), nota: "las 'lenguas' que pregunta el Censo"}, {etiqueta: "Variantes", cifra: String(clin.length), nota: "con autodenominación y municipios de referencia"}])];
  if (selVista.value === "familias") {
    nodos.push(figura({titulo: "Las 11 familias, sus 68 agrupaciones y sus 364 variantes", subtitulo: "Cada rectángulo es una agrupación lingüística; su área, el número de variantes que tiene; el color, su familia", pie: "INALI, Catálogo de las Lenguas Indígenas Nacionales 2008 · las tres familias con más variantes llevan color y las demás van en gris"},
      [treemap(porAgrupacion.map((r) => ({grupo: cap(r.familia), parte: cap(r.agrupacion), valor: r.variantes})), {ancho: Math.min(980, width), alto: 470, etiquetaOtras: "Otras familias",
        renglones: [["Agrupación", (d) => d.parte], ["Familia", (d) => d.grupo], ["Variantes", (d) => d.valor], ["Parte de las 364 variantes", (d) => pct(d.pct)]]})]));
  } else {
    const top = porAgrupacion.slice(0, 25);
    nodos.push(figura({titulo: "Las 25 agrupaciones con más variantes", subtitulo: "Una variante es una forma de la lengua con diferencias estructurales o léxicas y una identidad sociolingüística propia", pie: "INALI, Catálogo de las Lenguas Indígenas Nacionales 2008 · cada punto es una agrupación; el globo dice su familia"},
      [lollipop(top.map((r) => ({nombre: r.agrupacion, valor: r.variantes, familia: r.familia})), {ancho: Math.min(900, width), dominio: [0, porAgrupacion[0].variantes * 1.1], etiquetaX: "variantes",
        formato: (v) => String(v), renglones: [["Agrupación", (r) => r.nombre], ["Familia", (r) => r.familia], ["Variantes", (r) => r.valor]]})]));
  }
  nodos.push(fuenteDe({datos: ["D-INALI-CLIN-2008"], cotejos: ["clin_familias", "clin_agrupaciones", "clin_variantes"]}));
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
// Eje fijo: el total de la lengua mayor, para que elegir un sexo acorte las
// barras en vez de reescalar la gráfica.
const MAX_NAC = Math.max(...totalNac.map((r) => r.num + 1.96 * r.ee * r.den)) * 1.05;
const selLengua = campo({id: "c1-lengua", nombre: "lengua", etiqueta: "Lengua", opciones: [{clave: "todas", etiqueta: "Todas las lenguas", grupo: "En conjunto"}, ...lenguasOrden.map((r) => ({clave: r.lengua, etiqueta: r.lengua_nombre, grupo: "Una a una"}))], valor: "todas"});
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
      figura({titulo: `Cómo se reparten los hablantes entre las lenguas y sus familias, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}personas de 3 años y más; el área de cada rectángulo es su parte de todos los hablantes del país`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada rectángulo es una lengua; el color, su familia (las tres mayores con color y las demás en gris)"},
        [treemap(filas.map((r) => ({grupo: r.familia ? r.familia.charAt(0).toUpperCase() + r.familia.slice(1) : "Sin familia asignada", parte: r.lengua_nombre, valor: r.num})), {ancho: Math.min(980, width), alto: 470, etiquetaOtras: "Otras familias",
          renglones: [["Lengua", (d) => d.parte], ["Familia", (d) => d.grupo], ["Hablantes", (d) => entero(d.valor)], ["Parte de los hablantes", (d) => pct(d.pct)]]})]),
      figura({titulo: `Las 25 lenguas con más hablantes en México, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}personas de 3 años y más; el porcentaje es su parte de todos los hablantes`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada punto es una agrupación lingüística; el globo trae el intervalo de 95 %"},
        [lollipop(top.map((r) => ({...r, nombre: r.lengua_nombre, valor: r.num})), {ancho: Math.min(900, width), dominio: [0, MAX_NAC], etiquetaX: "hablantes",
          formato: (v) => entero(v), renglones: [["Lengua", (r) => r.lengua_nombre], ["Familia", (r) => r.familia], ["Hablantes", (r) => `${entero(r.num)} (± ${entero(1.96 * r.ee * r.den)})`], ["Parte de los hablantes del país", (r) => pct(r.share)]]})]),
      tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Lengua", valor: (r) => r.lengua_nombre}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los hablantes", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => entero(1.96 * r.ee * r.den)}], {titulo: "Ver las 70 lenguas"}));
  } else {
    const filas = nac.filter((r) => r.nivel === "entidad" && r.sexo === sexo && r.lengua === selLengua.value).sort((a, b) => b.num - a.num);
    const nombre = filas[0]?.lengua_nombre ?? selLengua.value;
    const total = filas.reduce((s, r) => s + r.num, 0);
    const top = filas.slice(0, 12).map((r) => ({...r, share: 100 * r.num / total, tasa: 100 * r.num / r.den}));
    nodos.push(kpis([{etiqueta: `Hablantes de ${nombre} en el país`, cifra: entero(total), nota: "personas de 3 años y más, 2020"}, {etiqueta: "Entidades con hablantes", cifra: String(filas.length), nota: "en la muestra del Censo"}, {etiqueta: "La entidad mayor reúne", cifra: pct(top[0]?.share ?? 0), nota: top[0]?.nombre ?? ""}]),
      figura({titulo: `Hablantes de ${nombre} en cada entidad, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}el área de cada círculo es proporcional al número de hablantes; en rojo, la Ciudad de México`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada círculo está en el centro de su entidad"},
        [burbujas(filas.map((r) => ({...r, share: 100 * r.num / total, tasa: 100 * r.num / r.den})), geoEnt, {ancho: Math.min(900, width), destacado: "09",
          tope: Math.max(...nac.filter((r) => r.nivel === "entidad" && r.sexo === "Total" && r.lengua === selLengua.value).map((r) => r.num)),
          renglones: [["Entidad", (r) => r.nombre], ["Hablantes", (r) => entero(r.num)], ["Parte de la lengua", (r) => pct(r.share)], ["De la población de la entidad", (r) => pct(r.tasa, 2)]]})]),
      figura({titulo: `Dónde viven los hablantes de ${nombre}, 2020`, subtitulo: `${sexo !== "Total" ? `${sexo} · ` : ""}todas las entidades con hablantes, de más a menos; en rojo, la Ciudad de México`, pie: "Censo 2020 (INEGI), cuestionario ampliado · cada punto es una entidad; el globo trae la proporción dentro de la entidad"},
        [lollipop(filas.map((r) => ({...r, valor: r.num, share: 100 * r.num / total, tasa: 100 * r.num / r.den})), {ancho: Math.min(900, width), destacado: (r) => r.cve === "09", etiquetaX: "hablantes",
          dominio: [0, Math.max(...nac.filter((r) => r.nivel === "entidad" && r.sexo === "Total" && r.lengua === selLengua.value).map((r) => r.num)) * 1.15], formato: (v) => entero(v),
          renglones: [["Entidad", (r) => r.nombre], ["Hablantes", (r) => entero(r.num)], ["Parte de la lengua", (r) => pct(r.share)], ["De la población de la entidad", (r) => pct(r.tasa, 2)]]})]),
      html`<p class="beta-nota">En rojo, la Ciudad de México. El mapa de la lengua por municipio, con la variante del catálogo, está en <a href="../mapa">el mapa</a>: elige la lengua y pulsa "Ver el mapa de la lengua".</p>`,
      tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total, tasa: 100 * r.num / r.den})), [{etiqueta: "Entidad", valor: (r) => r.nombre}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de la lengua", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "% de la entidad", num: true, valor: (r) => r.tasa.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => entero(1.96 * r.ee * r.den)}], {titulo: "Ver todas las entidades"}));
  }
  nodos.push(fuenteDe({datos: ["D-CENSO-2020"], cotejos: ["hablantes3_nacional_2020", "n_lenguas_nacional_2020", "nacional_0211_2020", "nacional_0602_2020", "nacional_0606_2020", "nacional_0607_2020", "nacional_0516_2020", "nacional_0513_2020"], lectura: ["R-INALI-DATOSGOB"]}));
  nodos.push(explicacion("El Censo 2020 pregunta a cada persona de 3 años y más si habla alguna lengua indígena y cuál. Las cifras salen del cuestionario ampliado, una muestra de cuatro millones de viviendas expandida a todo el país, por eso llevan intervalo. La muestra sobreestima al conteo completo (7,364,645 hablantes) en 2 por ciento en total, y más en algunas lenguas: el tabulado oficial da 589,144 hablantes de tseltal y 774,755 de maya, contra 672,586 y 800,533 de la muestra. Las cifras oficiales por lengua están en la tabla de verificaciones de la metodología. El desglose por entidad y sexo es el que esa muestra permite."));
  cuerpoB.replaceChildren(...nodos);
}
panelB.addEventListener("input", pintarB);
alCambiarModo(() => pintarB());
pintarB();
display(html`<section class="beta-seccion">${panelB}${cuerpoB}</section>`);
```

---

<h2 id="donde-se-habla" class="toc-anchor">Dónde se habla cada lengua</h2>

<div class="beta-seccion">
  <p>El territorio de cada lengua está en el mapa: cada municipio del país se pinta con la variante que el Catálogo del INALI ubica ahí, y con "Todas las lenguas" cada municipio toma la lengua con más hablantes según el Censo 2020. Es el territorio histórico de la lengua, no dónde vive hoy cada hablante; <a href="./de-donde-vienen">De dónde vienen</a> muestra el origen de quienes la hablan en la ciudad.</p>
  <p><a class="beta-boton-enlace" href="../mapa">Abrir el mapa de la lengua</a></p>
</div>
