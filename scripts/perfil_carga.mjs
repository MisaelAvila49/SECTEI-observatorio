// Perfil de CPU de la carga de una pagina de dist/: tiempo propio por funcion
// y archivo (las 25 mas costosas). Uso: node scripts/perfil_carga.mjs /ruta
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import path from "node:path";
const RAIZ = path.join(import.meta.dirname, "..", "dist");
const s = await servirEstatico(RAIZ, 8896);
const b = await chromium.launch({channel: "msedge"});
const p = await b.newPage({viewport: {width: 1366, height: 900}});
const cdp = await p.context().newCDPSession(p);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", {interval: 200});
await cdp.send("Profiler.start");
await p.goto(`http://127.0.0.1:8896${process.argv[2]}`, {waitUntil: "load", timeout: 180000});
await p.waitForSelector("#observablehq-main svg:not(.motivo) g[aria-label]", {timeout: 180000});
await p.waitForTimeout(1500);
const {profile} = await cdp.send("Profiler.stop");
const porNodo = new Map(profile.nodes.map((n) => [n.id, n]));
const propio = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => { propio.set(id, (propio.get(id) ?? 0) + (dt[i] ?? 0)); });
const agg = new Map();
for (const [id, us] of propio) {
  const n = porNodo.get(id); const f = n.callFrame;
  const k = `${f.functionName || "(anon)"} @ ${(f.url || "").split("/").pop()}:${f.lineNumber}`;
  agg.set(k, (agg.get(k) ?? 0) + us);
}
const total = [...agg.values()].reduce((a, c) => a + c, 0);
console.log("total ms", Math.round(total / 1000));
for (const [k, us] of [...agg].sort((a, c) => c[1] - a[1]).slice(0, 25)) console.log(String(Math.round(us / 1000)).padStart(6), k);
await b.close(); s.close();
