// Muro de lenguas de la tapa del libro (portada del inicio). Corre en el build
// y deja un JSON chico: la portada no carga el CSV de lenguas por alcaldía.
// Regla: Intercensal 2025, nivel alcaldía, sexo «Total», suma de hablantes por
// lengua; fuera las categorías que no son lengua («No especificado»,
// «… insuficientemente especificado», «Otras lenguas …»); las 30 mayores, con
// k = raíz(hablantes) / raíz(máximo) para el tamaño de letra.
import {readFileSync} from "node:fs";
import {csvParse} from "d3-dsv";

const filas = csvParse(readFileSync("src/data/lenguas_alcaldia.csv", "utf8"));
const suma = new Map();
for (const r of filas) {
  if (r.anio !== "2025" || r.nivel !== "alcaldia" || r.sexo !== "Total") continue;
  suma.set(r.lengua_nombre, (suma.get(r.lengua_nombre) ?? 0) + Number(r.num));
}
const lenguas = [...suma]
  .filter(([nombre]) => !/especificad|^otras lenguas/i.test(nombre))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);
if (lenguas.length < 30) throw new Error(`muro_lenguas: solo ${lenguas.length} lenguas en 2025`);
const max = Math.sqrt(lenguas[0][1]);
process.stdout.write(JSON.stringify({
  anio: 2025,
  lenguas: lenguas.map(([nombre, hablantes]) => ({nombre, hablantes: Math.round(hablantes), k: +(Math.sqrt(hablantes) / max).toFixed(3)})),
}));
