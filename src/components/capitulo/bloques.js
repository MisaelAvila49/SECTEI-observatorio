// src/components/capitulo/bloques.js
// El cuerpo del capítulo como bloques normales del libro: cada bloque lleva su
// título, su texto con las cifras, la lectura del lector si eligió entidad y
// una gráfica fija debajo. Sin gráfica pegajosa ni pasos: la gráfica de cada
// bloque es la escena en su estado final (components/capitulo/escena.js).

import {Escena} from "./escena.js";
import {pasos as definirPasos} from "./textos.js";

export function bloques({H, geoEnt, geoAlc, alcNombre, entNombre, lector}) {
  const PASOS = definirPasos(H, alcNombre);
  const raiz = document.createElement("div");
  raiz.className = "capitulo-bloques";
  const subsDe = (def) => (typeof def.subs === "function" ? def.subs(lector.info()) : def.subs);
  // Estado que muestra la gráfica de cada bloque: la última edición en el de
  // las ediciones; la entidad del lector (o la primera) en el de los arcos.
  const subDe = (def) => {
    const subs = subsDe(def);
    if (def.id === "b") return subs.at(-1);
    if (def.id === "c") return lector.ent && subs.includes(lector.ent) ? lector.ent : subs[0];
    return null;
  };
  const figuras = [];

  for (const def of PASOS) {
    const sec = document.createElement("section");
    sec.className = "bloque-capitulo";
    sec.setAttribute("aria-labelledby", `bloque-${def.id}`);
    sec.innerHTML = `
      ${def.cifra ? `<p class="bloque-cifra"><span class="bloque-cifra-num">${def.cifra}</span> <span class="bloque-cifra-texto">${def.cifraTexto}</span></p>` : ""}
      <h2 id="bloque-${def.id}">${def.titulo}</h2>
      <div class="bloque-texto"></div>
      <p class="bloque-lectura" hidden></p>
      <p class="bloque-lector" hidden></p>
      <figure class="bloque-figura">
        <div class="bloque-lienzo"></div>
        <figcaption>${def.fuente}</figcaption>
      </figure>
      <p class="aviso-lector bloque-alt"></p>`;
    const esc = new Escena({H, geoEnt, geoAlc, alcNombre, entNombre});
    esc.raiz.classList.add("escena-estatica");
    sec.querySelector(".bloque-lienzo").append(esc.raiz);
    figuras.push({sec, def, esc});
    raiz.append(sec);
  }

  function escribir({sec, def}) {
    const L = lector.info();
    sec.querySelector(".bloque-texto").innerHTML = def.cuerpo().map((p) => `<p>${p}</p>`).join("");
    const lec = sec.querySelector(".bloque-lectura");
    if (def.lectura) {
      lec.hidden = false;
      // El bloque de las ediciones da la cifra de todas; los demás, la de su gráfica.
      lec.innerHTML = def.id === "b" ? subsDe(def).map((s) => def.lectura(s, L)).join("<br>") : def.lectura(subDe(def), L);
    }
    const pl = sec.querySelector(".bloque-lector");
    pl.hidden = !L;
    pl.textContent = L ? def.lector(L) : "";
    sec.querySelector(".bloque-alt").textContent = `Lo que muestra la gráfica: ${def.alt()}`;
  }

  function medir() {
    for (const {def, esc} of figuras) {
      const w = esc.raiz.clientWidth;
      if (!w) continue;
      const h = Math.round(Math.min(560, Math.max(300, w * (def.id === "e" ? 0.62 : 0.58))));
      esc.raiz.style.height = `${h}px`;
      esc.medir(w, h, {x0: 8, y0: 40, x1: w - 8, y1: h - 46});
      esc.ir({paso: def.id, sub: subDe(def), entidad: lector.ent}, false, true);
    }
  }

  figuras.forEach(escribir);
  lector.alCambiar(() => { figuras.forEach(escribir); medir(); });
  let anchoPrevio = 0;
  new ResizeObserver(() => {
    const w = raiz.clientWidth;
    if (Math.abs(w - anchoPrevio) > 2) { anchoPrevio = w; medir(); }
  }).observe(raiz);
  return raiz;
}
