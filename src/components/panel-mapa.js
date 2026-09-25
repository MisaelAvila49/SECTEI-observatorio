// src/components/panel-mapa.js
// Panel del mapa unificado: qué se pinta (población, lengua, cruce) y dónde
// y cuándo (unidad, año, sexo, ámbito, presencia mínima).
//
// Las reglas de qué control se muestra salen de lo que cada fuente publica,
// no de un gusto de diseño: la lengua y la autoadscripción solo existen en
// las muestras (por alcaldía); por AGEB y manzana solo hay hablantes y
// hogares indígenas, y solo para 2020; el sexo no existe para los hogares.
// Un control que no aplica se oculta en vez de ofrecer opciones vacías
// (lección 64), y la regla lee el VALOR del panel, no el DOM.
import {html} from "npm:htl";

export const POBLACIONES = [
  {clave: "hablantes", etiqueta: "Hablan una lengua indígena", corto: "Hablantes de lengua indígena",
   definicion: "Personas de 3 años y más que declararon hablar alguna lengua indígena, sobre la población de 3 años y más.",
   tesela: {manzana: "tasa_p3ym_hli", ageb: "tasa_p3ym_hli"}, num: "P3YM_HLI", den: {manzana: "P_3YMAS", ageb: "P_3YMAS"}, porSexo: true},
  {clave: "hogares", etiqueta: "Viven en hogares indígenas", corto: "Población en hogares indígenas",
   definicion: "Personas que viven en un hogar donde la jefa o el jefe, su cónyuge o alguno de sus ascendientes habla lengua indígena, sobre la población total. Cuenta también a quienes ya no hablan la lengua.",
   tesela: {manzana: "tasa_phog_ind", ageb: "tasa_phog_ind"}, num: "PHOG_IND", den: {manzana: "POBTOT", ageb: "POBTOT"}, porSexo: false},
  {clave: "autoads", etiqueta: "Se consideran indígenas", corto: "Se consideran indígenas",
   definicion: "Personas que, de acuerdo con su cultura, se consideran indígenas, hablen o no una lengua, sobre la población total. Solo lo preguntan las muestras: por alcaldía, no por manzana.",
   soloAlcaldia: true, porSexo: true},
  {clave: "todas", etiqueta: "Todas las poblaciones indígenas", corto: "Hablan una lengua indígena o se consideran indígenas",
   definicion: "Personas que hablan una lengua indígena o se consideran indígenas, sobre la población total. Cada persona cuenta una sola vez aunque cumpla las dos.",
   soloAlcaldia: true, porSexo: true},
  {clave: "ambas", etiqueta: "Hablan una lengua y se consideran indígenas", corto: "Hablan una lengua indígena y además se consideran indígenas",
   definicion: "Personas que cumplen las dos condiciones: hablan una lengua indígena y se consideran indígenas, sobre la población total. Solo lo preguntan las muestras: por alcaldía.",
   soloAlcaldia: true, porSexo: true},
];

export const UNIDADES = [
  {clave: "alcaldia", etiqueta: "Alcaldía", singular: "alcaldía", plural: "alcaldías"},
  {clave: "ageb", etiqueta: "AGEB", singular: "AGEB", plural: "AGEB"},
  {clave: "manzana", etiqueta: "Manzana", singular: "manzana", plural: "manzanas"},
];

export const SEXOS = [
  {clave: "Total", etiqueta: "Ambos sexos", sufijo: ""},
  {clave: "Mujeres", etiqueta: "Mujeres", sufijo: "_f"},
  {clave: "Hombres", etiqueta: "Hombres", sufijo: "_m"},
];

// Cruces territoriales. `tesela` es el campo de la tasa en cada unidad; los
// dos grados son categorías (cinco), no porcentajes, y solo existen por AGEB.
export const CRUCES = [
  {clave: "inter", grupo: "Conectividad de las viviendas", etiqueta: "Viviendas con internet", tesela: {manzana: "tasa_vph_inter", ageb: "tasa_vph_inter"}, unidad: "viviendas",
   definicion: "Viviendas particulares habitadas que disponen de internet, sobre las viviendas con características captadas."},
  {clave: "pc", grupo: "Conectividad de las viviendas", etiqueta: "Viviendas con computadora", tesela: {manzana: "tasa_vph_pc", ageb: "tasa_vph_pc"}, unidad: "viviendas",
   definicion: "Viviendas con computadora, laptop o tableta, sobre las viviendas con características captadas."},
  {clave: "cel", grupo: "Conectividad de las viviendas", etiqueta: "Viviendas con celular", tesela: {manzana: "tasa_vph_cel", ageb: "tasa_vph_cel"}, unidad: "viviendas",
   definicion: "Viviendas donde alguien dispone de teléfono celular, sobre las viviendas con características captadas."},
  {clave: "radio", grupo: "Conectividad de las viviendas", etiqueta: "Viviendas con radio", tesela: {manzana: "tasa_vph_radio", ageb: "tasa_vph_radio"}, unidad: "viviendas",
   definicion: "Viviendas que disponen de radio, sobre las viviendas con características captadas."},
  {clave: "sintic", grupo: "Conectividad de las viviendas", etiqueta: "Viviendas sin ninguna tecnología", tesela: {manzana: "tasa_vph_sintic", ageb: "tasa_vph_sintic"}, unidad: "viviendas",
   definicion: "Viviendas sin radio, televisor, computadora, teléfono, celular ni internet, sobre las viviendas con características captadas."},
  {clave: "nacoe", grupo: "Migración", etiqueta: "Nacidas en otra entidad", tesela: {manzana: "tasa_pnacoe"}, unidad: "personas",
   definicion: "Personas nacidas en otra entidad del país, sobre la población total."},
  {clave: "resoe", grupo: "Migración", etiqueta: "Vivían en otra entidad en 2015", tesela: {manzana: "tasa_presoe15"}, unidad: "personas",
   definicion: "Personas de 5 años y más que en marzo de 2015 residían en otra entidad, sobre la población de 5 años y más."},
  {clave: "salud", grupo: "Condiciones de la población", etiqueta: "Sin afiliación a servicios de salud", tesela: {manzana: "tasa_psinder", ageb: "tasa_psinder"}, unidad: "personas",
   definicion: "Personas sin afiliación a ninguna institución de salud, sobre la población total."},
  {clave: "gm", grupo: "Marginación y rezago social", etiqueta: "Grado de marginación (CONAPO)", tesela: {ageb: "gm_orden"}, categorias: true, texto: "gm_conapo",
   definicion: "Grado de marginación urbana 2020 de CONAPO: cinco categorías a partir de carencias de educación, salud, vivienda y bienes. No mide ingreso."},
  {clave: "grs", grupo: "Marginación y rezago social", etiqueta: "Grado de rezago social (CONEVAL)", tesela: {ageb: "grs_orden"}, categorias: true, texto: "grs_coneval",
   definicion: "Grado de rezago social 2020 de CONEVAL: cinco categorías con indicadores de educación, salud, servicios y activos del hogar. No es una medición de pobreza."},
];

export const PRESENCIA_MINIMA = [
  {valor: 0, etiqueta: "Toda la ciudad, sin mínimo"},
  {valor: 5, etiqueta: "Donde es 5 % o más"},
  {valor: 10, etiqueta: "Donde es 10 % o más"},
  {valor: 20, etiqueta: "Donde es 20 % o más"},
  {valor: 40, etiqueta: "Donde es 40 % o más (criterio del INPI para localidades)"},
];

// Un campo del panel: etiqueta arriba y <select> debajo, con la misma
// estructura (.filtro > label + select) que el resto de los tableros. Admite
// <optgroup> cuando las opciones traen `grupo`.
function campo({id, etiqueta, opciones, valor, nombre}) {
  const select = document.createElement("select");
  select.id = id;
  const form = document.createElement("form");
  form.className = "filtro";
  form.dataset.campo = nombre;
  const rotulo = document.createElement("label");
  rotulo.className = "filtro-etiqueta";
  rotulo.textContent = etiqueta;
  rotulo.htmlFor = id;
  form.append(rotulo, select);
  form.rellenar = (ops, v) => {
    select.replaceChildren();
    let padre = select;
    for (const o of ops) {
      if (o.grupo) {
        if (padre === select || padre.label !== o.grupo) {
          padre = document.createElement("optgroup");
          padre.label = o.grupo;
          select.append(padre);
        }
      } else {
        padre = select;
      }
      const op = document.createElement("option");
      op.value = o.clave;
      op.textContent = o.etiqueta;
      padre.append(op);
    }
    if (ops.some((o) => o.clave === v)) select.value = v;
    else if (ops.length) select.value = ops[0].clave;
  };
  form.rellenar(opciones, valor);
  Object.defineProperty(form, "value", {get: () => select.value, set: (v) => { select.value = v; }});
  form.select = select;
  return form;
}

/**
 * Construye el panel. `lenguas` son las opciones de lengua ({clave, etiqueta})
 * ordenadas por hablantes; `aniosDe(estado)` devuelve los años disponibles
 * para la combinación unidad + población + lengua. El nodo devuelto tiene
 * `.value` y emite `input` en cada cambio ya reconciliado.
 */
export function panelMapa({lenguas, aniosDe}) {
  const c = {
    poblacion: campo({id: "mapa-poblacion", nombre: "poblacion", etiqueta: "Población", opciones: POBLACIONES, valor: "hablantes"}),
    lengua: campo({id: "mapa-lengua", nombre: "lengua", etiqueta: "Lengua", opciones: [{clave: "todas", etiqueta: "Todas las lenguas"}, ...lenguas], valor: "todas"}),
    cruce: campo({id: "mapa-cruce", nombre: "cruce", etiqueta: "Cruzar con", opciones: [{clave: "sin", etiqueta: "Sin cruce"}], valor: "sin"}),
    unidad: campo({id: "mapa-unidad", nombre: "unidad", etiqueta: "Unidad del mapa", opciones: UNIDADES, valor: "ageb"}),
    anio: campo({id: "mapa-anio", nombre: "anio", etiqueta: "Año", opciones: [{clave: "2020", etiqueta: "2020"}], valor: "2020"}),
    sexo: campo({id: "mapa-sexo", nombre: "sexo", etiqueta: "Sexo", opciones: SEXOS, valor: "Total"}),
    ambito: campo({id: "mapa-ambito", nombre: "ambito", etiqueta: "Ámbito", opciones: [{clave: "ciudad", etiqueta: "Toda la ciudad"}, {clave: "pueblos", etiqueta: "Solo pueblos originarios"}], valor: "ciudad"}),
    umbral: campo({id: "mapa-umbral", nombre: "umbral", etiqueta: "Presencia indígena mínima",
      opciones: PRESENCIA_MINIMA.map((p) => ({clave: String(p.valor), etiqueta: p.etiqueta})), valor: "0"}),
  };

  // La unidad va hasta arriba y sola: decide qué controles existen debajo.
  const nodo = html`<div class="panel-filtros panel-mapa">
    <fieldset class="panel-grupo panel-grupo-unidad">
      <legend class="panel-grupo-titulo">Nivel del mapa</legend>
      <div class="panel-campos">${c.unidad}</div>
    </fieldset>
    <fieldset class="panel-grupo">
      <legend class="panel-grupo-titulo">Qué se pinta</legend>
      <div class="panel-campos">${c.poblacion}${c.lengua}${c.cruce}</div>
    </fieldset>
    <fieldset class="panel-grupo">
      <legend class="panel-grupo-titulo">Cuándo y para quién</legend>
      <div class="panel-campos">${c.anio}${c.sexo}${c.ambito}${c.umbral}</div>
    </fieldset>
  </div>`;

  const aplica = {};
  const ver = (nombre, visible) => { aplica[nombre] = visible; c[nombre].hidden = !visible; };
  let minimoDelLector = false, yaPropuesto = false;

  function leer() {
    return {
      poblacion: c.poblacion.value, lengua: c.lengua.value, cruce: c.cruce.value === "sin" ? null : c.cruce.value,
      unidad: c.unidad.value, anio: Number(c.anio.value), sexo: c.sexo.value, ambito: c.ambito.value,
      umbral: Number(c.umbral.value),
    };
  }

  // Reconcilia opciones y visibilidad a partir de los VALORES actuales.
  function configurar(cambiado) {
    const unidad = c.unidad.value;
    const enAlcaldia = unidad === "alcaldia";

    // Población: por AGEB y manzana solo hablantes y hogares.
    c.poblacion.rellenar(POBLACIONES.filter((p) => enAlcaldia || !p.soloAlcaldia), c.poblacion.value);
    const pob = POBLACIONES.find((p) => p.clave === c.poblacion.value);

    // Lengua: solo con hablantes y solo por alcaldía (las teselas no la traen).
    const conLengua = enAlcaldia && pob.clave === "hablantes";
    ver("lengua", conLengua);
    if (!conLengua) c.lengua.value = "todas";

    // Cruces: solo en teselas, y solo los que existen en esa unidad.
    const cruces = enAlcaldia ? [] : CRUCES.filter((x) => x.tesela[unidad]);
    ver("cruce", !enAlcaldia);
    c.cruce.rellenar([{clave: "sin", etiqueta: "Sin cruce"}, ...cruces.map((x) => ({clave: x.clave, etiqueta: x.etiqueta, grupo: x.grupo}))], c.cruce.value);
    const cruce = c.cruce.value === "sin" ? null : c.cruce.value;

    // El mínimo se propone UNA vez con el primer cruce, salvo que el lector
    // ya haya tocado ese selector; después manda su elección.
    ver("umbral", Boolean(cruce));
    // Con hablantes, 10 % deja once AGEB en toda la ciudad: se propone 5 %.
    if (cambiado === "cruce" && cruce && !minimoDelLector && !yaPropuesto && c.umbral.value === "0") {
      c.umbral.value = pob.clave === "hablantes" ? "5" : "10";
      yaPropuesto = true;
    }
    if (!cruce) c.umbral.value = "0";

    // Años: los que tenga la fuente para esa combinación.
    const anios = aniosDe({unidad, poblacion: pob.clave, lengua: c.lengua.value});
    // Año por omisión: el último censo (2020) si existe; si no, el más reciente.
    const anioPref = anios.includes(Number(c.anio.value)) ? c.anio.value : anios.includes(2020) ? "2020" : String(anios.at(-1));
    c.anio.rellenar(anios.map((a) => ({clave: String(a), etiqueta: String(a)})), anioPref);
    ver("anio", anios.length > 1);

    // Sexo: no para hogares, no con cruce, no por AGEB (las teselas de AGEB
    // no traen el desglose).
    const conSexo = pob.porSexo && !cruce && unidad !== "ageb";
    ver("sexo", conSexo);
    if (!conSexo) c.sexo.value = "Total";

    ver("ambito", unidad === "manzana");
    if (unidad !== "manzana") c.ambito.value = "ciudad";

    // Un grupo sin ningún control visible se oculta entero: por AGEB no hay
    // año, sexo ni ámbito que elegir y la caja vacía confundía.
    for (const grupo of nodo.querySelectorAll(".panel-grupo")) {
      grupo.hidden = ![...grupo.querySelectorAll(".filtro")].some((f) => !f.hidden);
    }
  }

  for (const [nombre, form] of Object.entries(c)) {
    form.select.addEventListener("change", () => {
      if (nombre === "umbral") minimoDelLector = true;
      configurar(nombre);
      nodo.value = leer();
      nodo.dispatchEvent(new CustomEvent("input", {bubbles: false}));
    });
  }
  configurar(null);
  nodo.value = leer();
  nodo.campos = c;
  nodo.aplica = (nombre) => aplica[nombre] !== false;
  nodo.mostrar = (nombre, visible) => { c[nombre].hidden = !visible; };
  return nodo;
}
