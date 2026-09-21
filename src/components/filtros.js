// src/components/filtros.js
// Panel de filtros homologado del tablero y la preparación de datos que
// consumen las gráficas. Hereda las reglas de discriminacion-mujeres:
//
//   - Un selector aparece solo si tiene más de una opción real.
//   - Si una dimensión no aplica a la fuente, se oculta; no se deja vacía.
//   - El centinela de "sin filtro" es una cadena fija, nunca null ni "".
//   - "Todos" tiene dos sentidos (AGREGADO y POR_SEPARADO) y el código nunca
//     adivina cuál se pidió: cada uno es un centinela distinto.
//   - La exclusión mutua entre controles se resuelve en los propios
//     listeners, para que lo que se ve y lo que se reporta coincidan.
//
// Y una regla propia: como máximo DOS dimensiones "por separado" a la vez
// (más el año). Una tercera reemplaza a la más antigua, porque tres
// desgloses cruzados producen rejillas de decenas de paneles que no se leen.

import * as Inputs from "npm:@observablehq/inputs";
import {html} from "npm:htl";
import {
  TODAS, TODOS, AGREGADO, POR_SEPARADO, VER_MAPA, COMPARAR_ENTIDADES, POR_TAMANO, COMPARAR,
  ORDEN_EDAD, ORDEN_TAM_LOC, TAM_LOC_RURAL, ORDEN_AMBITO, ORDEN_ESCOLARIDAD, ORDEN_ESTRATO, ORDEN_SEXO, ORDEN_DECIL,
  ORDEN_GRADO,
} from "./base.js";
import {COMPARACIONES, COMPARACION_POR_CLAVE, CRITERIOS, FUENTES, admiteNivel, serieDe} from "./grupos.js";
import {tasaPorGrupo} from "./agregar.js";

export {TODAS, TODOS, AGREGADO, POR_SEPARADO, VER_MAPA, COMPARAR_ENTIDADES, POR_TAMANO, COMPARAR};

// Etiquetas visibles de los centinelas.
export const ETIQUETA = {
  anioFacetas: "Comparar ediciones (por separado)",
  entidadTodas: "Todo el país (junto)",
  entidadComparar: "Comparar entidades (por separado)",
  entidadMapa: "Ver mapa",
  sexoJunto: "Ambos sexos (juntos)",
  sexoFacetas: "Por sexo (por separado)",
  ambitoJunto: "Todas las localidades (juntas)",
  ambitoFacetas: "Rural y urbano (por separado)",
  ambitoTamano: "Por tamaño de localidad (por separado)",
  ambitoRural: "Solo rural (menos de 2 500 habitantes)",
  ambitoUrbano: "Solo urbano (2 500 o más)",
  edadJunta: "Todas las edades (juntas)",
  edadFacetas: "Por rango de edad (por separado)",
  decilTodos: "Todos los deciles (juntos)",
  decilComparar: "Por decil de ingreso (por separado)",
  escTodos: "Toda la población (junta)",
  escComparar: "Por escolaridad (15 años o más, por separado)",
  estratoTodos: "Todos los estratos (juntos)",
  estratoComparar: "Por estrato socioeconómico (por separado)",
};

// Dimensiones que pueden desplegarse "por separado", en el orden en que se
// prefieren como FILAS de una gráfica (más categorías primero).
export const DIMENSIONES = {
  decil: {etiqueta: "Decil de ingreso", orden: ORDEN_DECIL, columna: "decil"},
  rango_edad: {etiqueta: "Rango de edad", orden: ORDEN_EDAD, columna: "rango_edad"},
  tam_loc: {etiqueta: "Tamaño de localidad", orden: ORDEN_TAM_LOC, columna: "tam_loc"},
  escolaridad: {etiqueta: "Escolaridad", orden: ORDEN_ESCOLARIDAD, columna: "escolaridad"},
  estrato: {etiqueta: "Estrato socioeconómico", orden: ORDEN_ESTRATO, columna: "estrato"},
  ambito: {etiqueta: "Ámbito", orden: ORDEN_AMBITO, columna: "ambito"},
  sexo: {etiqueta: "Sexo", orden: ORDEN_SEXO, columna: "sexo"},
  entidad: {etiqueta: "Entidad", orden: null, columna: "entidad"},
  anio: {etiqueta: "Edición", orden: null, columna: "anio"},
  indicador: {etiqueta: "Motivo", orden: null, columna: "indicador"},
  grado: {etiqueta: "Grado", orden: ORDEN_GRADO, columna: "grado"},
};

// --- El panel ---------------------------------------------------------------
// `datos` son las filas crudas del tema (principal + desgloses); de ahí salen
// las opciones reales de cada selector. Las opciones iniciales las decide la
// sección: la principal abre comparando entidades, las secundarias por edad.
export function panelFiltros(datos, {fuente, entidadInicial = TODAS, edadInicial = AGREGADO,
    ambitoInicial = AGREGADO, mostrarMapa = false, mostrarDecil = null, mostrarEscolaridad = true,
    // Las secciones cuyas filas ya son otra cosa (los motivos) no pueden
    // comparar entidades: la opción se retira en vez de dejarla inerte.
    compararEntidades = true} = {}) {
  const meta = FUENTES[fuente] ?? {};
  const anios = [...new Set(datos.map((d) => String(d.anio)))].sort();
  const entidades = [...new Set(datos.map((d) => d.entidad))].filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  const rangos = ORDEN_EDAD.filter((r) => datos.some((d) => d.rango_edad === r));
  const hayTamLoc = ORDEN_TAM_LOC.filter((t) => datos.some((d) => d.tam_loc === t)).length > 1;
  const hayDecil = (mostrarDecil ?? Boolean(meta.decil)) && datos.some((d) => d.decil && d.decil !== TODOS);
  const hayEsc = mostrarEscolaridad && datos.some((d) => d.escolaridad && d.escolaridad !== TODOS);
  const hayEstrato = datos.some((d) => d.estrato && d.estrato !== TODOS);
  const puedeEntidad = admiteNivel(fuente, "estatal") && entidades.length > 1;
  const puedeMapa = mostrarMapa && puedeEntidad;

  const comparacion = Inputs.select(COMPARACIONES.map((c) => c.clave), {
    label: "Comparación", value: "indigena",
    format: (k) => COMPARACION_POR_CLAVE[k]?.etiqueta ?? k,
  });
  const criterio = Inputs.select(CRITERIOS.map((c) => c.clave), {
    label: "Criterio de identificación", value: "lengua",
    format: (k) => CRITERIOS.find((c) => c.clave === k)?.etiqueta ?? k,
  });
  const sexo = Inputs.select([AGREGADO, POR_SEPARADO, ...ORDEN_SEXO], {
    label: "Sexo", value: AGREGADO,
    format: (k) => k === AGREGADO ? ETIQUETA.sexoJunto : k === POR_SEPARADO ? ETIQUETA.sexoFacetas : k,
  });
  // Edición: una concreta o comparar todas por separado. Nunca agregado.
  // Arranca en la más reciente: la serie está a un clic y la vista de entrada
  // no se parte en tres columnas.
  const anio = anios.length > 1
    ? Inputs.select([POR_SEPARADO, ...anios], {
        label: "Edición", value: anios.at(-1),
        format: (k) => k === POR_SEPARADO ? ETIQUETA.anioFacetas : k,
      })
    : null;
  const opcionesEntidad = [TODAS, ...(compararEntidades ? [COMPARAR_ENTIDADES] : []),
    ...(puedeMapa ? [VER_MAPA] : []), ...entidades];
  const entidad = puedeEntidad
    ? Inputs.select(opcionesEntidad, {
        label: "Entidad", value: opcionesEntidad.includes(entidadInicial) ? entidadInicial : TODAS,
        format: (k) => k === TODAS ? ETIQUETA.entidadTodas
          : k === COMPARAR_ENTIDADES ? ETIQUETA.entidadComparar
          : k === VER_MAPA ? ETIQUETA.entidadMapa : k,
      })
    : null;
  const ambito = hayTamLoc
    ? Inputs.select([AGREGADO, POR_SEPARADO, POR_TAMANO, "Rural", "Urbano"], {
        label: "Localidad", value: ambitoInicial,
        format: (k) => k === AGREGADO ? ETIQUETA.ambitoJunto
          : k === POR_SEPARADO ? ETIQUETA.ambitoFacetas
          : k === POR_TAMANO ? ETIQUETA.ambitoTamano
          : k === "Rural" ? ETIQUETA.ambitoRural : ETIQUETA.ambitoUrbano,
      })
    : null;
  const edad = rangos.length > 1
    ? Inputs.select([AGREGADO, POR_SEPARADO, ...rangos], {
        label: "Rango de edad", value: edadInicial,
        format: (k) => k === AGREGADO ? ETIQUETA.edadJunta : k === POR_SEPARADO ? ETIQUETA.edadFacetas : `${k} años`,
      })
    : null;
  const decil = hayDecil
    ? Inputs.select([TODOS, COMPARAR], {
        label: "Decil de ingreso", value: TODOS,
        format: (k) => k === TODOS ? ETIQUETA.decilTodos : ETIQUETA.decilComparar,
      })
    : null;
  const escolaridad = hayEsc
    ? Inputs.select([TODOS, COMPARAR], {
        label: "Escolaridad", value: TODOS,
        format: (k) => k === TODOS ? ETIQUETA.escTodos : ETIQUETA.escComparar,
      })
    : null;

  const estrato = hayEstrato
    ? Inputs.select([TODOS, COMPARAR], {
        label: "Estrato socioeconómico", value: TODOS,
        format: (k) => k === TODOS ? ETIQUETA.estratoTodos : ETIQUETA.estratoComparar,
      })
    : null;

  // Dos grupos, de lo grande a lo específico: primero qué se compara y en qué
  // territorio, después entre qué personas. Con nueve selectores en una sola
  // rejilla el lector no distinguía cuáles cambian la pregunta y cuáles la
  // afinan.
  const GRUPOS = [
    {titulo: "Qué se compara y dónde",
     campos: [["comparacion", comparacion], ["criterio", criterio], ["anio", anio], ["entidad", entidad], ["ambito", ambito]]},
    {titulo: "Entre quiénes",
     campos: [["edad", edad], ["sexo", sexo], ["escolaridad", escolaridad], ["decil", decil], ["estrato", estrato]]},
  ].map((g) => ({...g, campos: g.campos.filter(([, c]) => c)})).filter((g) => g.campos.length);
  const campos = GRUPOS.flatMap((g) => g.campos);
  // Los formularios de Inputs van DIRECTOS en .panel-campos, sin envoltorio: la
  // hoja los estiliza como `.panel-campos > form` (etiqueta arriba, selector
  // debajo, ancho flexible). Envueltos en un <div> esa regla dejaba de
  // aplicar y las etiquetas se encimaban con los selectores. El nombre del
  // campo viaja en data-campo del propio formulario, igual que en PISA.
  for (const [nombre, c] of campos) c.dataset.campo = nombre;
  const envoltorios = new Map(campos);

  const cont = html`<div class="panel-filtros">
    ${GRUPOS.map((g) => html`<fieldset class="panel-grupo">
      <legend class="panel-grupo-titulo">${g.titulo}</legend>
      <div class="panel-campos">${g.campos.map(([, c]) => c)}</div>
    </fieldset>`)}
    ${meta.nota ? html`<p class="panel-nota">${meta.nota}</p>` : ""}
  </div>`;

  // ¿Qué dimensiones están "por separado" ahora mismo? (sin contar el año)
  const separadas = () => {
    const s = [];
    if (sexo.value === POR_SEPARADO && comparacion.value === "indigena") s.push("sexo");
    if (ambito && (ambito.value === POR_SEPARADO || ambito.value === POR_TAMANO)) s.push("ambito");
    if (edad && edad.value === POR_SEPARADO) s.push("rango_edad");
    if (decil && decil.value === COMPARAR) s.push("decil");
    if (escolaridad && escolaridad.value === COMPARAR) s.push("escolaridad");
    if (estrato && estrato.value === COMPARAR) s.push("estrato");
    return s;
  };
  const control = {sexo, ambito, rango_edad: edad, decil, escolaridad, estrato};
  const reposo = {sexo: AGREGADO, ambito: AGREGADO, rango_edad: AGREGADO, decil: TODOS, escolaridad: TODOS, estrato: TODOS};
  const apagar = (dim) => {
    if (control[dim]) control[dim].value = reposo[dim];
  };

  const valor = () => ({
    comparacion: comparacion.value,
    criterio: criterio.value,
    // Fuera de la comparación por población el sexo no aplica: la propia
    // comparación ya lo separa.
    sexo: comparacion.value === "indigena" ? sexo.value : AGREGADO,
    anio: anio ? anio.value : (anios[0] ?? POR_SEPARADO),
    entidad: entidad ? entidad.value : TODAS,
    ambito: ambito ? ambito.value : AGREGADO,
    rangoEdad: edad ? edad.value : AGREGADO,
    decil: decil ? decil.value : TODOS,
    escolaridad: escolaridad ? escolaridad.value : TODOS,
    estrato: estrato ? estrato.value : TODOS,
    separadas: separadas(),
  });

  // Historial de activación de "por separado", para saber cuál es la más
  // antigua cuando entra una tercera.
  let orden = separadas();

  function ocultar() {
    // Una lista de opciones solo se muestra cuando el selector de modo la
    // hace efectiva (lección 64): el sexo no aplica en "mujeres vs hombres".
    const sx = envoltorios.get("sexo");
    if (sx) sx.hidden = comparacion.value !== "indigena";
  }

  function reconciliar(cambiado) {
    const viendoMapa = entidad && entidad.value === VER_MAPA;
    const comparandoEnt = entidad && entidad.value === COMPARAR_ENTIDADES;

    // Decil, escolaridad y estrato viven cada uno en su archivo, sin tamaño de
    // localidad, y son excluyentes entre sí: activar uno apaga a los otros y
    // devuelve el ámbito a "todas las localidades".
    const CAPAS = {decil, escolaridad, estrato};
    if (cambiado in CAPAS && CAPAS[cambiado]?.value === COMPARAR) {
      for (const otra of Object.keys(CAPAS)) if (otra !== cambiado) apagar(otra);
      if (ambito) ambito.value = AGREGADO;
    }
    if (cambiado === "ambito" && ambito && ambito.value !== AGREGADO) {
      for (const capa of Object.keys(CAPAS)) apagar(capa);
    }

    // El mapa usa el territorio como dimensión principal: no se combina con
    // ningún desglose ni con comparar ediciones (serían decenas de mapas).
    if (viendoMapa) {
      if (anio && anio.value === POR_SEPARADO) anio.value = anios.at(-1);
      for (const dim of separadas()) apagar(dim);
    }

    // Tope de desgloses: dos, más uno si se comparan entidades (que ya
    // ocupan las filas) o ediciones. Con entidades solo cabe UNA faceta.
    let activas = separadas();
    const tope = comparandoEnt ? 1 : 2;
    orden = [...orden.filter((d) => activas.includes(d)), ...activas.filter((d) => !orden.includes(d))];
    while (orden.length > tope) {
      const vieja = orden.shift();
      apagar(vieja);
    }
    activas = separadas();
    // Comparar entidades con una faceta y además ediciones es una rejilla
    // de 32 filas por (facetas x ediciones): se deja una sola faceta.
    if (comparandoEnt && anio && anio.value === POR_SEPARADO && activas.length) {
      if (cambiado === "anio") { for (const d of activas) apagar(d); }
      else anio.value = anios.at(-1);
    }
    // Dos desgloses y además ediciones por separado: tres dimensiones. Se
    // fija la edición a la más reciente.
    if (!comparandoEnt && anio && anio.value === POR_SEPARADO && separadas().length >= 2) {
      if (cambiado === "anio") apagar(orden.shift());
      else anio.value = anios.at(-1);
    }
    ocultar();
  }

  cont.value = valor();
  ocultar();
  for (const [nombre, c] of campos) {
    c.addEventListener("input", () => {
      reconciliar(nombre);
      cont.value = valor();
      cont.dispatchEvent(new Event("input", {bubbles: true}));
    });
  }
  return cont;
}

// --- Preparación de datos ---------------------------------------------------

// Aplica los filtros del panel a las filas crudas. No calcula porcentajes:
// solo recorta el universo. Elige además la CAPA de datos correcta: las filas
// del archivo principal (decil y escolaridad en "Todos", tamaño de localidad
// concreto) o las del desglose pedido (decil o escolaridad concreto, tamaño
// de localidad en "Todos"). Mezclarlas contaría a la misma gente dos veces.
export function filtrar(datos, v, {indicador = null} = {}) {
  const abierto = (x) => x === TODOS || x === TODAS || x === POR_SEPARADO || x === AGREGADO
    || x === VER_MAPA || x === COMPARAR_ENTIDADES || x === POR_TAMANO || x === COMPARAR;
  const capaDecil = v.decil === COMPARAR;
  const capaEsc = v.escolaridad === COMPARAR;
  const capaEstrato = v.estrato === COMPARAR;
  return datos.filter((d) =>
    (indicador == null || d.indicador === indicador) &&
    (abierto(v.anio) || String(d.anio) === String(v.anio)) &&
    (abierto(v.entidad) || d.entidad === v.entidad) &&
    (abierto(v.rangoEdad) || d.rango_edad === v.rangoEdad) &&
    (v.sexo === AGREGADO || v.sexo === POR_SEPARADO || d.sexo === v.sexo) &&
    (capaDecil ? (d.decil !== TODOS && d.decil != null) : (d.decil == null || d.decil === TODOS)) &&
    (capaEsc ? (d.escolaridad !== TODOS && d.escolaridad != null) : (d.escolaridad == null || d.escolaridad === TODOS)) &&
    (capaEstrato ? (d.estrato !== TODOS && d.estrato != null) : (d.estrato == null || d.estrato === TODOS)) &&
    (capaDecil || capaEsc || capaEstrato
      ? (d.tam_loc == null || d.tam_loc === TODOS)
      : (d.tam_loc !== TODOS && (abierto(v.ambito)
          || (v.ambito === "Rural" ? d.tam_loc === TAM_LOC_RURAL : d.tam_loc !== TAM_LOC_RURAL))))
  );
}

// Traduce el estado del panel a la geometría de la gráfica. Devuelve
// {modo, filas, faceta}: `modo` decide la forma (mapa, entidades, pendiente,
// dumbbell, barras), `filas` la dimensión que va en las filas y `faceta` la
// que multiplica paneles.
export function geometria(v, {aniosDisponibles = []} = {}) {
  const comparaAnios = v.anio === POR_SEPARADO && aniosDisponibles.length > 1;
  if (v.entidad === VER_MAPA) return {modo: "mapa", filas: null, faceta: null};

  // Dimensiones desplegadas, ordenadas por número de categorías: la de más
  // categorías va a las filas y la otra a las facetas.
  const dims = [];
  if (v.decil === COMPARAR) dims.push("decil");
  if (v.rangoEdad === POR_SEPARADO) dims.push("rango_edad");
  if (v.ambito === POR_TAMANO) dims.push("tam_loc");
  if (v.escolaridad === COMPARAR) dims.push("escolaridad");
  if (v.estrato === COMPARAR) dims.push("estrato");
  if (v.ambito === POR_SEPARADO) dims.push("ambito");
  if (v.sexo === POR_SEPARADO && v.comparacion === "indigena") dims.push("sexo");

  if (v.entidad === COMPARAR_ENTIDADES) {
    return {modo: "entidades", filas: "entidad", faceta: dims[0] ?? (comparaAnios ? "anio" : null)};
  }
  if (!dims.length) {
    return comparaAnios ? {modo: "pendiente", filas: null, faceta: null} : {modo: "barras", filas: null, faceta: null};
  }
  return {modo: "dumbbell", filas: dims[0], faceta: dims[1] ?? (comparaAnios ? "anio" : null)};
}

// Convierte filas crudas en las series de la comparación activa y las agrega
// por las dimensiones pedidas. El paso clave: `serieDe` colapsa las celdas
// de identidad a las dos series de la comparación bajo el criterio activo, y
// SOLO ENTONCES se agrega (nunca se promedian tasas).
export function prepararSeries(datos, {comparacion, criterio, dims = [], formato = "pct"}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  if (!comp) return [];
  const lista = (Array.isArray(dims) ? dims : [dims]).filter(Boolean);
  const filas = [];
  for (const d of datos) {
    const serie = serieDe(d, comparacion, criterio);
    if (!serie) continue;
    const f = {...d, serie};
    if (lista.includes("ambito")) f.ambito = d.tam_loc === TAM_LOC_RURAL ? "Rural" : "Urbano";
    filas.push(f);
  }
  const agregadas = tasaPorGrupo(filas, ["serie", ...lista], formato);
  const posSerie = new Map(comp.series.map((s, i) => [s, i]));
  return agregadas.sort((a, b) => {
    for (const k of lista) {
      const orden = DIMENSIONES[k]?.orden;
      if (orden) {
        const d = orden.indexOf(String(a[k])) - orden.indexOf(String(b[k]));
        if (d !== 0) return d;
      } else {
        const d = String(a[k] ?? "").localeCompare(String(b[k] ?? ""), "es");
        if (d !== 0) return d;
      }
    }
    return (posSerie.get(a.serie) ?? 99) - (posSerie.get(b.serie) ?? 99);
  });
}

// Brecha entre las dos series de la comparación, en puntos porcentuales,
// con el texto listo para la tarjeta de KPI. Positiva = la primera serie (la
// población indígena) está por encima.
export function brechaDe(series, comparacion, {formato = "pct"} = {}) {
  const comp = COMPARACION_POR_CLAVE[comparacion];
  if (!comp) return null;
  const [a, b] = comp.series;
  const fa = series.find((s) => s.serie === a);
  const fb = series.find((s) => s.serie === b);
  if (!fa || !fb || fa.pct == null || fb.pct == null) return null;
  const dif = fa.pct - fb.pct;
  if (formato !== "pct") {
    return {dif, texto: Math.round(Math.abs(dif)).toLocaleString("es-MX"),
            detalle: `Más alto en ${(dif >= 0 ? a : b).toLowerCase()}`};
  }
  return {
    dif,
    texto: `${Math.abs(dif).toFixed(1)} pp`,
    detalle: `Más alto en ${(dif >= 0 ? a : b).toLowerCase()}`,
  };
}
