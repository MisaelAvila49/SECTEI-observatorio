// src/components/grupos.js
// El modelo de comparación del tablero: quién se compara con quién, bajo qué
// criterio de identificación y qué puede cada fuente. Es la única definición;
// cambiar aquí cambia todas las páginas.
//
// Cada celda de los data loaders trae dos llaves de identidad EXCLUYENTES:
//   lengua:   "Sí" | "No"   habla lengua indígena
//   autoads:  "Sí" | "No"   se considera indígena (autoadscripción)
// más sexo. Una persona cae en una sola de las cuatro combinaciones lengua x
// autoads, así que el criterio elegido decide qué celdas se suman en cada
// serie y ninguna persona se cuenta dos veces.

import {COLOR_SERIE} from "./base.js";

// --- Criterios de identificación --------------------------------------------
// Son dos preguntas distintas del cuestionario y dan poblaciones distintas
// (6 % contra 19 % en el Censo). El tablero no elige una: ofrece las dos y
// dice cuál está activa en cada figura.
export const CRITERIOS = [
  {
    clave: "lengua",
    columna: "lengua",
    etiqueta: "Habla lengua indígena",
    corto: "por lengua",
    frase: "quienes declararon hablar alguna lengua indígena",
  },
  {
    clave: "autoads",
    columna: "autoads",
    etiqueta: "Se considera indígena",
    corto: "por autoadscripción",
    frase: "quienes declararon considerarse indígenas, hablen o no una lengua",
  },
];
export const CRITERIO_POR_CLAVE = Object.fromEntries(CRITERIOS.map((c) => [c.clave, c]));

// --- Comparaciones ----------------------------------------------------------
// Cada comparación es un par de series con su color validado (ver base.js).
// `dentro` decide qué filas entran; `serie` a qué serie va cada fila.
export const SERIE_INDIGENA = "Población indígena";
export const SERIE_RESTO = "Resto de la población";

export const COMPARACIONES = [
  {
    clave: "indigena",
    etiqueta: "Población indígena vs resto de la población",
    series: [SERIE_INDIGENA, SERIE_RESTO],
    // Ambas series existen para todo el mundo; el sexo se puede facetar.
    admiteSexo: true,
    pregunta: "¿Cuánto separa a la población indígena del resto?",
  },
  {
    clave: "sexo-indigena",
    etiqueta: "Mujeres indígenas vs hombres indígenas",
    series: ["Mujeres indígenas", "Hombres indígenas"],
    admiteSexo: false,
    pregunta: "Dentro de la población indígena, ¿cuánto pesa ser mujer?",
  },
];
// Comparación territorial del mapa por AGEB. No entra al selector de las
// páginas de encuesta (por eso no está en COMPARACIONES): compara AGEB, no
// personas, y solo la usa la página del mapa por AGEB.
export const COMPARACION_AGEB = {
  clave: "ageb",
  etiqueta: "AGEB que alcanzan el umbral vs resto de las AGEB",
  series: ["AGEB que alcanzan el umbral", "Resto de las AGEB"],
  admiteSexo: false,
};

export const COMPARACION_POR_CLAVE = Object.fromEntries(
  [...COMPARACIONES, COMPARACION_AGEB].map((c) => [c.clave, c]));

// ¿Es indígena esta fila bajo el criterio activo?
export function esIndigena(fila, criterio) {
  const col = CRITERIO_POR_CLAVE[criterio]?.columna ?? "lengua";
  return fila[col] === "Sí";
}

// Serie a la que va una fila, o null si no entra en la comparación.
export function serieDe(fila, comparacion, criterio) {
  const ind = esIndigena(fila, criterio);
  if (comparacion === "sexo-indigena") {
    if (!ind) return null;
    return fila.sexo === "Mujeres" ? "Mujeres indígenas" : "Hombres indígenas";
  }
  return ind ? SERIE_INDIGENA : SERIE_RESTO;
}

// Escala de color de Plot para una comparación: con dos series siempre hay
// leyenda. Lee de COLOR_SERIE, que aplicarModo() reescribe en sitio.
export function escalaColor(comparacion) {
  const c = COMPARACION_POR_CLAVE[comparacion] ?? COMPARACIONES[0];
  return {domain: c.series, range: c.series.map((s) => COLOR_SERIE[s]), legend: true};
}

export function colorDeSerie(serie) {
  return COLOR_SERIE[serie] ?? "#888";
}

// --- Qué puede cada fuente --------------------------------------------------
// Las tres encuestas no son intercambiables. `nivel` es hasta dónde llega la
// representatividad del diseño muestral; `unidad` es qué mide.
export const FUENTES = {
  censo: {
    nombre: "Censo 2020 (cuestionario ampliado)",
    anios: [2020],
    nivel: "estatal",
    unidad: "vivienda",
    decil: false,
    nota: "Muestra ampliada del Censo: mide lo que hay en la vivienda, no lo que cada persona usa.",
  },
  enigh: {
    nombre: "ENIGH",
    anios: [2020, 2022, 2024],
    nivel: "estatal",
    unidad: "hogar",
    decil: true,
    nota: "Mide lo que hay en el hogar en tres ediciones; es la única fuente con decil de ingreso.",
  },
  endutih: {
    nombre: "ENDUTIH 2025",
    anios: [2025],
    nivel: "estatal",
    unidad: "persona",
    decil: false,
    nota: "Mide el uso personal. Las preguntas de lengua y autoadscripción indígena existen desde 2025: no hay serie histórica.",
  },
};

export function admiteNivel(fuente, nivel) {
  const orden = {nacional: 0, estatal: 1, municipal: 2};
  const f = FUENTES[fuente];
  if (!f) return false;
  return orden[nivel] <= orden[f.nivel];
}
