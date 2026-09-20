// Comprobación de daltonismo de las paletas categóricas del tablero.
//
// Corre el validador de la skill `dataviz` (copiado en validate_palette.js)
// sobre las paletas que base.js usa de verdad, en los dos modos y contra la
// superficie real de la tarjeta (--surface-3). Un tono que se lee gris o dos
// tonos que se confunden bajo deuteranopía no se notan mirando el swatch:
// hay que calcular la separación ΔE en OKLab con visión simulada.
//
// Las paletas se escriben aquí a mano y NO se importan de base.js a
// propósito: base.js toca `document` al arrancar y este script corre en Node.
// Si cambian en base.js hay que cambiarlas aquí; que coincidan lo comprueba
// verificar_render.mjs, que lee los colores reales del SVG y los lista.
//
// Uso:  npm run verificar:paleta

import {validate} from "./validate_palette.js";

const PALETAS = [
  // Los pares se dibujan en dumbbell y mapas, donde los dos puntos quedan
  // contiguos: se exige separación entre TODOS los pares. Los hex son los
  // mismos de src/components/base.js; que coincidan lo comprueba
  // verificar_render.mjs leyendo los colores reales del SVG.
  {nombre: "Indígena vs resto (claro)",  modo: "light", superficie: "#fafaf9", pares: "all", hex: ["#C4101B", "#2166AC"]},
  {nombre: "Indígena vs resto (oscuro)", modo: "dark",  superficie: "#1e1e1c", pares: "all", hex: ["#EE4C7C", "#4A90D9"]},
  {nombre: "Mujeres vs hombres (claro)",  modo: "light", superficie: "#fafaf9", pares: "all", hex: ["#B87709", "#2166AC"]},
  {nombre: "Mujeres vs hombres (oscuro)", modo: "dark",  superficie: "#1e1e1c", pares: "all", hex: ["#BE8700", "#4A90D9"]},
];

let fallos = 0;
for (const p of PALETAS) {
  // validate() devuelve {report: [[nombre, estado, detalle], ...], ok}. El
  // estado es true/false en las dos primeras comprobaciones y una cadena
  // ("pass" | "floor" | "fail" | "relief") en las demás.
  const {report, ok} = validate(p.hex, {mode: p.modo, surface: p.superficie, pairs: p.pares});
  console.log(`\n== ${p.nombre}  ${p.hex.join(" ")}  →  ${ok ? "pasa" : "FALLA"}`);
  for (const [nombre, estado, detalle] of report) {
    const e = estado === true ? "pass" : estado === false ? "fail" : String(estado);
    console.log(`   ${e.padEnd(6)} ${nombre.padEnd(22)} ${detalle}`);
  }
  if (!ok) fallos++;
}
console.log("\n" + "=".repeat(60));
if (fallos) { console.log(`FALLAN ${fallos} paletas.`); process.exit(1); }
console.log("Todas las paletas pasan banda de luminosidad, piso de croma, separación CVD y contraste.");
