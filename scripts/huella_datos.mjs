// Huella del contenido de datos de unas paginas de dist/ (texto de las
// tarjetas de cifras y de todas las tablas de respaldo), para comprobar que un
// cambio de rendimiento no cambia ninguna cifra. Uso:
//   node scripts/huella_datos.mjs salida.json /ruta1 /ruta2 ...
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import {writeFileSync} from "node:fs";
import path from "node:path";
const [salida, ...rutas] = process.argv.slice(2);
const s = await servirEstatico(path.join(import.meta.dirname, "..", "dist"), 8895);
const b = await chromium.launch({channel: "msedge"});
const out = {};
for (const r of rutas) {
  const p = await b.newPage({viewport: {width: 1366, height: 900}});
  await p.goto(`http://127.0.0.1:8895${r}`, {waitUntil: "load", timeout: 180000});
  await p.waitForSelector("#observablehq-main svg:not(.motivo) g[aria-label]", {timeout: 180000});
  await p.waitForTimeout(2500);
  out[r] = await p.evaluate(() => ({
    kpis: [...document.querySelectorAll(".kpi-fila")].map((e) => e.textContent.replace(/\s+/g, " ").trim()),
    tablas: [...document.querySelectorAll("#observablehq-main table")].map((t) => t.textContent.replace(/\s+/g, " ").trim()),
  }));
  await p.close();
}
writeFileSync(salida, JSON.stringify(out));
console.log(Object.entries(out).map(([r, v]) => `${r}: ${v.kpis.length} kpis, ${v.tablas.length} tablas`).join("\n"));
await b.close(); s.close();
