// Mide los paneles de filtros: si son pegajosos y cuánto miden cuando se
// quedan fijos arriba (getBoundingClientRect), en 1366 × 768 y 390 × 844.
// Uso: node scripts/medir_paneles.mjs [base=http://localhost:3102]
import {chromium} from "playwright-core";
const BASE = process.argv[2] ?? "http://localhost:3102";
const PAGINAS = ["/libro/lenguas-de-mexico", "/libro/hablantes-en-el-tiempo", "/libro/variantes", "/libro/lenguas-en-riesgo",
  "/libro/la-ciudad-en-el-pais", "/libro/donde-viven", "/libro/colonias-y-marginacion", "/libro/quienes-son", "/libro/escuela-y-trabajo",
  "/libro/salud-y-lengua", "/libro/condiciones-de-vida", "/encuestas/censo/vivienda", "/encuestas/enigh/hogar", "/encuestas/endutih/uso",
  "/encuestas/endutih/actividades", "/encuestas/endutih/barreras", "/libro/discriminacion", "/libro/violencia"];
const b = await chromium.launch({channel: "msedge"});
for (const [w, h] of [[1366, 768], [390, 844]]) {
  const p = await b.newPage({viewport: {width: w, height: h}, reducedMotion: "reduce"});
  const resumen = [];
  for (const r of PAGINAS) {
    await p.goto(BASE + r, {waitUntil: "load"}); await p.waitForTimeout(3000);
    const n = await p.evaluate(() => document.querySelectorAll("#observablehq-main .panel-filtros").length);
    for (let i = 0; i < n; i++) {
      const m = await p.evaluate(async (i) => {
        const panel = document.querySelectorAll("#observablehq-main .panel-filtros")[i];
        const cs = getComputedStyle(panel);
        // Se baja hasta la mitad de lo que sigue al panel para que quede fijo.
        const padre = panel.parentElement;
        const y = padre.getBoundingClientRect().top + scrollY + Math.min(padre.offsetHeight * 0.5, padre.offsetHeight - 200);
        scrollTo(0, Math.max(0, y)); await new Promise((r) => setTimeout(r, 900));
        const rc = panel.getBoundingClientRect();
        return {sticky: cs.position === "sticky", fijo: Math.abs(rc.top) < 2, alto: Math.round(rc.height)};
      }, i);
      resumen.push({r, i, ...m});
    }
  }
  const fijos = resumen.filter((x) => x.fijo);
  console.log(`\n== ${w} × ${h}: paneles ${resumen.length}, pegajosos ${resumen.filter((x) => x.sticky).length}, fijos al bajar ${fijos.length}; alto fijo máx ${Math.max(0, ...fijos.map((x) => x.alto))} px, mediana ${fijos.map((x) => x.alto).sort((a, c) => a - c)[Math.floor(fijos.length / 2)] ?? 0} px`);
  for (const x of resumen) console.log(`  ${x.r.padEnd(32)} #${x.i} pegajoso=${x.sticky} fijo=${x.fijo} alto=${x.alto}`);
  await p.close();
}
await b.close();
