// Sección de perfil del libro: compara a la población indígena con el resto
// en una dimensión (escolaridad, trabajo, salud...) con barras agrupadas por
// categoría. El panel ofrece tema, año, población (criterio), sexo y grupo de
// edad; año, sexo y edad admiten "por separado" y se reparten en facetas
// (hasta dos a la vez). Datos: src/data/perfil_ciudad.csv.
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "./panel-seccion.js";
import {figura, explicacion, tablaColumnas} from "./graficas.js";
import {punto, COLOR_SERIE, alCambiarModo, GLOBO, globo} from "./base.js";

const entero = (n) => punto(Math.round(Number(n)));
const CONJUNTO = "En conjunto", UNA = "Una a una";
export const CRITERIOS = [{clave: "lengua", etiqueta: "Hablan una lengua indígena"}, {clave: "autoads", etiqueta: "Se consideran indígenas"}];
const SERIE = {"Indígena": "Población indígena", "Resto": "Resto de la población"};
const EDAD_ETIQ = {"3-14": "3 a 14 años", "15-29": "15 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};

/**
 * temas: [{clave, etiqueta, dimension, categorias (orden), edades (grupos válidos),
 *          anios (opcional), titulo(v), pie, explica}]
 */
export function seccionPerfil(tabla, {id, temas, inicial = {}, fuentes = null}) {
  const filas = tabla.map((r) => ({...r, anio: Number(r.anio)}));
  const cTema = campo({id: `${id}-tema`, nombre: "tema", etiqueta: "Tema", opciones: temas.map((t) => ({clave: t.clave, etiqueta: t.etiqueta})), valor: inicial.tema ?? temas[0].clave});
  const cCrit = campo({id: `${id}-criterio`, nombre: "criterio", etiqueta: "Población indígena", opciones: CRITERIOS, valor: inicial.criterio ?? "lengua"});
  const cAnio = campo({id: `${id}-anio`, nombre: "anio", etiqueta: "Año", opciones: [], valor: ""});
  const cSexo = campo({id: `${id}-sexo`, nombre: "sexo", etiqueta: "Sexo", opciones: [{clave: "Total", etiqueta: "Mujeres y hombres", grupo: CONJUNTO}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: CONJUNTO}, {clave: "Mujeres", etiqueta: "Mujeres", grupo: UNA}, {clave: "Hombres", etiqueta: "Hombres", grupo: UNA}], valor: "Total"});
  const cEdad = campo({id: `${id}-edad`, nombre: "edad", etiqueta: "Grupo de edad", opciones: [], valor: "Todas"});
  const panel = html`<div class="panel-filtros"><div class="panel-campos">${temas.length > 1 ? cTema : ""}${cCrit}${cAnio}${cSexo}${cEdad}</div></div>`;
  const cuerpo = document.createElement("div");
  // Eje FIJO por tema: el máximo de todas las ediciones, criterios, sexos y
  // edades. Con el máximo de la vista, cambiar de año o de criterio movía el
  // fondo y la misma barra parecía crecer o encogerse.
  const MAX_TEMA = new Map(temas.map((t) => [t.clave, Math.min(100, Math.max(5, ...filas
    .filter((r) => r.dimension === t.dimension && (r.grupo === "Indígena" || r.grupo === "Resto") && t.categorias.includes(r.categoria) && r.den > 0)
    .map((r) => 100 * r.num / r.den)) * 1.15)]));
  let ancho = 0;
  new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0 && Math.abs(w - ancho) > 8) { ancho = w; pintar(); } }).observe(cuerpo);

  function configurar() {
    const tema = temas.find((t) => t.clave === cTema.value);
    const anios = tema.anios ?? [...new Set(filas.filter((r) => r.dimension === tema.dimension).map((r) => r.anio))].sort();
    const prev = cAnio.value;
    cAnio.rellenar([...(anios.length > 1 ? [{clave: SEPARADO, etiqueta: "Todas las ediciones (comparar)", grupo: CONJUNTO}] : []), ...anios.map((a) => ({clave: String(a), etiqueta: String(a), grupo: "Una edición"}))], prev && prev !== "" ? prev : String(inicial.anio ?? anios.at(-1)));
    cEdad.rellenar([{clave: "Todas", etiqueta: "Todas las edades", grupo: CONJUNTO}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: CONJUNTO}, ...tema.edades.map((e) => ({clave: e, etiqueta: EDAD_ETIQ[e], grupo: UNA}))], cEdad.value);
    return {tema, anios};
  }

  function pintar() {
    const {tema, anios} = configurar();
    const crit = cCrit.value;
    const sep = [];
    if (cAnio.value === SEPARADO) sep.push({campo: "anio", cats: anios, etiqueta: String, rotulo: "edición"});
    if (cSexo.value === SEPARADO) sep.push({campo: "sexo", cats: ["Mujeres", "Hombres"], etiqueta: (x) => x, rotulo: "sexo"});
    if (cEdad.value === SEPARADO) sep.push({campo: "edad", cats: tema.edades, etiqueta: (x) => EDAD_ETIQ[x], rotulo: "grupo de edad"});
    const aviso = sep.length > 2 ? "Con tres cortes por separado se muestran los dos primeros; el grupo de edad vuelve al total." : "";
    if (sep.length > 2) sep.pop();
    const fijo = {anio: cAnio.value === SEPARADO ? null : Number(cAnio.value), sexo: cSexo.value === SEPARADO ? null : cSexo.value, edad: cEdad.value === SEPARADO ? null : cEdad.value};
    if (aviso) fijo.edad = "Todas";
    const sel = filas.filter((r) => r.criterio === crit && r.dimension === tema.dimension && (r.grupo === "Indígena" || r.grupo === "Resto")
      && (fijo.anio == null || r.anio === fijo.anio) && (fijo.sexo == null ? r.sexo !== "Total" : r.sexo === fijo.sexo) && (fijo.edad == null ? r.edad !== "Todas" : r.edad === fijo.edad)
      && (fijo.anio != null || anios.includes(r.anio)))
      .map((r) => ({...r, serie: SERIE[r.grupo], pct: 100 * r.num / r.den, f0: sep[0] ? sep[0].etiqueta(r[sep[0].campo]) : "", f1: sep[1] ? sep[1].etiqueta(r[sep[1].campo]) : ""}))
      .filter((r) => tema.categorias.includes(r.categoria));
    const facetas = {};
    if (sep[0]) facetas.fx = {label: null, domain: sep[0].cats.map(sep[0].etiqueta)};
    if (sep[1]) facetas.fy = {label: null, domain: sep[1].cats.map(sep[1].etiqueta)};
    const canal = {...(sep[0] ? {fx: "f0"} : {}), ...(sep[1] ? {fy: "f1"} : {})};
    const nCat = tema.categorias.length;
    const alto = (60 + 44 * nCat) * (sep[1] ? sep[1].cats.length : 1);
    const maxX = MAX_TEMA.get(tema.clave);
    const series = Object.values(SERIE);
    const renglones = [["Grupo", (r) => r.serie], ["Categoría", (r) => r.categoria], ["Corte", (r) => [r.f0, r.f1].filter(Boolean).join(" · ") || null], ["Porcentaje", (r) => `${r.pct.toFixed(1)} %${r.ee ? ` (± ${(196 * r.ee).toFixed(1)})` : ""}`], ["Personas", (r) => `${entero(r.num)} de ${entero(r.den)}`]];
    const subt = [fijo.anio ?? "", fijo.sexo && fijo.sexo !== "Total" ? fijo.sexo : "", fijo.edad && fijo.edad !== "Todas" ? EDAD_ETIQ[fijo.edad] : "", sep.length ? `un panel por ${sep.map((s) => s.rotulo).join(" y ")}` : ""].filter(Boolean).join(" · ");
    const plot = sel.length ? Plot.plot({marginLeft: 190, marginRight: 60, height: alto, width: Math.max(360, ancho || 900), ...facetas,
      color: {domain: series, range: series.map((s) => COLOR_SERIE[s]), legend: true},
      x: {label: tema.eje ?? "% del grupo", grid: true, domain: [0, maxX]}, y: {label: null, domain: tema.categorias}, fy: facetas.fy,
      // Una marca por serie con desplazamiento constante: `dy` de Plot no
      // acepta funciones y las dos barras de una categoría se encimaban.
      marks: [
        ...series.flatMap((serie, k) => {
          const d = sel.filter((r) => r.serie === serie), dy = k === 0 ? -8 : 8;
          return [
            Plot.barX(d, {x: "pct", y: "categoria", fill: "serie", ...canal, dy, insetTop: 13, insetBottom: 13}),
            Plot.ruleX(d.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => Math.min(maxX, r.pct + 196 * r.ee), y: "categoria", dy, stroke: "currentColor", strokeOpacity: 0.55, ...canal}),
            Plot.text(d, {x: "pct", y: "categoria", text: (r) => `${r.pct.toFixed(1)} %`, dx: 6, dy, textAnchor: "start", fontSize: 11, ...canal}),
          ];
        }),
        Plot.tip(sel, Plot.pointer({x: "pct", y: "categoria", ...canal, maxRadius: Infinity, ...GLOBO, ...globo(renglones)})),
        Plot.ruleX([0]),
      ]}) : html`<p class="beta-nota">Sin datos para esta combinación.</p>`;
    cuerpo.replaceChildren(
      figura({titulo: tema.titulo({crit: CRITERIOS.find((c) => c.clave === crit).etiqueta.toLowerCase()}), subtitulo: subt, pie: tema.pie}, [plot]),
      aviso ? html`<p class="beta-nota">${aviso}</p>` : "",
      fuentes ? fuentes(tema) : "",
      explicacion(tema.explica),
      tablaColumnas(sel, [{etiqueta: "Grupo", valor: (r) => r.serie}, {etiqueta: "Categoría", valor: (r) => r.categoria}, {etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Sexo", valor: (r) => r.sexo}, {etiqueta: "Edad", valor: (r) => EDAD_ETIQ[r.edad] ?? "Todas"},
        {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Del grupo", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
  }
  for (const c of [cTema, cCrit, cAnio, cSexo, cEdad]) c.select.addEventListener("change", pintar);
  alCambiarModo(() => pintar());
  pintar();
  return html`<section class="beta-seccion">${panel}${cuerpo}</section>`;
}
