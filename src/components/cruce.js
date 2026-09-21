// src/components/cruce.js
// Cruce territorial: conectividad y condiciones según la presencia indígena de
// la manzana o de la AGEB. Lo comparten las dos páginas de mapa.
//
// Es un cruce ENTRE TERRITORIOS, no entre hogares. El tabulado del Censo dice
// cuántas viviendas de una manzana tienen internet y cuánta de su población
// vive en hogares indígenas, pero no qué vivienda es de quién. Lo que se puede
// afirmar es cómo son las manzanas donde hay más presencia indígena, no cómo
// son los hogares indígenas. Cada figura lo dice en su explicación.

import * as Inputs from "npm:@observablehq/inputs";
import {html} from "npm:htl";
import {anchoActual, alCambiarAncho, alCambiarModo, punto, formatear} from "./base.js";
import {figura, seccion, puntosPorBanda, tablaColumnas, explicacion} from "./graficas.js";
import {conDescarga} from "./descargar.js";

// Las mismas bandas que scripts/construir_manzanas.py: proporción de la
// población del territorio que vive en hogares censales indígenas.
export const BANDAS = [
  {orden: 0, etiqueta: "Sin población en hogares indígenas", dentro: (t) => t === 0},
  {orden: 1, etiqueta: "Más de 0 y hasta 5 %", dentro: (t) => t > 0 && t <= 5},
  {orden: 2, etiqueta: "Más de 5 y hasta 10 %", dentro: (t) => t > 5 && t <= 10},
  {orden: 3, etiqueta: "Más de 10 y hasta 20 %", dentro: (t) => t > 10 && t <= 20},
  {orden: 4, etiqueta: "Más de 20 y hasta 40 %", dentro: (t) => t > 20 && t <= 40},
  {orden: 5, etiqueta: "Más de 40 %", dentro: (t) => t > 40},
];

// Indicadores del cruce. `den` es la columna del denominador en la tabla por
// AGEB; `formato: "anios"` marca el único que no es porcentaje.
export const INDICADORES_CRUCE = [
  {clave: "VPH_INTER", den: "VIVPARH_CV", etiqueta: "Viviendas con internet", unidad: "Viviendas"},
  {clave: "VPH_PC", den: "VIVPARH_CV", etiqueta: "Viviendas con computadora, laptop o tableta", unidad: "Viviendas"},
  {clave: "VPH_CEL", den: "VIVPARH_CV", etiqueta: "Viviendas con teléfono celular", unidad: "Viviendas"},
  {clave: "VPH_RADIO", den: "VIVPARH_CV", etiqueta: "Viviendas con radio", unidad: "Viviendas"},
  {clave: "VPH_STVP", den: "VIVPARH_CV", etiqueta: "Viviendas con televisión de paga", unidad: "Viviendas"},
  {clave: "VPH_SPMVPI", den: "VIVPARH_CV", etiqueta: "Viviendas con streaming de paga", unidad: "Viviendas"},
  {clave: "VPH_SINTIC", den: "VIVPARH_CV", etiqueta: "Viviendas sin ninguna tecnología de la información", unidad: "Viviendas"},
  {clave: "PSINDER", den: "POBTOT", etiqueta: "Población sin afiliación a servicios de salud", unidad: "Personas"},
  {clave: "GRAPROES", den: "P_15YMAS", etiqueta: "Grado promedio de escolaridad (15 años o más)", unidad: "Personas de 15 o más", formato: "anios"},
];

const valorDe = (ind, num, den) => (den > 0 ? (ind.formato === "anios" ? num / den : (100 * num) / den) : null);
const formatoDe = (ind) => (ind.formato === "anios" ? (v) => `${v.toFixed(1)} años` : (v) => formatear(v, "pct"));

// Filas del cruce a partir de la tabla precalculada por manzana
// (src/data/cruce_manzanas.csv): ahí num y den ya vienen sumados por banda.
export function filasDesdeTabla(tabla, ind) {
  return tabla.filter((d) => d.indicador === ind.clave).map((d) => ({
    orden: d.orden, banda: d.banda, num: d.num, den: d.den,
    unidades: d.unidades, poblacion: d.poblacion, valor: valorDe(ind, d.num, d.den),
  }));
}

// Filas del cruce calculadas en el navegador desde la tabla por AGEB. Entran
// las AGEB con la cifra de hogares indígenas publicada y, en cada indicador,
// las que publican su numerador y su denominador. Se suma y luego se divide.
export function filasDesdeAgebs(agebs, ind) {
  return BANDAS.map((b) => {
    const dentro = agebs.filter((a) => Number.isFinite(a.tasa_phog_ind) && b.dentro(a.tasa_phog_ind)
      && Number.isFinite(a[ind.clave]) && Number.isFinite(a[ind.den]));
    // El promedio de escolaridad se pondera por su universo.
    const num = dentro.reduce((s, a) => s + (ind.formato === "anios" ? a[ind.clave] * a[ind.den] : a[ind.clave]), 0);
    const den = dentro.reduce((s, a) => s + a[ind.den], 0);
    return {orden: b.orden, banda: b.etiqueta, num, den, unidades: dentro.length,
            poblacion: dentro.reduce((s, a) => s + (a.POBTOT ?? 0), 0), valor: valorDe(ind, num, den)};
  }).filter((f) => f.unidades > 0);
}

// Referencia de toda la ciudad: la suma de todas las bandas.
function referenciaDe(filas, ind) {
  const num = filas.reduce((s, f) => s + f.num, 0), den = filas.reduce((s, f) => s + f.den, 0);
  return valorDe(ind, num, den);
}

// Sección completa con su propio panel (un selector de indicador), figura,
// explicación, fuentes y tabla, en el orden de todas las secciones del sitio.
// Banda con menos unidades que esto: su cifra se marca como frágil.
const MIN_UNIDADES = 30;

export function seccionCruce({numero, titulo, filasDe, etiquetaUnidades, unidadTexto, fuenteTexto, fuentesBloque = null}) {
  // "AGEB" es una sigla y no se pasa a minúsculas; "Manzanas" sí.
  const unidades = etiquetaUnidades === etiquetaUnidades.toUpperCase() ? etiquetaUnidades : etiquetaUnidades.toLowerCase();
  const selector = Inputs.select(INDICADORES_CRUCE, {label: "Indicador", format: (d) => d.etiqueta, value: INDICADORES_CRUCE[0]});
  selector.dataset.campo = "indicador";
  const panel = html`<div class="panel-filtros"><div class="panel-campos">${selector}</div></div>`;
  const cuerpo = html`<div class="seccion-cuerpo"></div>`;
  const aviso = html`<div class="aviso-lector" role="status" aria-live="polite"></div>`;
  let ancho = anchoActual();

  function pintar({anunciar = true, entrada = true} = {}) {
    cuerpo.classList.toggle("sin-entrada", !entrada);
    const ind = selector.value;
    const filas = filasDe(ind).map((f) => ({...f, fragil: f.unidades < MIN_UNIDADES}));
    const fmt = formatoDe(ind);
    const fragiles = filas.filter((f) => f.fragil);
    const nodos = !filas.length
      ? [html`<p class="aviso-vacio">Sin datos para este indicador.</p>`]
      : [
        conDescarga(figura({
          titulo: `${ind.etiqueta}, según la presencia indígena de la ${unidadTexto}`,
          subtitulo: `Ciudad de México, 2020. Cada fila agrupa las ${unidades} por la proporción de su población que vive en hogares censales indígenas.`,
          pie: `${fuenteTexto}: cada punto es el valor del conjunto de ${unidades} de la banda y la línea punteada, el de toda la ciudad.`,
        }, [puntosPorBanda(filas, {
          formatoValor: fmt, etiquetaX: ind.formato === "anios" ? "años de escolaridad" : "%",
          referencia: referenciaDe(filas, ind), etiquetaNum: ind.unidad, etiquetaUnidades, width: ancho,
        }), fragiles.length ? html`<p class="aviso-muestra" role="note"><strong>Pocas ${unidades}.</strong>
          ${fragiles.length === 1 ? "Una banda reúne" : `${fragiles.length} bandas reúnen`} menos de ${MIN_UNIDADES} ${unidades}
          (la menor, ${punto(Math.min(...fragiles.map((f) => f.unidades)))}) y lleva asterisco: con tan pocas unidades su
          cifra se mueve mucho y sirve solo de orden de magnitud.</p>` : null])),
        explicacion([
          `Las ${unidades} se agrupan en bandas según la proporción de su población que vive
           en hogares censales indígenas. Dentro de cada banda se suman numerador y denominador del indicador
           y luego se divide; nunca se promedian porcentajes.`,
          `Es un cruce entre territorios y no entre hogares: el tabulado no dice qué vivienda tiene el servicio
           ni quién vive en ella. La figura describe cómo son las ${unidades} con más o menos
           presencia indígena, no cómo son los hogares indígenas. Entran solo las ${unidades}
           con la cifra publicada; las suprimidas por confidencialidad quedan fuera.`,
        ]),
        fuentesBloque ?? document.createDocumentFragment(),
        tablaColumnas(filas, [
          {etiqueta: "Presencia indígena", valor: (f) => f.banda},
          {etiqueta: ind.etiqueta, num: true, valor: (f) => fmt(f.valor) + (f.fragil ? " *" : "")},
          {etiqueta: ind.formato === "anios" ? "Personas de 15 o más" : `${ind.unidad} que cumplen`, num: true,
           valor: (f) => (ind.formato === "anios" ? punto(f.den) : punto(f.num))},
          ...(ind.formato === "anios" ? [] : [{etiqueta: `${ind.unidad} en total`, num: true, valor: (f) => punto(f.den)}]),
          {etiqueta: etiquetaUnidades, num: true, valor: (f) => punto(f.unidades)},
          {etiqueta: "Población", num: true, valor: (f) => punto(f.poblacion)},
        ]),
      ];
    cuerpo.replaceChildren(...nodos.filter(Boolean));
    if (anunciar) aviso.textContent = "Gráfica actualizada con el indicador seleccionado.";
  }
  selector.addEventListener("input", () => pintar());
  alCambiarModo(() => pintar({anunciar: false}));
  alCambiarAncho((n) => { ancho = n; pintar({anunciar: false, entrada: false}); });
  pintar({anunciar: false});

  return html`<section class="seccion-tablero">
    ${seccion({numero, titulo})}
    ${panel}
    ${aviso}
    ${cuerpo}
  </section>`;
}

// Selector con <optgroup>, que Inputs.select no genera. Devuelve un <form>
// con `.value` y evento `input`, para usarse con view() igual que un Input.
export function selectorAgrupado(opciones, {etiqueta, id, inicial = opciones[0]}) {
  const select = document.createElement("select");
  select.id = id;
  const grupos = new Map();
  for (const o of opciones) {
    // Una opción sin grupo va suelta, antes de los grupos ("Sin cruce").
    if (!o.grupo) {
      const op = document.createElement("option");
      op.textContent = o.corto;
      op.value = o.clave;
      select.append(op);
      continue;
    }
    if (!grupos.has(o.grupo)) {
      const g = document.createElement("optgroup");
      g.label = o.grupo;
      grupos.set(o.grupo, g);
      select.append(g);
    }
    const op = document.createElement("option");
    op.textContent = o.corto;
    op.value = o.clave;
    grupos.get(o.grupo).append(op);
  }
  select.value = inicial.clave;
  // Mismas clases que los campos hechos a mano del panel: etiqueta arriba,
  // selector debajo, con el estilo del resto de los filtros.
  const form = document.createElement("form");
  form.className = "filtro";
  const rotulo = document.createElement("label");
  rotulo.className = "filtro-etiqueta";
  rotulo.textContent = etiqueta;
  rotulo.htmlFor = id;
  form.append(rotulo, select);
  form.value = inicial;
  select.onchange = () => {
    form.value = opciones.find((o) => o.clave === select.value);
    form.dispatchEvent(new CustomEvent("input", {bubbles: true}));
  };
  return form;
}

// --- Panel de los mapas: qué se pinta y dónde --------------------------------
// El mapa trata de población indígena, así que ese indicador va primero y solo.
// Las demás características (internet, migración, marginación) no son otro
// indicador de la misma lista: son un CRUCE. Al elegir una, el mapa la pinta
// solo donde la presencia indígena alcanza el mínimo elegido, que es lo más
// cerca que el tabulado permite estar de "población indígena con internet".
// Sigue siendo un cruce entre territorios: el tabulado no dice qué vivienda es
// de quién, y la explicación de cada mapa lo repite.
export const PRESENCIA_MINIMA = [
  {valor: 0, etiqueta: "Toda la ciudad, sin mínimo"},
  {valor: 5, etiqueta: "Donde es 5 % o más"},
  {valor: 10, etiqueta: "Donde es 10 % o más"},
  {valor: 20, etiqueta: "Donde es 20 % o más"},
  {valor: 40, etiqueta: "Donde es 40 % o más (criterio del INPI para localidades)"},
];
const SIN_CRUCE = {clave: "__sin_cruce", grupo: null, corto: "Sin cruce: solo población indígena"};

// Devuelve el panel como un solo elemento con `.value = {indigena, cruce, umbral}`
// (`cruce` es null sin cruce) y evento `input`, para usarse con Generators.input.
// `extrasQue` y `extrasDonde` son formularios propios de la página (sexo, ámbito).
export function panelCruceMapa({indigenas, cruces, id, extrasQue = [], extrasDonde = []}) {
  const selIndigena = selectorAgrupado(indigenas, {etiqueta: "Población indígena", id: `${id}-indigena`});
  const selCruce = selectorAgrupado([SIN_CRUCE, ...cruces], {etiqueta: "Cruzar con", id: `${id}-cruce`, inicial: SIN_CRUCE});
  const selUmbral = Inputs.select(PRESENCIA_MINIMA, {label: "Presencia indígena mínima", format: (d) => d.etiqueta, value: PRESENCIA_MINIMA[0]});
  selIndigena.dataset.campo = "indigena";
  selCruce.dataset.campo = "cruce";
  selUmbral.dataset.campo = "umbral";

  const nodo = html`<div class="panel-filtros">
    <fieldset class="panel-grupo">
      <legend class="panel-grupo-titulo">Qué se pinta</legend>
      <div class="panel-campos">${selIndigena}${selCruce}${extrasQue}</div>
    </fieldset>
    <fieldset class="panel-grupo">
      <legend class="panel-grupo-titulo">Dónde</legend>
      <div class="panel-campos">${selUmbral}${extrasDonde}</div>
    </fieldset>
  </div>`;

  const leer = () => ({
    indigena: selIndigena.value,
    cruce: selCruce.value === SIN_CRUCE ? null : selCruce.value,
    umbral: selUmbral.value,
  });
  nodo.value = leer();
  const avisar = () => {
    nodo.value = leer();
    nodo.dispatchEvent(new CustomEvent("input", {bubbles: false}));
  };
  selIndigena.addEventListener("input", (e) => { e.stopPropagation(); avisar(); });
  // El mínimo se propone UNA sola vez, con el primer cruce, y solo si el lector
  // no ha tocado ese selector. Después manda su elección: si lo dejó en "sin
  // mínimo", cambiar de cruce no se lo vuelve a poner en 10 %.
  let minimoDelLector = false, yaPropuesto = false;
  selUmbral.addEventListener("input", (e) => { e.stopPropagation(); minimoDelLector = true; avisar(); });
  selCruce.addEventListener("input", (e) => {
    e.stopPropagation();
    if (selCruce.value !== SIN_CRUCE && !minimoDelLector && !yaPropuesto && selUmbral.value.valor === 0) {
      selUmbral.value = PRESENCIA_MINIMA[2];
      yaPropuesto = true;
    }
    avisar();
  });
  return nodo;
}

