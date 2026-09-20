// src/components/navegacion.js
// Conecta páginas por tema, a diferencia del paginador que sigue el orden del
// menú.

import {html} from "npm:htl";

// Bloque de enlaces relacionados al cierre de una página. Cada entrada es
// {ruta, titulo, nota}; la ruta ya viene relativa a la página que la muestra.
export function verTambien(enlaces) {
  if (!enlaces?.length) return document.createDocumentFragment();
  return html`<nav class="ver-tambien" aria-label="Ver también">
    <h2 class="ver-tambien-titulo">Ver también</h2>
    <ul class="ver-tambien-lista">
      ${enlaces.map((e) => html`<li><a href="${e.ruta}">${e.titulo}</a><span class="ver-tambien-nota">${e.nota}</span></li>`)}
    </ul>
  </nav>`;
}
