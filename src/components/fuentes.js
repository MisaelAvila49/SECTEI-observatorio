// src/components/fuentes.js
// El pie "Fuentes y verificación" que lleva cada gráfica del tablero y del libro.
//
// Cada análisis publica de dónde sale y contra qué se comprobó, con enlace:
// las referencias de src/data/fuentes.csv y las comprobaciones concretas de
// la batería de verificación (verificaciones.csv contra calculado.csv). No es
// adorno: es la parte que permite a quien lee llegar al documento donde el
// INEGI, el INALI, el CONEVAL o el INPI publicó la cifra.
//
// Dos niveles, y se distinguen a propósito:
//   - "Fuente": de dónde salen los datos que se dibujan.
//   - "Verificado": contra qué cifra INDEPENDIENTE se cotejó y con qué
//     resultado. Solo se escribe cuando la comprobación se hizo de verdad.
//     Cuando no hay una tabla oficial con el mismo recorte, la línea dice
//     dónde se publica lo más cercano, para que quien lee pueda consultarlo.

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
  // más cercana que sí se publica. Sin ella la línea decía solo que no
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
          resultado ? html`<div class="verificado-resultado">${resultado}</div>` : "",
        ])
      : fila("verificado-pendiente", "Verificación", [
          html`<div class="verificado-resultado">${resultado || "No hay una tabla oficial con este mismo recorte."}</div>`,
          fr.length ? html`<p class="verificado-citas">Referencia más cercana: ${lista(fr)}</p>` : "",
        ])}
    ${fl.length ? fila("", "Para leer más", lista(fl)) : ""}
  </details>`;
}

// --- Procedencia armada desde la batería de verificación --------------------
// `procedencia({fuentes, verificaciones, calculado})` devuelve una función que
// cada sección llama con los ids de sus datos y las claves de sus cotejos:
//
//   bloque({datos: ["D-ITER-2020"], cotejos: ["cdmx_hli5_2020_n"], lectura: [...]})
//
// El resultado no se escribe a mano: cada cotejo sale como un renglón con la
// cifra publicada, la calculada aquí y si coinciden dentro de la tolerancia
// que fija verificaciones.csv. Así el texto no puede quedarse atrás cuando
// cambia un cargador: `npm run verificar` y la página leen los mismos archivos.
const fmtCifra = (v, unidad) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "sin dato";
  if (/^%/.test(unidad)) return `${n.toLocaleString("es-MX", {maximumFractionDigits: 2})} %`;
  return Math.round(n).toLocaleString("es-MX").replace(/,/g, " ");
};

export function procedencia({fuentes, verificaciones, calculado}) {
  const cat = catalogo(fuentes);
  const calc = new Map(calculado.map((c) => [`${c.encuesta}|${c.clave}`, Number(c.valor)]));
  const ver = new Map(verificaciones.map((v) => [v.clave, v]));
  const bloque = function ({datos = [], cotejos = [], lectura = [], referencia = [], nota = ""} = {}) {
    const filas = cotejos.map((k) => {
      const v = ver.get(k);
      if (!v) console.warn(`verificaciones.csv no tiene el cotejo ${k}`);
      return v;
    }).filter(Boolean);
    const conCifra = filas.filter((v) => v.estado !== "pendiente" && v.valor_oficial !== "");
    const renglon = (v) => {
      const propio = calc.get(`${v.encuesta}|${v.clave}`);
      const dif = propio == null ? null : Math.abs(propio - Number(v.valor_oficial));
      const oficial = Math.abs(Number(v.valor_oficial)) || 1;
      const dentro = dif != null && dif <= Number(v.tolerancia);
      // "Coincide" solo cuando la diferencia es menor a medio por ciento de la
      // cifra: una lengua que la muestra sobreestima 14 % está dentro de la
      // tolerancia fijada, pero decir que coincide sería falso.
      const estado = v.estado === "referencia" ? "no es el mismo recorte"
        : !dentro ? "fuera de la tolerancia"
        : dif / oficial < 0.005 ? "coincide"
        : `difiere ${(100 * dif / oficial).toFixed(1)} %, dentro del margen aceptado`;
      return html`<li><span class="cotejo-que">${v.unidad} (${v.anio})</span>: publicada ${fmtCifra(v.valor_oficial, v.unidad)}; calculada aquí ${propio == null ? "sin dato" : fmtCifra(propio, v.unidad)} · <strong>${estado}</strong>${v.estado === "referencia" ? html`. <span class="cotejo-nota">${v.nota}</span>` : ""}</li>`;
    };
    const resultado = conCifra.length
      ? html`<ul class="verificado-cotejos">${conCifra.map(renglon)}</ul>${nota ? html`<p>${nota}</p>` : ""}`
      : nota;
    const verificadoCon = [...new Set(conCifra.map((v) => v.fuente_id))];
    return verificado(cat, {datos, verificadoCon, resultado, lectura, referencia});
  };
  // Cifra calculada por los cargadores, para citarla en una nota cuando la
  // comparación es con una referencia y no con la misma cifra publicada.
  bloque.valor = (encuesta, clave) => calc.get(`${encuesta}|${clave}`) ?? null;
  return bloque;
}
