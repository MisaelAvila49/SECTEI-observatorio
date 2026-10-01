---
title: La ciudad en el país
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {datosCenso, seccionCenso} from "../components/seccion-censo.js";
import {campo} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, ejePct, COLOR_UNICO, GLOBO, globo, alCambiarModo} from "../components/base.js";
import {coropleta, lollipop, treemap} from "../components/formas.js";
import {procedencia} from "../components/fuentes.js";

const [nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, lenguasAlc, origen] = await Promise.all([
  FileAttachment("../data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("../data/inpi_2020.csv").csv({typed: true}),
  FileAttachment("../data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("../data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("../data/geo_catalogo.csv").csv(),
  FileAttachment("../data/mx_entidades.json").json(),
  FileAttachment("../data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("../data/lenguas_origen.csv").csv({typed: true}),
]);
const pmtiles = {municipios: await FileAttachment("../data/municipios.pmtiles").url(), agebs: await FileAttachment("../data/agebs.pmtiles").url(), manzanas: await FileAttachment("../data/manzanas.pmtiles").url(), agebs2010: null, manzanas2010: null};
try { pmtiles.agebs2010 = await FileAttachment("../data/agebs_2010.pmtiles").url(); } catch { pmtiles.agebs2010 = null; }
try { pmtiles.manzanas2010 = await FileAttachment("../data/manzanas_2010.pmtiles").url(); } catch { pmtiles.manzanas2010 = null; }
const datos = datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles});
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>La ciudad en el país</h1>
  <p class="hero-entrada">La Ciudad de México frente a las otras 31 entidades, y cuántas lenguas tienen hablantes en ella en cada censo.</p>
</div>

---

<h2 id="las-32-entidades" class="toc-anchor">La ciudad entre las 32 entidades</h2>

```js
// Mosaico de entidades (catálogo de gráficas): cada entidad un cuadro del
// mismo tamaño, para que la Ciudad de México y Tlaxcala pesen lo mismo que
// Chihuahua. Escala fija por población, medida sobre las 32 entidades.
const POB_MOS = [
  {clave: "hablantes", etiqueta: "Hablan una lengua indígena", tope: 35, universo: "de la población de 3 años y más", fuente: "conteo censal"},
  {clave: "autoads", etiqueta: "Se consideran indígenas", tope: 70, universo: "de la población de 3 años y más", fuente: "estimación del cuestionario ampliado"},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", tope: 45, universo: "de la población total", fuente: "conteo censal"},
  {clave: "inpi", etiqueta: "Población indígena según el INPI", tope: 45, universo: "de la población total", fuente: "INPI"},
];
const selPobMos = campo({id: "c2m-pob", nombre: "poblacion", etiqueta: "Población indígena", opciones: POB_MOS.map((p) => ({clave: p.clave, etiqueta: p.etiqueta})), valor: "hablantes"});
const panelMos = html`<div class="panel-filtros"><div class="panel-campos">${selPobMos}</div></div>`;
const cuerpoMos = document.createElement("div");
function pintarMos() {
  const p = POB_MOS.find((x) => x.clave === selPobMos.value);
  const filas = (p.clave === "inpi"
    ? inpi.filter((r) => r.nivel === "entidad").map((r) => ({cve: String(r.cve).padStart(2, "0"), nombre: r.nombre, valor: Number(r.pct), num: r.num, den: r.den, ee: null}))
    : nacional.filter((r) => r.nivel === "entidad" && r.poblacion === p.clave && r.sexo === "Total" && r.edad === "Todas" && r.den > 0)
      .map((r) => ({cve: String(r.cve).padStart(2, "0"), nombre: r.nombre, valor: 100 * r.num / r.den, num: r.num, den: r.den, ee: r.ee})))
    .sort((a, b) => b.valor - a.valor).map((r, i) => ({...r, lugar: i + 1}));
  const cdmx = filas.find((r) => r.cve === "09");
  cuerpoMos.replaceChildren(
    kpis([{etiqueta: `Lugar de la Ciudad de México`, cifra: cdmx ? `${cdmx.lugar} de 32` : "", nota: "de la entidad con mayor proporción a la menor"},
      {etiqueta: "Proporción en la ciudad", cifra: cdmx ? pct(cdmx.valor) : "", nota: p.universo},
      {etiqueta: "Entidad con mayor proporción", cifra: filas[0]?.nombre ?? "", nota: filas[0] ? pct(filas[0].valor) : ""}]),
    figura({titulo: `${p.etiqueta}: las 32 entidades, 2020`, subtitulo: `Porcentaje ${p.universo}; con borde rojo, la Ciudad de México`,
      pie: `INEGI, Censo 2020 (${p.fuente}) · el color es el porcentaje, con la misma escala para todas las entidades`},
      [coropleta(filas, geoEntidades, {ancho: Math.min(900, width), dominio: [0, p.tope], destacado: "09", renglones: [["Entidad", (r) => r.nombre], ["Porcentaje", (r) => `${pct(r.valor)}${r.ee ? ` (± ${(196 * r.ee).toFixed(1)})` : ""}`], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`], ["Lugar", (r) => `${r.lugar} de 32`]]})]),
    figura({titulo: `Las 32 entidades ordenadas, 2020`, subtitulo: "De la entidad con mayor proporción a la menor; en rojo, la Ciudad de México",
      pie: `INEGI, Censo 2020 (${p.fuente}) · cada punto es una entidad, con la misma escala que el mapa`},
      [lollipop(filas.map((r) => ({...r, nombre: r.nombre})), {ancho: Math.min(900, width), dominio: [0, p.tope], destacado: (r) => r.cve === "09", formato: (v) => pct(v), etiquetaX: "%", renglones: [["Entidad", (r) => r.nombre], ["Porcentaje", (r) => `${pct(r.valor)}${r.ee ? ` (± ${(196 * r.ee).toFixed(1)})` : ""}`], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`], ["Lugar", (r) => `${r.lugar} de 32`]]})]),
    fuenteDe({datos: ["D-ITER-2020-NAL", "D-CENSO-2020", "D-INPI-2020-HOG"], cotejos: ["hablantes3_nacional_2020", "pct_autoads_nacional_2020", "pct_pi_nacional_2020", "cdmx_hli3_2020_n", "cdmx_autoads_2020_n"]}),
    explicacion("El mapa pinta cada entidad según qué proporción de su población es indígena, con la forma de contarla que se elija. Como las entidades del centro son chicas en el mapa, debajo van las 32 ordenadas de mayor a menor con la misma escala, para que la Ciudad de México se compare con las demás sin buscarla. Cada forma de contar tiene su propia escala, fija para las 32 entidades."),
    tablaColumnas(filas, [{etiqueta: "Lugar", num: true, valor: (r) => r.lugar}, {etiqueta: "Entidad", valor: (r) => r.nombre}, {etiqueta: "%", num: true, valor: (r) => r.valor.toFixed(2)}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Población", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver las 32 entidades"}));
}
panelMos.addEventListener("input", pintarMos);
alCambiarModo(() => pintarMos());
pintarMos();
display(html`<section class="beta-seccion">${panelMos}${cuerpoMos}</section>`);
```

---

<h2 id="cuantas-lenguas" class="toc-anchor">Cuántas lenguas llegan a la ciudad</h2>

```js
// Lenguas con hablantes en la ciudad por edición (muestras censales por alcaldía).
const ciudad = lenguasAlc.filter((r) => r.nivel === "entidad" && String(r.lengua).padStart(4, "0") < "8000").map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), anio: Number(r.anio)}));
const aniosL = [...new Set(ciudad.map((r) => r.anio))].sort();
// Eje fijo: la lengua mayor de todas las ediciones, para que cambiar de año o
// de sexo mueva las barras y no la escala.
const MAX_LENGUA = Math.max(...ciudad.map((r) => r.num)) * 1.2;
const selAnio = campo({id: "c2-anio", nombre: "anio", etiqueta: "Año", opciones: aniosL.map((a) => ({clave: String(a), etiqueta: String(a)})), valor: "2025"});
const selSexo = campo({id: "c2-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres"}, {clave: "Mujeres", etiqueta: "Mujeres"}, {clave: "Hombres", etiqueta: "Hombres"}], valor: "Total"});
const panel1 = html`<div class="panel-filtros"><div class="panel-campos">${selAnio}${selSexo}</div></div>`;
const cuerpo1 = document.createElement("div");
function pintar1() {
  const anio = Number(selAnio.value), sexo = selSexo.value;
  const conSexo = ciudad.some((r) => r.anio === anio && r.sexo === "Mujeres");
  selSexo.hidden = !conSexo;
  const filas = ciudad.filter((r) => r.anio === anio && r.sexo === (conSexo ? sexo : "Total") && r.num > 0).sort((a, b) => b.num - a.num);
  const total = filas.reduce((s, r) => s + r.num, 0);
  const porAnio = aniosL.map((a) => ({anio: a, n: new Set(ciudad.filter((r) => r.anio === a && r.sexo === "Total" && r.num > 0).map((r) => r.lengua)).size}));
  const top = filas.slice(0, 15).map((r) => ({...r, share: 100 * r.num / total}));
  cuerpo1.replaceChildren(
    kpis([{etiqueta: `Lenguas con hablantes en ${anio}`, cifra: String(filas.length), nota: "agrupaciones lingüísticas del catálogo del INALI"}, {etiqueta: "Hablantes en la ciudad", cifra: entero(total), nota: filas[0]?.universo ?? ""}, {etiqueta: "La lengua mayor", cifra: filas[0]?.lengua_nombre ?? "", nota: filas[0] ? `${pct(top[0].share)} de los hablantes` : ""}]),
    figura({titulo: `Cómo se reparten los hablantes de la ciudad entre las lenguas, ${anio}`, subtitulo: `${sexo !== "Total" && conSexo ? `${sexo} · ` : ""}${filas.length} lenguas con hablantes; el área de cada rectángulo es su parte de los hablantes de la ciudad`, pie: `${filas[0]?.fuente ?? "INEGI"} · cada rectángulo es una lengua; el color, su familia (las tres mayores con color y las demás en gris)`},
      [treemap(filas.map((r) => ({...r, grupo: r.familia ? r.familia.charAt(0).toUpperCase() + r.familia.slice(1) : "Sin familia asignada", parte: r.lengua_nombre, valor: r.num})), {ancho: Math.min(980, width), alto: 440, etiquetaOtras: "Otras familias",
        renglones: [["Lengua", (d) => d.parte], ["Familia", (d) => d.grupo], ["Hablantes", (d) => `${entero(d.num)}${d.ee ? ` (± ${entero(196 * d.ee * d.den / 100)})` : ""}`], ["Parte de los hablantes de la ciudad", (d) => pct(d.pct)]]})]),
    figura({titulo: "Cuántas lenguas tienen hablantes en la ciudad, por edición", subtitulo: "Agrupaciones lingüísticas con al menos un hablante en la muestra de cada censo o encuesta", pie: "Censos, conteos e intercensales (INEGI), muestras por alcaldía · cada punto es una edición"},
      [Plot.plot({height: 220, width: Math.min(900, width), marginLeft: 50, x: {label: null, tickFormat: (d) => String(d)}, y: {label: "lenguas", grid: true, zero: true},
        marks: [Plot.line(porAnio, {x: "anio", y: "n", stroke: COLOR_UNICO, strokeWidth: 2}), Plot.dot(porAnio, {x: "anio", y: "n", fill: COLOR_UNICO, r: 4.5}),
          Plot.text(porAnio, {x: "anio", y: "n", text: "n", dy: -10, fontSize: 11}),
          Plot.tip(porAnio, Plot.pointerX({x: "anio", y: "n", maxRadius: Infinity, ...GLOBO, ...globo([["Año", (r) => r.anio], ["Lenguas con hablantes", (r) => r.n]])})), Plot.ruleY([0])]})]),
    fuenteDe({datos: ["D-CENSO-1990-MUESTRA", "D-CENSO-2000-AMP", "D-CONTEO-2005-MUESTRA", "D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"], cotejos: ["nahuatl_2015", "nahuatl_2020", "word_tabla2_celdas_iguales"], lectura: ["R-SECULT-LENGUAS", "R-SEPI-2024-DIV"]}),
    explicacion("Cada edición censal pregunta qué lengua indígena habla cada persona; aquí se cuentan las agrupaciones lingüísticas del catálogo del INALI con al menos un hablante en la muestra de la ciudad. Las muestras de 1990 y 2005 no llevan error de diseño; las demás sí, y el globo lo muestra. El número de lenguas depende del tamaño de la muestra de cada edición: una lengua con muy pocos hablantes puede no caer en la muestra un año y sí al siguiente."),
    tablaColumnas(filas.map((r) => ({...r, share: 100 * r.num / total})), [{etiqueta: "Lengua", valor: (r) => r.lengua_nombre}, {etiqueta: "Familia", valor: (r) => r.familia}, {etiqueta: "Hablantes", num: true, valor: (r) => entero(r.num)}, {etiqueta: "% de los hablantes", num: true, valor: (r) => r.share.toFixed(2)}, {etiqueta: "Casos en la muestra", num: true, valor: (r) => (r.casos ?? "")}], {titulo: "Ver todas las lenguas"}));
}
panel1.addEventListener("input", pintar1);
pintar1();
display(html`<section class="beta-seccion">${panel1}${cuerpo1}</section>`);
```

---

<h2 id="frente-a-las-entidades" class="toc-anchor">La ciudad frente a las entidades</h2>

```js
display(seccionCenso(datos, {id: "c2ent", inicial: {nivel: "entidad", seleccion: "09"},
  fuentes: () => fuenteDe({datos: ["D-ITER-2020-NAL", "D-CENSO-2020", "D-INPI-2020-HOG", "D-INPI-2020-AUTO"],
    cotejos: ["hablantes3_nacional_2020", "pct_autoads_nacional_2020", "pct_pi_nacional_2020", "autoads_mun_mediana_dif_2020", "cdmx_hli3_2020_n", "cdmx_autoads_2020_n"],
    lectura: ["R-CENSO-2020-TAB-ETN"]})}));
```
