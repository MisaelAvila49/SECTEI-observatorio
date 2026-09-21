// Auditoría de filtros: para cada sección, cambia cada control y comprueba que
// el dibujo responde. Se usa una HUELLA que incluye grosores y opacidades,
// porque muchos filtros no cambian el NÚMERO de marcas sino su énfasis.
import {chromium} from "playwright-core";
import {servirEstatico} from "./servidor_estatico.mjs";
import path from "node:path";
const RAIZ = path.join(process.cwd(), "dist");
const srv = await servirEstatico(RAIZ, 8838);
const b = await chromium.launch({channel:"msedge"});
const pg = await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e.message)));

// La huella incluye el ORDEN de las etiquetas del eje y, no solo los atributos
// de las marcas: un control que reordena filas —«Ordenar por» en la matriz—
// deja la misma cuenta de marcas con los mismos colores, y sin esto parecería
// inerte cuando en realidad funciona.
const HUELLA = (s) => {
  const ejeY=[...s.querySelectorAll('g[aria-label="y-axis tick label"] text')]
    .slice(0,8).map(t=>t.textContent).join(",");
  const marcas=[...s.querySelectorAll("circle,rect,path,line")];
  const partes=marcas.map(m=>[
    m.getAttribute("fill")||"", m.getAttribute("stroke")||"",
    m.getAttribute("stroke-width")||"", m.getAttribute("fill-opacity")||"",
    m.getAttribute("stroke-opacity")||"", m.getAttribute("r")||"",
  ].join("|"));
  const cuenta={};
  for(const p of partes) cuenta[p]=(cuenta[p]||0)+1;
  // Posiciones: un filtro que mueve los puntos sin cambiar cuántos son ni de
  // qué color (cambiar de área en un scatter, de umbral en unas paralelas, de
  // muestra en una cascada) solo se nota en cx/cy/x/y/d. Se resumen en un
  // hash corto para no comparar cadenas de cientos de KB.
  let h=0;
  for(const m of marcas){
    const t=(m.getAttribute("cx")||m.getAttribute("x")||m.getAttribute("x1")||"")+","+
            (m.getAttribute("cy")||m.getAttribute("y")||m.getAttribute("y1")||"")+","+
            (m.getAttribute("width")||"")+","+(m.getAttribute("height")||"")+","+
            (m.getAttribute("d")||"").slice(0,80)+(m.getAttribute("transform")||"");
    for(let i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))|0;
  }
  // Los conteos por color van completos al hash, no solo su longitud: en el
  // mapa, cambiar de área recolorea 16 países sin mover ningún trazo, y si
  // los conteos conservan el mismo número de dígitos la longitud no cambia.
  let hc=0; const cj=JSON.stringify(cuenta);
  for(let i=0;i<cj.length;i++) hc=(hc*31+cj.charCodeAt(i))|0;
  return marcas.length + "::" + hc + "::" +
    Object.keys(cuenta).sort().slice(0,6).join(";") + "::" + ejeY + "::" + h;
};

const fallos=[];
for (const ruta of ["/encuestas/censo/vivienda","/encuestas/enigh/hogar","/encuestas/endutih/uso","/encuestas/endutih/actividades","/encuestas/endutih/barreras","/mapa-agebs","/mapa-manzanas"]) {
  await pg.goto(`http://127.0.0.1:8838${ruta}`,{waitUntil:"networkidle"});
  // La página de la ENIGH carga 4 MB de parquet: se espera a la primera
  // sección real en vez de un tiempo fijo.
  await pg.waitForSelector("section.seccion-tablero", {timeout: 90000}).catch(() => {});
  await pg.waitForTimeout(2500);
  const secs = await pg.$$("section.seccion-tablero");
  console.log(`\n=== ${ruta} · ${secs.length} secciones ===`);
  for (let i=0;i<secs.length;i++){
    const sec=secs[i];
    const titulo=await sec.evaluate((s,n)=>s.querySelector("h3")?.textContent?.slice(0,42) ?? `sección ${n}`, i);
    // 1. Cada <select> del panel: probar su segunda opción
    const sels = await sec.$$(".panel-filtros select");
    for (let j=0;j<sels.length;j++){
      const etiqueta = await sels[j].evaluate(s=>s.closest("form")?.querySelector("label")?.textContent?.trim() ?? "?");
      const info = await sels[j].evaluate(s=>({
        opciones: [...s.options].map(o=>o.textContent),
        actual: s.selectedOptions[0]?.textContent,
      }));
      const opciones = info.opciones;
      // Elegir una opción DISTINTA de la activa: seleccionar la que ya está
      // puesta no dispara ningún evento, y el control parecería inerte.
      const destino = opciones.find(o => o !== info.actual);
      if (!destino) continue;
      const antes = await sec.evaluate(HUELLA);
      await sels[j].selectOption({label: destino});
      await pg.waitForTimeout(1100);
      const desp = await sec.evaluate(HUELLA);
      const ok = antes!==desp;
      console.log(`  ${ok?"ok   ":"INERTE"} [${titulo}] select «${etiqueta}» → «${destino}»`);
      if(!ok) fallos.push(`${ruta} · ${titulo} · select «${etiqueta}» → «${destino}» no cambia el dibujo`);
      await sels[j].selectOption({label: info.actual});
      await pg.waitForTimeout(900);
    }
    // 2. Casillas de área
    // Un campo OCULTO no se prueba: que una vista esconda el control que no
    // respeta es justamente el arreglo, no un fallo.
    // Un campo "oculto" tiene que estar oculto DE VERDAD: `hidden` es un
    // atributo de especificidad 0-0-1 y cualquier `display` propio lo vence,
    // así que el panel puede marcarlo y seguir pintándolo. Se comprueba antes
    // de nada, midiendo el rect de cada campo marcado.
    const pintadosOcultos = await sec.evaluate((s) => [...s.querySelectorAll(".panel-filtros [data-campo][hidden]")]
      .filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((c) => c.dataset.campo));
    if (pintadosOcultos.length) {
      console.log(`  FALLA  [${titulo}] campos marcados como ocultos pero visibles: ${pintadosOcultos.join(", ")}`);
      fallos.push(`${ruta} · ${titulo} · campos ocultos que siguen pintados: ${pintadosOcultos.join(", ")}`);
    }
    const cajasVisibles = await sec.$$('.panel-filtros [data-campo="areas"]:not([hidden]) input[type=checkbox]');
    const cajas = cajasVisibles;
    if (cajas.length){
      const antes = await sec.evaluate(HUELLA);
      await cajas[cajas.length-1].click();
      await pg.waitForTimeout(1100);
      const desp = await sec.evaluate(HUELLA);
      const ok = antes!==desp;
      console.log(`  ${ok?"ok   ":"INERTE"} [${titulo}] casilla de área`);
      if(!ok) fallos.push(`${ruta} · ${titulo} · la casilla de área no cambia el dibujo`);
      await cajas[cajas.length-1].click();
      await pg.waitForTimeout(700);
    }
    // 2b. Casillas de ciclo: quitar el último ciclo tiene que recortar algo.
    const cajasCiclo = await sec.$$('.panel-filtros [data-campo="ciclos"]:not([hidden]) input[type=checkbox]');
    if (cajasCiclo.length > 1){
      const antes = await sec.evaluate(HUELLA);
      await cajasCiclo[cajasCiclo.length-1].click();
      await pg.waitForTimeout(1100);
      const desp = await sec.evaluate(HUELLA);
      const ok = antes!==desp;
      console.log(`  ${ok?"ok   ":"INERTE"} [${titulo}] casilla de ciclo`);
      if(!ok) fallos.push(`${ruta} · ${titulo} · la casilla de ciclo no cambia el dibujo`);
      await cajasCiclo[cajasCiclo.length-1].click();
      await pg.waitForTimeout(700);
    }
    // 3. Buscador: destacar un continente
    const hayBusca = await sec.$(".busca-input");
    const escribir = async (texto) => sec.evaluate((s, t) => {
      const i = s.querySelector(".busca-input"); i.value = t;
      i.dispatchEvent(new Event("change", {bubbles: true}));
    }, texto);
    // Las pruebas de "segundo país" y "segundo continente" solo aplican a las
    // secciones con la política de vista() (las que llevan casillas de
    // ciclo); en las páginas de análisis, pendientes de migrar, un segundo
    // país solo añade otro destacado.
    const politicaNueva = !!(await sec.$('.panel-filtros [data-campo="ciclos"]'));
    if (hayBusca){
      // 3a. Segundo país: con dos o más elegidos solo se dibujan esos.
      const nivelSel = await sec.$(".panel-filtros select");
      const enPais = politicaNueva && nivelSel && await nivelSel.evaluate(s=>s.selectedOptions[0]?.textContent==="País");
      if (enPais){
        const antes = await sec.evaluate(HUELLA);
        await escribir("Chile");
        await pg.waitForTimeout(1300);
        const desp = await sec.evaluate(HUELLA);
        const ok = antes!==desp;
        console.log(`  ${ok?"ok   ":"INERTE"} [${titulo}] segundo país «Chile»`);
        if(!ok) fallos.push(`${ruta} · ${titulo} · elegir un segundo país no cambia el dibujo`);
        // Quitar el chip de Chile para dejar la sección como estaba.
        const chip = await sec.$('.busca-chip[title="Quitar Chile"]');
        if (chip) { await chip.click(); await pg.waitForTimeout(700); }
      }
      const sel0 = await sec.$(".panel-filtros select");
      const puedeNivel = sel0 && await sel0.evaluate(s=>[...s.options].some(o=>o.textContent==="Continente"));
      if (puedeNivel){
        await sel0.selectOption({label:"Continente"});
        await pg.waitForTimeout(900);
        const antes = await sec.evaluate(HUELLA);
        await escribir("Asia");
        await pg.waitForTimeout(1300);
        const desp = await sec.evaluate(HUELLA);
        const ok = antes!==desp;
        console.log(`  ${ok?"ok   ":"INERTE"} [${titulo}] abrir continente «Asia»`);
        if(!ok) fallos.push(`${ruta} · ${titulo} · abrir un continente no cambia el dibujo`);
        // Segundo continente: dos grupos a la vez, coloreados por grupo.
        if (politicaNueva){
          await escribir("Europa");
          await pg.waitForTimeout(1300);
          const desp2 = await sec.evaluate(HUELLA);
          const ok2 = desp!==desp2;
          console.log(`  ${ok2?"ok   ":"INERTE"} [${titulo}] segundo continente «Europa»`);
          if(!ok2) fallos.push(`${ruta} · ${titulo} · abrir un segundo continente no cambia el dibujo`);
        }
        await sel0.selectOption({label:"País"});
        await pg.waitForTimeout(700);
      }
    }
  }
}
for(const e of errs.slice(0,5)) fallos.push("error en consola: "+e.slice(0,120));
console.log("\n"+"=".repeat(60));
if(fallos.length){ console.log(`FALLOS (${fallos.length}):`); for(const f of fallos) console.log("  - "+f); process.exit(1); }
console.log("Todos los filtros cambian el dibujo.");
await b.close(); srv.close();
