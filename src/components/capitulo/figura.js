// src/components/capitulo/figura.js
// Anatomía de una figura: cifra principal, título, subtítulo con la leyenda
// integrada, gráfica, pie de una frase y descarga. Debajo, los tres
// desplegables (fuentes, explicación, datos), idénticos cerrados.

import {html} from "npm:htl";
import {conDescarga} from "./descargar.js";

// Muestra de color para la leyenda dentro del subtítulo.
export const muestra = (color, texto) =>
  html`<span class="leyenda-item"><span class="muestra" style=${`background:${color}`} aria-hidden="true"></span>${texto}</span>`;

export function figura({cifra, cifraTexto, titulo, subtitulo, grafica, pie}) {
  return conDescarga(html`<figure class="grafica">
    ${cifra ? html`<div class="cifra"><span class="cifra-valor">${cifra}</span><p class="cifra-texto">${cifraTexto}</p></div>` : ""}
    <h3>${titulo}</h3>
    ${subtitulo ? html`<p class="grafica-sub">${subtitulo}</p>` : ""}
    <div class="grafica-lienzo">${grafica}</div>
    <figcaption>${pie}</figcaption>
  </figure>`);
}

// fuentes: {datos: [{texto, url}], cotejos: [{texto, oficial, calculado, tolerancia}], pendiente}
export function fuentesBloque({datos, cotejos = [], pendiente}) {
  return html`<details>
    <summary>Fuentes y verificación</summary>
    <div>
      <p><strong>Datos.</strong></p>
      <ul>${datos.map((d) => html`<li><a href=${d.url}>${d.texto}</a></li>`)}</ul>
      ${cotejos.length ? html`<p><strong>Cotejo con la cifra publicada.</strong></p>
      <ul>${cotejos.map((c) => {
        const ok = Math.abs(c.oficial - c.calculado) <= c.tolerancia;
        return html`<li>${c.texto}: publicado ${c.formato(c.oficial)}, en esta gráfica ${c.formato(c.calculado)}.
          <span class=${ok ? "cotejo-ok" : "cotejo-pendiente"}>${ok ? "Coincide." : "No coincide: revisar."}</span></li>`;
      })}</ul>` : ""}
      ${pendiente ? html`<p><span class="cotejo-pendiente">Verificación pendiente.</span> ${pendiente}</p>` : ""}
    </div>
  </details>`;
}

export function explicacion(texto) {
  return html`<details><summary>¿Qué quiere decir este análisis?</summary><div><p>${texto}</p></div></details>`;
}

// columnas: [{etiqueta, valor: (fila) => texto, num}]
export function tablaDatos(filas, columnas) {
  return html`<details><summary>Ver los datos (${filas.length} filas)</summary>
    <div class="cap-tabla"><table>
      <thead><tr>${columnas.map((c) => html`<th scope="col" class=${c.num ? "num" : ""}>${c.etiqueta}</th>`)}</tr></thead>
      <tbody>${filas.map((f) => html`<tr>${columnas.map((c) => html`<td class=${c.num ? "num" : ""}>${c.valor(f)}</td>`)}</tr>`)}</tbody>
    </table></div>
  </details>`;
}

export function desplegables(...hijos) {
  return html`<div class="desplegables">${hijos}</div>`;
}
