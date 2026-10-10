// src/components/capitulo/personaliza.js
// La entidad del lector: se elige una vez, se guarda en la URL (?entidad=21)
// y la leen los bloques del capitulo y la seccion de exploracion.

import {leerURL, escribirURL, entero} from "./base.js";

export function crearLector(H, entidades) {
  const validas = new Set(entidades.map(([e]) => e));
  const desdeURL = leerURL().get("entidad");
  const inicial = desdeURL ? `0${desdeURL.padStart(2, "0")}` : null;
  const oyentes = new Set();
  const lector = {
    ent: inicial && validas.has(inicial) ? inicial : null,
    info: () => (lector.ent ? H.entidad(lector.ent) : null),
    alCambiar: (fn) => oyentes.add(fn),
    fijar(ent) {
      lector.ent = ent && validas.has(ent) ? ent : null;
      escribirURL({entidad: lector.ent ? lector.ent.slice(1) : null});
      oyentes.forEach((fn) => fn(lector.ent));
    }
  };
  return lector;
}

export function personaliza({lector, entidades}) {
  const sec = document.createElement("section");
  sec.className = "personaliza";
  sec.setAttribute("aria-labelledby", "personaliza-titulo");
  sec.innerHTML = `
    <h2 id="personaliza-titulo" class="personaliza-titulo"><label for="sel-entidad">¿De qué entidad es tu familia o de dónde vienes?</label></h2>
    <p class="personaliza-nota">Si eliges una, el capítulo la resaltará en cada gráfica y te dará sus cifras. La elección solo vive en la dirección de esta página.</p>
    <div class="personaliza-campo">
      <select id="sel-entidad">
        <option value="">Prefiero no elegir</option>
        ${entidades.map(([e, n]) => `<option value="${e}">${n}</option>`).join("")}
      </select>
    </div>
    <p class="personaliza-confirmacion" role="status" aria-live="polite"></p>`;
  const sel = sec.querySelector("select");
  const conf = sec.querySelector(".personaliza-confirmacion");
  sel.value = lector.ent ?? "";
  const confirmar = () => {
    const L = lector.info();
    conf.textContent = !L ? "" : L.num
      ? `Listo: el capítulo resalta ${L.nombre}, con ${entero(L.num)} hablantes nacidos ahí que viven en la ciudad.`
      : `Listo: el capítulo resalta ${L.nombre}. La muestra de 2025 no registró hablantes nacidos ahí que vivan en la ciudad.`;
  };
  sel.addEventListener("change", () => { lector.fijar(sel.value || null); confirmar(); });
  if (lector.ent) {
    // Al llegar con ?entidad= en la URL, se confirma sin anunciar.
    const L = lector.info();
    conf.textContent = L ? `El capítulo resalta ${L.nombre}.` : "";
  }
  return sec;
}
