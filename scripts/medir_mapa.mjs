// Mide el mapa unificado (/mapa) de dist/: carga hasta el primer "idle" de
// MapLibre y, para cada cambio de control, el tiempo de JS del repintado y el
// tiempo hasta que el mapa vuelve a quedar quieto con sus teselas cargadas.
// Uso: node scripts/medir_mapa.mjs
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import path from "node:path";
const s = await servirEstatico(path.join(import.meta.dirname, "..", "dist"), 8894);
const b = await chromium.launch({channel: "msedge"});
const p = await b.newPage({viewport: {width: 1366, height: 900}});
// Con RED=1: 10 Mbps y 40 ms de latencia, sin cache (las teselas viajan por red).
if (process.env.RED) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", {cacheDisabled: true});
  await cdp.send("Network.emulateNetworkConditions", {offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8});
}
const t0 = Date.now();
await p.goto("http://127.0.0.1:8894/mapa", {waitUntil: "load", timeout: 180000});
await p.waitForFunction(() => [...document.querySelectorAll("*")].some((e) => e.mapa), null, {timeout: 120000});
const carga = await p.evaluate(() => new Promise((ok) => {
  const m = [...document.querySelectorAll("*")].find((e) => e.mapa).mapa;
  const fin = () => ok(Math.round(performance.now()));
  if (m.loaded() && m.areTilesLoaded()) fin(); else m.once("idle", fin);
}));
console.log(JSON.stringify({paso: "carga hasta el primer idle", ms: carga, deNavegacion: Date.now() - t0}));

const PASOS = [
  ["#mapa-unidad", "ageb"], ["#mapa-unidad", "manzana"], ["#mapa-poblacion", "hogares"],
  ["#mapa-unidad", "alcaldia"], ["#mapa-poblacion", "hablantes"], ["#mapa-anio", "2010"], ["#mapa-anio", "2020"],
];
for (const [sel, valor] of PASOS) {
  const r = await p.evaluate(async ([sel, valor]) => {
    const el = document.querySelector(sel);
    if (!el) return {sel, error: "no existe"};
    const opcion = [...el.options].find((o) => o.value === valor);
    if (!opcion) return {sel, valor, error: `opciones: ${[...el.options].map((o) => o.value).join(",")}`};
    const m = [...document.querySelectorAll("*")].find((e) => e.mapa).mapa;
    const t = performance.now();
    const idle = new Promise((ok) => { m.once("idle", () => ok(performance.now())); setTimeout(() => ok(null), 45000); });
    el.value = valor;
    el.dispatchEvent(new Event("input", {bubbles: true}));
    el.dispatchEvent(new Event("change", {bubbles: true}));
    const js = performance.now() - t;
    m.triggerRepaint();
    const fin = await idle;
    return {sel, valor, jsMs: Math.round(js), hastaQuietoMs: fin ? Math.round(fin - t) : "sin idle en 45 s"};
  }, [sel, valor]);
  console.log(JSON.stringify(r));
}
for (const texto of ["Ver de dónde vienen", "Volver a la ciudad", "Ver el mapa de la lengua", "Volver a la ciudad"]) {
  const r = await p.evaluate(async (texto) => {
    const boton = [...document.querySelectorAll("#observablehq-main button")].find((x) => x.textContent.trim() === texto && !x.hidden);
    if (!boton) return {boton: texto, error: "no visible"};
    const m = [...document.querySelectorAll("*")].find((e) => e.mapa).mapa;
    const t = performance.now();
    const idle = new Promise((ok) => { setTimeout(() => m.once("idle", () => ok(performance.now())), 700); setTimeout(() => ok(null), 45000); });
    boton.click();
    const js = performance.now() - t;
    const fin = await idle;
    return {boton: texto, jsMs: Math.round(js), hastaQuietoMs: fin ? Math.round(fin - t) : "sin idle en 45 s"};
  }, texto);
  console.log(JSON.stringify(r));
}
await b.close(); s.close();
