// src/components/fuentes.js
// El pie "Verificado con fuente" que lleva cada gráfica del tablero.
//
// Cada análisis publica de dónde sale y contra qué se comprobó, con enlace:
// las referencias del Atlas PISA 2026 (src/data/fuentes.csv, 115 entradas) y
// las comprobaciones concretas de la batería de verificación. No es adorno:
// es la parte del tablero que permite a quien lee llegar al documento donde
// la OCDE publicó la cifra, o al estudio que motivó el análisis.
//
// Dos niveles, y se distinguen a propósito:
//   - "Fuente": de dónde salen los datos que se dibujan (la base de la OCDE).
//   - "Verificado": contra qué cifra INDEPENDIENTE se cotejó y con qué
//     resultado. Solo se escribe cuando la comprobación se hizo de verdad; una
//     resultado. Cuando no hay una tabla oficial con el mismo recorte, la
//     línea dice dónde publica la OCDE lo más cercano, para que quien lee
//     pueda ir a consultarlo.

import {html} from "npm:htl";

// Índice de fuentes por id, construido una vez por página.
export function catalogo(filasFuentes) {
  const porId = new Map(filasFuentes.map((f) => [f.id, f]));
  return {
    get: (id) => porId.get(id),
    // Devuelve las fuentes de una lista de ids, en el orden dado, ignorando las
    // que no existan (y avisando en consola: un id mal escrito no debe romper
    // la página, pero tampoco pasar desapercibido).
    varias: (ids) => ids.map((id) => {
      const f = porId.get(id);
      if (!f) console.warn(`fuentes.csv no tiene la referencia ${id}`);
      return f;
    }).filter(Boolean),
  };
}

// Cita corta de una fuente: institución o primer autor, título recortado, año.
function citaCorta(f) {
  const autor = (f.autores || "").split(";")[0].trim();
  const titulo = f.titulo.length > 72 ? f.titulo.slice(0, 70).trimEnd() + "…" : f.titulo;
  const anio = f.anio ? ` (${f.anio})` : "";
  return `${autor ? autor + ", " : ""}${titulo}${anio}`;
}

// Bloque de pie. `fuentes` es el catálogo; `datos` los ids de donde salen las
// cifras; `verificado` los ids contra los que se cotejó; `resultado` la frase
// con el desenlace de la comprobación (se escribe a mano por gráfica, porque
// solo quien la construyó sabe qué se comparó).
export function verificado(fuentes, {
  datos = [], verificadoCon = [], resultado = "", lectura = [],
  // Cuando no hay tabla oficial con el mismo recorte, `referencia` nombra la
  // más cercana que sí publica la OCDE. Sin ella la línea decía solo que no
  // existe, que es un callejón sin salida para quien quiere comprobar; con
  // ella queda a un clic la tabla contra la que se puede contrastar.
  referencia = [],
} = {}) {
  const fd = fuentes.varias(datos);
  const fv = fuentes.varias(verificadoCon);
  const fl = fuentes.varias(lectura);
  const fr = fuentes.varias(referencia);

  const enlace = (f) => html`<a href="${f.url}" target="_blank" rel="noopener"
    title="${f.titulo}${f.cautela ? "; " + f.cautela : ""}">${citaCorta(f)}</a>`;
  const lista = (fs) => fs.flatMap((f, i) => (i ? ["; ", enlace(f)] : [enlace(f)]));

  // Rejilla de dos columnas: el rótulo en la primera y el contenido en la
  // segunda. Con el rótulo en línea, el texto largo envolvía POR DEBAJO de él
  // y las tres entradas se leían como un solo párrafo corrido. La cita y la
  // frase del resultado van en renglones distintos por la misma razón: son
  // dos cosas, una lista de referencias y una explicación.
  const fila = (clase, rotulo, contenido) => html`<div class="verificado-fila ${clase}">
    <span class="verificado-etiqueta">${rotulo}</span>
    <div class="verificado-cuerpo">${contenido}</div>
  </div>`;

  // Colapsable, como el desplegable de explicación y la tabla de respaldo: es
  // la procedencia del dato, que se consulta cuando hace falta y no compite
  // con la gráfica el resto del tiempo. El resumen adelanta si la cifra tiene
  // comprobación externa, para no obligar a abrirlo solo para saberlo.
  return html`<details class="verificado">
    <summary>Fuentes y verificación</summary>
    ${fd.length ? fila("", "Fuente de los datos", lista(fd)) : ""}
    ${fv.length
      ? fila("verificado-ok", "Verificado con fuente", [
          html`<p class="verificado-citas">${lista(fv)}</p>`,
          resultado ? html`<p class="verificado-resultado">${resultado}</p>` : "",
        ])
      : fila("verificado-pendiente", "Verificación", [
          html`<p class="verificado-resultado">${resultado || "la OCDE no publica una tabla con este mismo recorte."}</p>`,
          fr.length ? html`<p class="verificado-citas">Referencia más cercana: ${lista(fr)}</p>` : "",
        ])}
    ${fl.length ? fila("", "Para leer más", lista(fl)) : ""}
  </details>`;
}
